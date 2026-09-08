import crypto from "crypto";

export interface ExcalidrawShapeInput {
  id?: string;
  type?: "rectangle" | "ellipse" | "diamond" | "text";
  label: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  backgroundColor?: string;
  strokeColor?: string;
  fillStyle?: "solid" | "hachure" | "cross-hatch";
  roundness?: boolean;
}

export interface ExcalidrawConnectionInput {
  from: string; // Shape label or ID
  to: string;   // Shape label or ID
  label?: string;
  strokeColor?: string;
  strokeStyle?: "solid" | "dashed" | "dotted";
}

export interface BuildExcalidrawInput {
  title: string;
  shapes?: ExcalidrawShapeInput[];
  connections?: ExcalidrawConnectionInput[];
  rawScene?: any;
  theme?: "dark" | "light";
}

function uid(): string {
  return typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `elem-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
}

function randomSeed(): number {
  return Math.floor(Math.random() * 1000000);
}

export function buildExcalidrawScene(input: BuildExcalidrawInput): any {
  if (input.rawScene && typeof input.rawScene === "object") {
    const raw = input.rawScene;
    if (!raw.type) raw.type = "excalidraw";
    if (!raw.version) raw.version = 2;
    if (!raw.elements) raw.elements = [];
    if (!raw.appState) {
      raw.appState = {
        viewBackgroundColor: input.theme === "light" ? "#ffffff" : "#121212",
        currentItemFontFamily: 1,
      };
    }
    if (!raw.files) raw.files = {};
    return raw;
  }

  const isDark = input.theme !== "light";
  const defaultBg = isDark ? "#1f2937" : "#f3f4f6";
  const defaultStroke = isDark ? "#9ca3af" : "#374151";
  const defaultTextColor = isDark ? "#f3f4f6" : "#111827";

  const elements: any[] = [];
  const shapeLookup = new Map<string, { id: string; x: number; y: number; width: number; height: number }>();

  const shapes = input.shapes || [];
  const cols = shapes.length > 4 ? 3 : 2;
  const colWidth = 220;
  const rowHeight = 110;
  const xGap = 90;
  const yGap = 90;

  shapes.forEach((s, idx) => {
    const shapeId = s.id || uid();
    const col = idx % cols;
    const row = Math.floor(idx / cols);

    const width = s.width || colWidth;
    const height = s.height || rowHeight;
    const posX = s.x ?? (100 + col * (colWidth + xGap));
    const posY = s.y ?? (100 + row * (rowHeight + yGap));

    shapeLookup.set(s.label.trim().toLowerCase(), { id: shapeId, x: posX, y: posY, width, height });
    shapeLookup.set(shapeId, { id: shapeId, x: posX, y: posY, width, height });

    const shapeType = s.type || "rectangle";
    const textId = uid();

    // 1. Container Shape Element
    if (shapeType !== "text") {
      elements.push({
        id: shapeId,
        type: shapeType,
        x: posX,
        y: posY,
        width,
        height,
        angle: 0,
        strokeColor: s.strokeColor || defaultStroke,
        backgroundColor: s.backgroundColor || defaultBg,
        fillStyle: s.fillStyle || "solid",
        strokeWidth: 2,
        strokeStyle: "solid",
        roughness: 1,
        opacity: 100,
        groupIds: [],
        roundness: s.roundness !== false ? { type: 3 } : null,
        seed: randomSeed(),
        version: 1,
        versionNonce: randomSeed(),
        isDeleted: false,
        boundElements: [{ id: textId, type: "text" }],
        updated: Date.now(),
        link: null,
        locked: false,
      });
    }

    // 2. Centered Text Element
    const fontSize = 16;
    const lineHeight = 1.25;
    elements.push({
      id: textId,
      type: "text",
      x: posX + 16,
      y: posY + height / 2 - 10,
      width: width - 32,
      height: fontSize * lineHeight,
      angle: 0,
      strokeColor: defaultTextColor,
      backgroundColor: "transparent",
      fillStyle: "solid",
      strokeWidth: 1,
      strokeStyle: "solid",
      roughness: 1,
      opacity: 100,
      groupIds: [],
      seed: randomSeed(),
      version: 1,
      versionNonce: randomSeed(),
      isDeleted: false,
      boundElements: null,
      updated: Date.now(),
      link: null,
      locked: false,
      text: s.label,
      fontSize,
      fontFamily: 1,
      textAlign: "center",
      verticalAlign: "middle",
      containerId: shapeType !== "text" ? shapeId : null,
      originalText: s.label,
      lineHeight,
    });
  });

  // 3. Directed Arrow Connections
  if (input.connections && input.connections.length > 0) {
    input.connections.forEach((conn) => {
      const fromObj = shapeLookup.get(conn.from.trim().toLowerCase()) || shapeLookup.get(conn.from.trim());
      const toObj = shapeLookup.get(conn.to.trim().toLowerCase()) || shapeLookup.get(conn.to.trim());

      if (!fromObj || !toObj) return;

      const startX = fromObj.x + fromObj.width / 2;
      const startY = fromObj.y + fromObj.height / 2;
      const endX = toObj.x + toObj.width / 2;
      const endY = toObj.y + toObj.height / 2;

      const arrowId = uid();
      const deltaX = endX - startX;
      const deltaY = endY - startY;

      elements.push({
        id: arrowId,
        type: "arrow",
        x: startX,
        y: startY,
        width: Math.abs(deltaX),
        height: Math.abs(deltaY),
        angle: 0,
        strokeColor: conn.strokeColor || defaultStroke,
        backgroundColor: "transparent",
        fillStyle: "solid",
        strokeWidth: 2,
        strokeStyle: conn.strokeStyle || "solid",
        roughness: 1,
        opacity: 100,
        groupIds: [],
        roundness: { type: 2 },
        seed: randomSeed(),
        version: 1,
        versionNonce: randomSeed(),
        isDeleted: false,
        boundElements: null,
        updated: Date.now(),
        link: null,
        locked: false,
        points: [
          [0, 0],
          [deltaX, deltaY],
        ],
        lastCommittedPoint: null,
        startBinding: {
          elementId: fromObj.id,
          focus: 0,
          gap: 6,
        },
        endBinding: {
          elementId: toObj.id,
          focus: 0,
          gap: 6,
        },
        startArrowhead: null,
        endArrowhead: "arrow",
      });
    });
  }

  return {
    type: "excalidraw",
    version: 2,
    source: "netherite",
    elements,
    appState: {
      viewBackgroundColor: isDark ? "#121212" : "#ffffff",
      currentItemFontFamily: 1,
    },
    files: {},
  };
}
