"use client";

import { useMemo, useRef, useState } from "react";

import { Sidebar } from "@excalidraw/excalidraw";

import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

import { ENGINEERING_CATEGORIES, ENGINEERING_SYMBOLS } from "./catalog";
import { insertEngineeringNode } from "./diagram-factory";
import styles from "./engineering-sidebar.module.scss";
import { SymbolPreview } from "./symbol-preview";

import type { EngineeringSymbolDefinition } from "./types";

export const ENGINEERING_SIDEBAR_NAME = "engineering";
export const ENGINEERING_PALETTE_TAB = "engineering-palette";

const ToolboxIcon = () => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    width="18"
    height="18"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4 7.5h16v11H4z" />
    <path d="M8.5 7.5V5.2h7v2.3M4 12h16M10 12v2h4v-2" />
  </svg>
);

export const EngineeringSidebarTrigger = () => (
  <Sidebar.Trigger
    name={ENGINEERING_SIDEBAR_NAME}
    tab={ENGINEERING_PALETTE_TAB}
    title="Engineering components"
    icon={<ToolboxIcon />}
    className={styles.trigger}
  />
);

function SymbolCard({
  definition,
  onInsert,
}: {
  definition: EngineeringSymbolDefinition;
  onInsert: (definition: EngineeringSymbolDefinition) => void;
}) {
  return (
    <button
      type="button"
      className={styles.symbolCard}
      onClick={() => onInsert(definition)}
      title={`Insert ${definition.label}`}
    >
      <span className={styles.preview}>
        <SymbolPreview definition={definition} />
      </span>
      <span className={styles.symbolCopy}>
        <strong>{definition.label}</strong>
        <small>{definition.description}</small>
      </span>
      {definition.smart ? <span className={styles.smartDot}>Smart</span> : null}
    </button>
  );
}

export function EngineeringSidebar({
  api,
  docked,
  onDock,
}: {
  api: ExcalidrawImperativeAPI | null;
  docked: boolean;
  onDock: (docked: boolean) => void;
}) {
  const [query, setQuery] = useState("");
  const insertionCount = useRef(0);
  const normalizedQuery = query.trim().toLowerCase();
  const visibleSymbols = useMemo(
    () =>
      ENGINEERING_SYMBOLS.filter(
        (definition) =>
          !normalizedQuery ||
          `${definition.label} ${definition.description}`
            .toLowerCase()
            .includes(normalizedQuery),
      ),
    [normalizedQuery],
  );

  const insert = (definition: EngineeringSymbolDefinition) => {
    if (!api) return;
    insertionCount.current += 1;
    insertEngineeringNode(api, definition, insertionCount.current);
  };

  return (
    <Sidebar
      name={ENGINEERING_SIDEBAR_NAME}
      className={styles.sidebar}
      docked={docked}
      onDock={onDock}
    >
      <Sidebar.Tabs>
        <Sidebar.Header className={styles.header}>
          <div className={styles.headerTitle}>
            <span className={styles.headerIcon}>
              <ToolboxIcon />
            </span>
            <span>
              <strong>Components</strong>
              <small>Engineering notation</small>
            </span>
          </div>
          <div className={styles.hiddenTriggers}>
            <Sidebar.TabTriggers>
              <Sidebar.TabTrigger
                tab={ENGINEERING_PALETTE_TAB}
                title="Components"
              >
                Components
              </Sidebar.TabTrigger>
            </Sidebar.TabTriggers>
          </div>
        </Sidebar.Header>

        <Sidebar.Tab tab={ENGINEERING_PALETTE_TAB} className={styles.tabPanel}>
          <label className={styles.searchWrap}>
            <svg aria-hidden="true" viewBox="0 0 20 20">
              <circle cx="8.5" cy="8.5" r="5.5" />
              <path d="m13 13 4 4" />
            </svg>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search components"
              aria-label="Search engineering components"
            />
          </label>

          <div className={styles.scrollArea}>
            {ENGINEERING_CATEGORIES.map((category) => {
              const definitions = visibleSymbols.filter(
                (definition) => definition.category === category.id,
              );
              if (!definitions.length) return null;
              return (
                <section className={styles.category} key={category.id}>
                  <div className={styles.categoryHeading}>
                    <div>
                      <h3>{category.label}</h3>
                      <p>{category.description}</p>
                    </div>
                    <span>{definitions.length}</span>
                  </div>
                  <div className={styles.symbolGrid}>
                    {definitions.map((definition) => (
                      <SymbolCard
                        key={definition.id}
                        definition={definition}
                        onInsert={insert}
                      />
                    ))}
                  </div>
                </section>
              );
            })}
            {!visibleSymbols.length ? (
              <div className={styles.emptySearch}>No matching components.</div>
            ) : null}
          </div>
        </Sidebar.Tab>
      </Sidebar.Tabs>
    </Sidebar>
  );
}
