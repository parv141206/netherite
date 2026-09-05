"use client";

import { useEffect, useMemo, useState } from "react";

import type { ExcalidrawElement } from "@excalidraw/element/types";
import type {
  AppState,
  ExcalidrawImperativeAPI,
} from "@excalidraw/excalidraw/types";

import {
  findSelectedEngineeringNode,
  getEngineeringNodes,
  refreshInheritanceRelations,
  removeEngineeringNode,
  replaceEngineeringNode,
} from "./diagram-factory";
import styles from "./engineering-sidebar.module.scss";

import type { EngineeringNode, UmlClassModel } from "./types";

function EditableText({
  value,
  onCommit,
  ariaLabel,
}: {
  value: string;
  onCommit: (nextValue: string) => void;
  ariaLabel: string;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);

  const commit = () => {
    const nextValue = draft.trim();
    if (nextValue && nextValue !== value) onCommit(nextValue);
    else setDraft(value);
  };

  return (
    <input
      className={styles.inspectorInput}
      value={draft}
      aria-label={ariaLabel}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
        if (event.key === "Escape") {
          setDraft(value);
          event.currentTarget.blur();
        }
      }}
    />
  );
}

function MemberEditor({
  title,
  values,
  defaultValue,
  onChange,
}: {
  title: string;
  values: string[];
  defaultValue: string;
  onChange: (values: string[]) => void;
}) {
  const singularTitle =
    title === "Responsibilities"
      ? "responsibility"
      : title.toLowerCase().replace(/s$/, "");

  return (
    <section className={styles.memberEditor}>
      <header>
        <span>{title}</span>
        <button
          type="button"
          onClick={() => onChange([...values, defaultValue])}
        >
          + Add
        </button>
      </header>
      <div className={styles.memberScroller}>
        {values.length ? (
          values.map((value, index) => (
            <div className={styles.memberRow} key={`${title}-${index}`}>
              <EditableText
                value={value}
                ariaLabel={`${title} ${index + 1}`}
                onCommit={(nextValue) =>
                  onChange(
                    values.map((current, currentIndex) =>
                      currentIndex === index ? nextValue : current,
                    ),
                  )
                }
              />
              <button
                type="button"
                className={styles.removeMember}
                aria-label={`Remove ${value}`}
                onClick={() =>
                  onChange(
                    values.filter((_, currentIndex) => currentIndex !== index),
                  )
                }
              >
                ×
              </button>
            </div>
          ))
        ) : (
          <button
            type="button"
            className={styles.emptyMember}
            onClick={() => onChange([defaultValue])}
          >
            + Add first {singularTitle}
          </button>
        )}
      </div>
    </section>
  );
}

function UmlInspector({
  api,
  node,
  classes,
}: {
  api: ExcalidrawImperativeAPI;
  node: EngineeringNode;
  classes: EngineeringNode[];
}) {
  const model = node.meta.classModel;
  if (!model) return null;
  const responsibilities = model.responsibilities ?? [];
  const update = (updates: Partial<UmlClassModel>) => {
    const nextModel = { ...model, ...updates };
    replaceEngineeringNode({
      api,
      node,
      label: nextModel.name,
      classModel: nextModel,
    });
  };

  return (
    <>
      <div className={styles.identityFields}>
        <label>
          <span>Name</span>
          <EditableText
            value={model.name}
            ariaLabel="Class name"
            onCommit={(name) => update({ name })}
          />
        </label>
        <label>
          <span>Type</span>
          <select
            value={model.stereotype}
            onChange={(event) =>
              update({
                stereotype: event.target.value as UmlClassModel["stereotype"],
              })
            }
          >
            <option value="class">Class</option>
            <option value="abstract">Abstract</option>
            <option value="interface">Interface</option>
          </select>
        </label>
        <label>
          <span>Extends</span>
          <select
            value={model.parentId ?? ""}
            onChange={(event) =>
              update({ parentId: event.target.value || null })
            }
          >
            <option value="">None</option>
            {classes
              .filter((candidate) => candidate.meta.nodeId !== node.meta.nodeId)
              .map((candidate) => (
                <option
                  key={candidate.meta.nodeId}
                  value={candidate.meta.nodeId}
                >
                  {candidate.meta.label}
                </option>
              ))}
          </select>
        </label>
      </div>
      <MemberEditor
        title="Attributes"
        values={model.fields}
        defaultValue={`- field${model.fields.length + 1}: string`}
        onChange={(fields) => update({ fields })}
      />
      <MemberEditor
        title="Operations"
        values={model.methods}
        defaultValue={`+ method${model.methods.length + 1}(): void`}
        onChange={(methods) => update({ methods })}
      />
      <MemberEditor
        title="Responsibilities"
        values={responsibilities}
        defaultValue="-- describe responsibility"
        onChange={(responsibilities) => update({ responsibilities })}
      />
    </>
  );
}

export function EngineeringBottomPanel({
  api,
  elements,
  appState,
}: {
  api: ExcalidrawImperativeAPI | null;
  elements: readonly ExcalidrawElement[];
  appState: AppState | null;
}) {
  const nodes = useMemo(() => getEngineeringNodes(elements), [elements]);
  const classes = useMemo(
    () => nodes.filter((node) => node.meta.classModel),
    [nodes],
  );
  const selectedNode = useMemo(
    () =>
      appState ? findSelectedEngineeringNode(nodes, elements, appState) : null,
    [appState, elements, nodes],
  );

  if (!api || !selectedNode) return null;

  return (
    <aside
      className={`${styles.bottomInspector} ${
        selectedNode.meta.classModel
          ? styles.umlInspector
          : styles.simpleInspector
      }`}
      aria-label="Engineering object settings"
    >
      <div className={styles.inspectorTitle}>
        <span className={styles.objectType}>{selectedNode.meta.category}</span>
        <strong>{selectedNode.meta.label}</strong>
        <div className={styles.inspectorActions}>
          {selectedNode.meta.classModel ? (
            <button
              type="button"
              onClick={() => refreshInheritanceRelations(api)}
              title="Refresh inheritance connectors"
            >
              Refresh links
            </button>
          ) : null}
          <button
            type="button"
            className={styles.deleteButton}
            onClick={() => removeEngineeringNode(api, selectedNode)}
          >
            Delete
          </button>
        </div>
      </div>

      <div
        className={`${styles.inspectorContent} ${
          selectedNode.meta.classModel ? "" : styles.simpleContent
        }`}
      >
        {selectedNode.meta.classModel ? (
          <UmlInspector api={api} node={selectedNode} classes={classes} />
        ) : (
          <label className={styles.simpleLabel}>
            <span>Label</span>
            <EditableText
              value={selectedNode.meta.label}
              ariaLabel="Object label"
              onCommit={(label) =>
                replaceEngineeringNode({ api, node: selectedNode, label })
              }
            />
          </label>
        )}
      </div>
    </aside>
  );
}
