import {
  CaptureUpdateAction,
  FONT_FAMILY,
  ROUNDNESS,
  convertToExcalidrawElements,
  viewportCoordsToSceneCoords,
} from "@excalidraw/excalidraw";
import { randomId } from "@excalidraw/common";
import { pointFrom } from "@excalidraw/math";

import type { ExcalidrawElementSkeleton } from "@excalidraw/element";
import type { ExcalidrawElement } from "@excalidraw/element/types";
import type {
  ExcalidrawImperativeAPI,
  UIAppState,
} from "@excalidraw/excalidraw/types";

import { DIAGRAM_PALETTE, getSymbolDefinition } from "./catalog";
import {
  getEngineeringMeta,
  type EngineeringElementMeta,
  type EngineeringNode,
  type EngineeringSymbolDefinition,
  type UmlClassModel,
} from "./types";

type ScenePosition = { x: number; y: number };
type LocalPoint = readonly [number, number];

const STROKE = DIAGRAM_PALETTE.graphite;
const UML_WIDTH = 310;
const UML_HEADER_HEIGHT = 58;
const UML_ROW_HEIGHT = 25;

export const createDefaultClassModel = (
  definition: EngineeringSymbolDefinition,
): UmlClassModel => ({
  name: definition.id === "uml-interface" ? "PaymentGateway" : "OrderService",
  stereotype: definition.id === "uml-interface" ? "interface" : "class",
  fields: [],
  methods: [],
  responsibilities: [],
  parentId: null,
});

const createMeta = (
  definition: EngineeringSymbolDefinition,
  nodeId: string,
  label: string,
  role: EngineeringElementMeta["role"],
  classModel?: UmlClassModel,
): EngineeringElementMeta => ({
  schemaVersion: 1,
  nodeId,
  definitionId: definition.id,
  category: definition.category,
  label,
  role,
  classModel,
});

const componentProps = (
  groupId: string,
  meta: EngineeringElementMeta,
): Pick<ExcalidrawElement, "groupIds" | "customData"> => ({
  groupIds: [groupId],
  customData: { engineering: meta },
});

const line = ({
  x,
  y,
  points,
  groupId,
  meta,
  fill = "transparent",
  stroke = STROKE,
  style = "solid",
}: {
  x: number;
  y: number;
  points: readonly LocalPoint[];
  groupId: string;
  meta: EngineeringElementMeta;
  fill?: string;
  stroke?: string;
  style?: "solid" | "dashed" | "dotted";
}): ExcalidrawElementSkeleton => ({
  type: "line",
  x,
  y,
  points: points.map(([pointX, pointY]) => pointFrom(pointX, pointY)),
  strokeColor: stroke,
  backgroundColor: fill,
  fillStyle: "solid",
  strokeWidth: 2,
  strokeStyle: style,
  roughness: 0,
  ...componentProps(groupId, meta),
});

const text = ({
  x,
  y,
  value,
  groupId,
  meta,
  size = 17,
  family = FONT_FAMILY.Excalifont,
  align = "left",
  color = STROKE,
  width,
}: {
  x: number;
  y: number;
  value: string;
  groupId: string;
  meta: EngineeringElementMeta;
  size?: number;
  family?: (typeof FONT_FAMILY)[keyof typeof FONT_FAMILY];
  align?: "left" | "center" | "right";
  color?: string;
  width?: number;
}): ExcalidrawElementSkeleton => ({
  type: "text",
  x,
  y,
  text: value,
  fontSize: size,
  fontFamily: family,
  textAlign: align,
  verticalAlign: "top",
  strokeColor: color,
  ...(width ? { width } : {}),
  ...componentProps(groupId, meta),
});

const rectangle = ({
  x,
  y,
  width,
  height,
  groupId,
  meta,
  fill,
  label,
  rounded = false,
  stroke = STROKE,
  labelColor = STROKE,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  groupId: string;
  meta: EngineeringElementMeta;
  fill: string;
  label?: string;
  rounded?: boolean;
  stroke?: string;
  labelColor?: string;
}): ExcalidrawElementSkeleton => ({
  type: "rectangle",
  x,
  y,
  width,
  height,
  strokeColor: stroke,
  backgroundColor: fill,
  fillStyle: "solid",
  strokeWidth: 2,
  roughness: 0,
  roundness: rounded ? { type: ROUNDNESS.ADAPTIVE_RADIUS } : null,
  ...(label
    ? {
        label: {
          text: label,
          fontFamily: FONT_FAMILY.Excalifont,
          fontSize: 18,
          textAlign: "center",
          verticalAlign: "middle",
          strokeColor: labelColor,
        },
      }
    : {}),
  ...componentProps(groupId, meta),
});

const ellipse = ({
  x,
  y,
  width,
  height,
  groupId,
  meta,
  fill,
  label,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  groupId: string;
  meta: EngineeringElementMeta;
  fill: string;
  label?: string;
}): ExcalidrawElementSkeleton => ({
  type: "ellipse",
  x,
  y,
  width,
  height,
  strokeColor: STROKE,
  backgroundColor: fill,
  fillStyle: "solid",
  strokeWidth: 2,
  roughness: 0,
  ...(label
    ? {
        label: {
          text: label,
          fontFamily: FONT_FAMILY.Excalifont,
          fontSize: 18,
          textAlign: "center",
          verticalAlign: "middle",
        },
      }
    : {}),
  ...componentProps(groupId, meta),
});

const umlClassSkeleton = ({
  position,
  groupId,
  nodeMeta,
  partMeta,
  model,
  fill,
}: {
  position: ScenePosition;
  groupId: string;
  nodeMeta: EngineeringElementMeta;
  partMeta: EngineeringElementMeta;
  model: UmlClassModel;
  fill: string;
}): ExcalidrawElementSkeleton[] => {
  const responsibilities = model.responsibilities ?? [];
  const fieldsHeight = Math.max(model.fields.length, 1) * UML_ROW_HEIGHT + 20;
  const methodsHeight = Math.max(model.methods.length, 1) * UML_ROW_HEIGHT + 20;
  const responsibilitiesHeight = responsibilities.length
    ? responsibilities.length * UML_ROW_HEIGHT + 34
    : 0;
  const height =
    UML_HEADER_HEIGHT + fieldsHeight + methodsHeight + responsibilitiesHeight;
  const { x, y } = position;
  const fieldsY = y + UML_HEADER_HEIGHT;
  const methodsY = fieldsY + fieldsHeight;
  const responsibilitiesY = methodsY + methodsHeight;
  const stereotype =
    model.stereotype === "class" ? null : `«${model.stereotype}»`;
  const skeletons: ExcalidrawElementSkeleton[] = [
    rectangle({
      x,
      y,
      width: UML_WIDTH,
      height,
      groupId,
      meta: nodeMeta,
      fill,
    }),
    line({
      x,
      y: fieldsY,
      points: [
        [0, 0],
        [UML_WIDTH, 0],
      ],
      groupId,
      meta: partMeta,
    }),
    line({
      x,
      y: methodsY,
      points: [
        [0, 0],
        [UML_WIDTH, 0],
      ],
      groupId,
      meta: partMeta,
    }),
  ];

  if (responsibilitiesHeight) {
    skeletons.push(
      line({
        x,
        y: responsibilitiesY,
        points: [
          [0, 0],
          [UML_WIDTH, 0],
        ],
        groupId,
        meta: partMeta,
      }),
    );
  }
  if (stereotype) {
    skeletons.push(
      text({
        x: x + UML_WIDTH / 2,
        y: y + 6,
        width: UML_WIDTH - 24,
        value: stereotype,
        groupId,
        meta: partMeta,
        size: 13,
        family: FONT_FAMILY.Cascadia,
        align: "center",
      }),
    );
  }
  skeletons.push(
    text({
      x: x + UML_WIDTH / 2,
      y: y + (stereotype ? 27 : 18),
      width: UML_WIDTH - 24,
      value: model.name,
      groupId,
      meta: partMeta,
      size: 17,
      family: FONT_FAMILY.Cascadia,
      align: "center",
    }),
    text({
      x: x + 14,
      y: fieldsY + 11,
      value: model.fields.length ? model.fields.join("\n") : "− no attributes",
      groupId,
      meta: partMeta,
      size: 15,
      family: FONT_FAMILY.Cascadia,
      color: model.fields.length ? STROKE : "#707e87",
    }),
    text({
      x: x + 14,
      y: methodsY + 11,
      value: model.methods.length
        ? model.methods.join("\n")
        : "− no operations",
      groupId,
      meta: partMeta,
      size: 15,
      family: FONT_FAMILY.Cascadia,
      color: model.methods.length ? STROKE : "#707e87",
    }),
  );
  if (responsibilitiesHeight) {
    skeletons.push(
      text({
        x: x + 14,
        y: responsibilitiesY + 8,
        value: "RESPONSIBILITIES",
        groupId,
        meta: partMeta,
        size: 11,
        family: FONT_FAMILY.Cascadia,
        color: "#707e87",
      }),
      text({
        x: x + 14,
        y: responsibilitiesY + 28,
        value: responsibilities.join("\n"),
        groupId,
        meta: partMeta,
        size: 14,
        family: FONT_FAMILY.Cascadia,
      }),
    );
  }
  return skeletons;
};

const standardSkeleton = ({
  definition,
  position,
  groupId,
  nodeMeta,
  partMeta,
  label,
}: {
  definition: EngineeringSymbolDefinition;
  position: ScenePosition;
  groupId: string;
  nodeMeta: EngineeringElementMeta;
  partMeta: EngineeringElementMeta;
  label: string;
}): ExcalidrawElementSkeleton[] => {
  const { x, y } = position;
  const polygonWithLabel = (
    points: readonly LocalPoint[],
    fill: string,
    labelCenterX: number,
    labelY: number,
    labelWidth: number,
  ) => [
    line({ x, y, points, groupId, meta: nodeMeta, fill }),
    text({
      x: x + labelCenterX,
      y: y + labelY,
      width: labelWidth,
      value: label,
      groupId,
      meta: partMeta,
      align: "center",
    }),
  ];
  switch (definition.id) {
    case "flow-decision":
      return polygonWithLabel(
        [
          [100, 0],
          [200, 65],
          [100, 130],
          [0, 65],
          [100, 0],
        ],
        definition.backgroundColor,
        100,
        52,
        130,
      );
    case "flow-io":
      return polygonWithLabel(
        [
          [30, 0],
          [210, 0],
          [180, 100],
          [0, 100],
          [30, 0],
        ],
        definition.backgroundColor,
        105,
        38,
        140,
      );
    case "flow-terminal":
      return [
        ellipse({
          x,
          y,
          width: 190,
          height: 82,
          groupId,
          meta: nodeMeta,
          fill: definition.backgroundColor,
          label,
        }),
      ];
    case "flow-connector":
      return [
        ellipse({
          x,
          y,
          width: 72,
          height: 72,
          groupId,
          meta: nodeMeta,
          fill: definition.backgroundColor,
          label: "A",
        }),
      ];
    case "function-database":
      return [
        rectangle({
          x,
          y: y + 18,
          width: 180,
          height: 100,
          groupId,
          meta: nodeMeta,
          fill: definition.backgroundColor,
        }),
        ellipse({
          x,
          y,
          width: 180,
          height: 38,
          groupId,
          meta: partMeta,
          fill: DIAGRAM_PALETTE.paper,
        }),
        line({
          x,
          y: y + 99,
          points: [
            [0, 0],
            [12, 13],
            [40, 20],
            [90, 23],
            [140, 20],
            [168, 13],
            [180, 0],
          ],
          groupId,
          meta: partMeta,
        }),
        text({
          x: x + 90,
          y: y + 55,
          width: 140,
          value: label,
          groupId,
          meta: partMeta,
          align: "center",
        }),
      ];
    case "function-component":
      return [
        rectangle({
          x: x + 20,
          y,
          width: 190,
          height: 110,
          groupId,
          meta: nodeMeta,
          fill: definition.backgroundColor,
          label,
        }),
        rectangle({
          x,
          y: y + 20,
          width: 42,
          height: 22,
          groupId,
          meta: partMeta,
          fill: DIAGRAM_PALETTE.paper,
        }),
        rectangle({
          x,
          y: y + 66,
          width: 42,
          height: 22,
          groupId,
          meta: partMeta,
          fill: DIAGRAM_PALETTE.paper,
        }),
      ];
    case "function-queue":
      return [
        rectangle({
          x,
          y,
          width: 210,
          height: 86,
          groupId,
          meta: nodeMeta,
          fill: definition.backgroundColor,
          label,
          rounded: true,
        }),
        line({
          x: x + 30,
          y: y + 18,
          points: [
            [0, 0],
            [150, 0],
          ],
          groupId,
          meta: partMeta,
        }),
        line({
          x: x + 30,
          y: y + 68,
          points: [
            [0, 0],
            [150, 0],
          ],
          groupId,
          meta: partMeta,
        }),
      ];
    case "function-api":
      return [
        rectangle({
          x,
          y,
          width: 210,
          height: 82,
          groupId,
          meta: nodeMeta,
          fill: definition.backgroundColor,
          label,
          rounded: true,
        }),
        text({
          x: x + 14,
          y: y + 10,
          value: "{ }",
          groupId,
          meta: partMeta,
          family: FONT_FAMILY.Cascadia,
          size: 14,
        }),
      ];
    case "dfd-entity":
      return [
        rectangle({
          x,
          y,
          width: 210,
          height: 112,
          groupId,
          meta: nodeMeta,
          fill: definition.backgroundColor,
          label,
        }),
        line({
          x: x + 18,
          y: y + 14,
          points: [
            [0, 0],
            [0, 84],
          ],
          groupId,
          meta: partMeta,
          stroke: DIAGRAM_PALETTE.outlineBlue,
        }),
      ];
    case "dfd-process":
      return [
        rectangle({
          x,
          y,
          width: 210,
          height: 120,
          groupId,
          meta: nodeMeta,
          fill: definition.backgroundColor,
          label,
          rounded: true,
        }),
        line({
          x,
          y: y + 34,
          points: [
            [0, 0],
            [210, 0],
          ],
          groupId,
          meta: partMeta,
          stroke: DIAGRAM_PALETTE.outlineBlue,
        }),
        text({
          x: x + 12,
          y: y + 8,
          value: "1.0",
          groupId,
          meta: partMeta,
          size: 13,
          family: FONT_FAMILY.Cascadia,
          color: DIAGRAM_PALETTE.outlineBlue,
        }),
      ];
    case "dfd-store":
      return [
        line({
          x,
          y,
          points: [
            [0, 0],
            [220, 0],
            [220, 82],
            [0, 82],
          ],
          groupId,
          meta: nodeMeta,
          fill: definition.backgroundColor,
          stroke: DIAGRAM_PALETTE.outlineBlue,
        }),
        line({
          x: x + 48,
          y,
          points: [
            [0, 0],
            [0, 82],
          ],
          groupId,
          meta: partMeta,
          stroke: DIAGRAM_PALETTE.outlineBlue,
        }),
        text({
          x: x + 12,
          y: y + 30,
          value: "D1",
          groupId,
          meta: partMeta,
          size: 14,
          family: FONT_FAMILY.Cascadia,
          color: DIAGRAM_PALETTE.outlineBlue,
        }),
        text({ x: x + 62, y: y + 27, value: label, groupId, meta: partMeta }),
      ];
    case "uml-package":
      return polygonWithLabel(
        [
          [0, 24],
          [0, 130],
          [230, 130],
          [230, 24],
          [86, 24],
          [70, 0],
          [0, 0],
          [0, 24],
        ],
        definition.backgroundColor,
        115,
        58,
        194,
      );
    case "ml-model":
      return [
        rectangle({
          x,
          y,
          width: 230,
          height: 112,
          groupId,
          meta: nodeMeta,
          fill: definition.backgroundColor,
          label,
          rounded: true,
        }),
      ];
    case "ml-stage":
      return [
        rectangle({
          x,
          y,
          width: 270,
          height: 180,
          groupId,
          meta: nodeMeta,
          fill: definition.backgroundColor,
          rounded: true,
        }),
        text({
          x: x + 16,
          y: y + 14,
          value: label,
          groupId,
          meta: partMeta,
          size: 18,
          family: FONT_FAMILY.Cascadia,
        }),
      ];
    case "ml-layer":
      return [
        rectangle({
          x,
          y,
          width: 220,
          height: 54,
          groupId,
          meta: nodeMeta,
          fill: definition.backgroundColor,
          label,
          rounded: true,
        }),
      ];
    case "ml-attention":
      return [
        rectangle({
          x,
          y,
          width: 230,
          height: 74,
          groupId,
          meta: nodeMeta,
          fill: definition.backgroundColor,
          label,
          labelColor: DIAGRAM_PALETTE.paper,
          rounded: true,
        }),
      ];
    case "ml-token":
      return [
        rectangle({
          x,
          y,
          width: 190,
          height: 48,
          groupId,
          meta: nodeMeta,
          fill: definition.backgroundColor,
          label,
          rounded: true,
        }),
      ];
    case "ml-tensor":
      return [
        rectangle({
          x,
          y,
          width: 240,
          height: 132,
          groupId,
          meta: nodeMeta,
          fill: definition.backgroundColor,
        }),
        line({
          x,
          y: y + 38,
          points: [
            [0, 0],
            [240, 0],
          ],
          groupId,
          meta: partMeta,
        }),
        line({
          x: x + 80,
          y: y + 38,
          points: [
            [0, 0],
            [0, 94],
          ],
          groupId,
          meta: partMeta,
        }),
        line({
          x: x + 160,
          y: y + 38,
          points: [
            [0, 0],
            [0, 94],
          ],
          groupId,
          meta: partMeta,
        }),
        line({
          x,
          y: y + 85,
          points: [
            [0, 0],
            [240, 0],
          ],
          groupId,
          meta: partMeta,
        }),
        text({
          x: x + 120,
          y: y + 10,
          width: 210,
          value: label,
          groupId,
          meta: partMeta,
          size: 16,
          family: FONT_FAMILY.Cascadia,
          align: "center",
        }),
      ];
    case "ml-pipeline-group":
      return [
        rectangle({
          x,
          y,
          width: 300,
          height: 210,
          groupId,
          meta: nodeMeta,
          fill: "transparent",
          stroke: DIAGRAM_PALETTE.outlineBlue,
          rounded: true,
        }),
        text({
          x: x + 150,
          y: y + 12,
          width: 270,
          value: label,
          groupId,
          meta: partMeta,
          size: 15,
          family: FONT_FAMILY.Cascadia,
          align: "center",
          color: DIAGRAM_PALETTE.outlineBlue,
        }),
      ];
    case "dfd-flow":
      return [
        {
          type: "arrow",
          x,
          y: y + 35,
          width: 220,
          height: 0,
          strokeColor: DIAGRAM_PALETTE.graphite,
          backgroundColor: "transparent",
          strokeWidth: 2,
          roughness: 0,
          endArrowhead: "arrow",
          label: {
            text: label,
            fontFamily: FONT_FAMILY.Excalifont,
            fontSize: 16,
          },
          ...componentProps(groupId, nodeMeta),
        },
      ];
    default:
      return [
        rectangle({
          x,
          y,
          width: 210,
          height: 100,
          groupId,
          meta: nodeMeta,
          fill: definition.backgroundColor,
          label,
          rounded: definition.rounded,
        }),
      ];
  }
};

export const createEngineeringNode = ({
  definition,
  position,
  nodeId = randomId(),
  label = definition.label,
  classModel = definition.smart === "class"
    ? createDefaultClassModel(definition)
    : undefined,
}: {
  definition: EngineeringSymbolDefinition;
  position: ScenePosition;
  nodeId?: string;
  label?: string;
  classModel?: UmlClassModel;
}) => {
  const groupId = randomId();
  const nodeLabel = classModel?.name ?? label;
  const nodeMeta = createMeta(
    definition,
    nodeId,
    nodeLabel,
    "node",
    classModel,
  );
  const partMeta = createMeta(
    definition,
    nodeId,
    nodeLabel,
    "component",
    classModel,
  );
  const skeletons = classModel
    ? umlClassSkeleton({
        position,
        groupId,
        nodeMeta,
        partMeta,
        model: classModel,
        fill: definition.backgroundColor,
      })
    : standardSkeleton({
        definition,
        position,
        groupId,
        nodeMeta,
        partMeta,
        label,
      });
  const elements = convertToExcalidrawElements(skeletons);
  const container = elements.find(
    (element) => getEngineeringMeta(element)?.role === "node",
  );
  if (!container) {
    throw new Error(`Could not create engineering node ${definition.id}`);
  }
  return { elements, container, nodeId, groupId };
};

const getCreatedNodeSelection = (
  created: ReturnType<typeof createEngineeringNode>,
) => {
  const selectedElementIds: Record<string, true> = {};
  created.elements.forEach((element) => {
    selectedElementIds[element.id] = true;
  });

  return {
    selectedElementIds,
    selectedGroupIds: { [created.groupId]: true },
    editingGroupId: null,
  };
};

export const getEngineeringNodes = (
  elements: readonly ExcalidrawElement[],
): EngineeringNode[] =>
  elements.flatMap((element) => {
    const meta = getEngineeringMeta(element);
    return meta?.role === "node" && !element.isDeleted
      ? [{ element, meta }]
      : [];
  });

const getNodeElementIds = (
  node: EngineeringNode,
  elements: readonly ExcalidrawElement[],
) => {
  const ids = new Set<string>();
  elements.forEach((element) => {
    if (getEngineeringMeta(element)?.nodeId === node.meta.nodeId) {
      ids.add(element.id);
    }
  });
  return ids;
};

const withoutInheritanceRelations = (elements: readonly ExcalidrawElement[]) =>
  elements.filter(
    (element) => getEngineeringMeta(element)?.role !== "relation",
  );

const createInheritanceRelations = (
  elements: readonly ExcalidrawElement[],
): ExcalidrawElement[] => {
  const classes = getEngineeringNodes(elements).filter(
    (node) => node.meta.classModel,
  );
  const byNodeId = new Map(
    classes.map((node) => [node.meta.nodeId, node] as const),
  );
  return classes.flatMap((child) => {
    const parentId = child.meta.classModel?.parentId;
    const parent = parentId ? byNodeId.get(parentId) : undefined;
    if (!parent) return [];
    const relationMeta: EngineeringElementMeta = {
      schemaVersion: 1,
      nodeId: `inheritance:${child.meta.nodeId}`,
      definitionId: "uml-inheritance",
      category: "uml",
      label: "inherits",
      role: "relation",
      relation: {
        sourceNodeId: child.meta.nodeId,
        targetNodeId: parent.meta.nodeId,
      },
    };
    return convertToExcalidrawElements([
      {
        type: "arrow",
        x: child.element.x + child.element.width / 2,
        y: child.element.y,
        width:
          parent.element.x +
          parent.element.width / 2 -
          (child.element.x + child.element.width / 2),
        height: parent.element.y + parent.element.height - child.element.y,
        strokeColor: STROKE,
        backgroundColor: "transparent",
        strokeWidth: 2,
        roughness: 0,
        endArrowhead: "triangle",
        customData: { engineering: relationMeta },
      },
    ]);
  });
};

const withFreshInheritanceRelations = (
  elements: readonly ExcalidrawElement[],
) => {
  const baseElements = withoutInheritanceRelations(elements);
  return [...baseElements, ...createInheritanceRelations(baseElements)];
};

export const getInsertionPosition = (
  api: ExcalidrawImperativeAPI,
  insertionIndex: number,
) => {
  const appState = api.getAppState();
  const center = viewportCoordsToSceneCoords(
    { clientX: (appState.width - 344) / 2, clientY: appState.height / 2 },
    appState,
  );
  const slot = Math.max(0, insertionIndex - 1) % 6;
  return {
    x: center.x - 280 + (slot % 2) * 340,
    y: center.y - 150 + Math.floor(slot / 2) * 190,
  };
};

export const insertEngineeringNode = (
  api: ExcalidrawImperativeAPI,
  definition: EngineeringSymbolDefinition,
  insertionIndex: number,
) => {
  const created = createEngineeringNode({
    definition,
    position: getInsertionPosition(api, insertionIndex),
  });
  api.updateScene({
    elements: [...api.getSceneElements(), ...created.elements],
    appState: getCreatedNodeSelection(created),
    captureUpdate: CaptureUpdateAction.IMMEDIATELY,
  });
  api.setToast({ message: `${definition.label} added`, duration: 1200 });
  return created.nodeId;
};

export const replaceEngineeringNode = ({
  api,
  node,
  label = node.meta.label,
  classModel = node.meta.classModel,
}: {
  api: ExcalidrawImperativeAPI;
  node: EngineeringNode;
  label?: string;
  classModel?: UmlClassModel;
}) => {
  const definition = getSymbolDefinition(node.meta.definitionId);
  if (!definition) return;
  const currentElements = api.getSceneElements();
  const removedIds = getNodeElementIds(node, currentElements);
  const created = createEngineeringNode({
    definition,
    position: { x: node.element.x, y: node.element.y },
    nodeId: node.meta.nodeId,
    label,
    classModel,
  });
  api.updateScene({
    elements: withFreshInheritanceRelations([
      ...currentElements.filter((element) => !removedIds.has(element.id)),
      ...created.elements,
    ]),
    appState: getCreatedNodeSelection(created),
    captureUpdate: CaptureUpdateAction.IMMEDIATELY,
  });
};

export const removeEngineeringNode = (
  api: ExcalidrawImperativeAPI,
  node: EngineeringNode,
) => {
  const currentElements = api.getSceneElements();
  const removedIds = getNodeElementIds(node, currentElements);
  api.updateScene({
    elements: withFreshInheritanceRelations(
      currentElements.filter((element) => !removedIds.has(element.id)),
    ),
    appState: { selectedElementIds: {} },
    captureUpdate: CaptureUpdateAction.IMMEDIATELY,
  });
};

export const refreshInheritanceRelations = (api: ExcalidrawImperativeAPI) => {
  api.updateScene({
    elements: withFreshInheritanceRelations(api.getSceneElements()),
    captureUpdate: CaptureUpdateAction.EVENTUALLY,
  });
};

export const findSelectedEngineeringNode = (
  nodes: EngineeringNode[],
  elements: readonly ExcalidrawElement[],
  appState: Pick<UIAppState, "selectedElementIds">,
) => {
  const selectedIds = new Set(Object.keys(appState.selectedElementIds));
  const selectedNodeIds = new Set(
    elements.flatMap((element) => {
      if (!selectedIds.has(element.id)) return [];
      const meta = getEngineeringMeta(element);
      return meta ? [meta.nodeId] : [];
    }),
  );
  return (
    nodes.find(
      (node) =>
        selectedIds.has(node.element.id) ||
        selectedNodeIds.has(node.meta.nodeId),
    ) ?? null
  );
};
