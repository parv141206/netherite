import type { ExcalidrawElement } from "@excalidraw/element/types";

export type EngineeringCategoryId =
  "flowchart" | "functional" | "dfd" | "uml" | "ml";

export type EngineeringShape = "rectangle" | "ellipse" | "diamond" | "arrow";

export type EngineeringSymbolDefinition = {
  id: string;
  category: EngineeringCategoryId;
  label: string;
  description: string;
  glyph: string;
  shape: EngineeringShape;
  backgroundColor: string;
  strokeColor?: string;
  rounded?: boolean;
  smart?: "class";
};

export type UmlClassModel = {
  name: string;
  stereotype: "class" | "interface" | "abstract";
  fields: string[];
  methods: string[];
  responsibilities: string[];
  parentId: string | null;
};

export type EngineeringElementMeta = {
  schemaVersion: 1;
  nodeId: string;
  definitionId: string;
  category: EngineeringCategoryId;
  label: string;
  role: "node" | "component" | "relation";
  classModel?: UmlClassModel;
  relation?: {
    sourceNodeId: string;
    targetNodeId: string;
  };
};

export type EngineeringNode = {
  element: ExcalidrawElement;
  meta: EngineeringElementMeta;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export const getEngineeringMeta = (
  element: ExcalidrawElement,
): EngineeringElementMeta | null => {
  const customData = element.customData as unknown;
  if (!isRecord(customData)) {
    return null;
  }

  const value = customData.engineering;
  if (
    !isRecord(value) ||
    value.schemaVersion !== 1 ||
    typeof value.nodeId !== "string" ||
    typeof value.definitionId !== "string"
  ) {
    return null;
  }

  return value as EngineeringElementMeta;
};
