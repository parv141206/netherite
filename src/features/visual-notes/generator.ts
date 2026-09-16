import type {
  LayoutCluster,
  LayoutEdge,
  LayoutNode,
  LayoutResult,
  VisualNoteOptions,
} from "./types";

let elementCounter = 0;
function nextSeed(): number {
  return Math.floor(Math.random() * 1000000);
}

function nextElementId(prefix = "elem"): string {
  elementCounter += 1;
  return `${prefix}_${Date.now().toString(36)}_${elementCounter}`;
}

export interface ExcalidrawSceneOutput {
  type: "excalidraw";
  version: 2;
  source: "netherite-visual-notes";
  elements: any[];
  appState: {
    viewBackgroundColor: string;
    currentItemFontFamily: number;
    theme: "light" | "dark";
    gridSize?: number | null;
  };
  files: Record<string, any>;
}

/**
 * Calculates exit and entry boundary points between two nodes with deterministic facing.
 */
function calculateConnectionPoints(
  source: LayoutNode,
  target: LayoutNode,
  edge?: LayoutEdge,
  portFraction = 0.5,
): {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  waypoints: [number, number][];
} {
  const scx = source.x + source.width / 2;
  const scy = source.y + source.height / 2;
  const tcx = target.x + target.width / 2;
  const tcy = target.y + target.height / 2;

  const dx = tcx - scx;
  const dy = tcy - scy;

  const isNote = target.type === "note";
  const isDiagram = target.type === "ascii-diagram";
  const targetGap = isNote ? 14 : isDiagram ? 12 : 10;
  const sourceGap = 2;

  // Infer exit and entry sides if not explicitly specified on the edge
  let exitSide: "left" | "right" | "top" | "bottom" =
    edge?.exitSide ||
    (Math.abs(dx) > Math.abs(dy) * 0.7
      ? dx > 0
        ? "right"
        : "left"
      : dy > 0
      ? "bottom"
      : "top");

  let entrySide: "left" | "right" | "top" | "bottom" =
    edge?.entrySide ||
    (Math.abs(dx) > Math.abs(dy) * 0.7
      ? dx > 0
        ? "left"
        : "right"
      : dy > 0
      ? "top"
      : "bottom");

  // Calculate startX, startY based on fractional port along the exit face
  let startX = scx;
  let startY = scy;

  if (exitSide === "left") {
    startX = source.x - sourceGap;
    startY = source.y + source.height * portFraction;
  } else if (exitSide === "right") {
    startX = source.x + source.width + sourceGap;
    startY = source.y + source.height * portFraction;
  } else if (exitSide === "top") {
    startX = source.x + source.width * portFraction;
    startY = source.y - sourceGap;
  } else {
    // exitSide === "bottom"
    startX = source.x + source.width * portFraction;
    startY = source.y + source.height + sourceGap;
  }

  // Calculate endX, endY with guaranteed boundary clearance
  let endX = tcx;
  let endY = tcy;

  if (entrySide === "left") {
    endX = target.x - targetGap;
    endY = isNote ? target.y + Math.min(22, target.height / 2) : isDiagram ? target.y + 40 : tcy;
  } else if (entrySide === "right") {
    endX = target.x + target.width + targetGap;
    endY = isNote ? target.y + Math.min(22, target.height / 2) : isDiagram ? target.y + 40 : tcy;
  } else if (entrySide === "top") {
    endX = isNote ? Math.max(target.x + 20, Math.min(target.x + target.width - 20, startX)) : tcx;
    endY = target.y - targetGap;
  } else {
    // entrySide === "bottom"
    endX = isNote ? Math.max(target.x + 20, Math.min(target.x + target.width - 20, startX)) : tcx;
    endY = target.y + target.height + targetGap;
  }

  const relEndX = endX - startX;
  const relEndY = endY - startY;

  let waypoints: [number, number][] = [];

  if (edge?.arrowType === "sharp") {
    // 1. Sharp / Straight Arrow: Direct 2-point vector
    waypoints = [
      [0, 0],
      [relEndX, relEndY],
    ];
  } else if (edge?.arrowType === "elbow" || edge?.elbowed) {
    // 2. Elbow / Orthogonal Arrow: Stepped 90-degree right angles through clear corridor
    if (exitSide === "right" || exitSide === "left") {
      const stepX = Math.round(relEndX * 0.5);
      waypoints = [
        [0, 0],
        [stepX, 0],
        [stepX, relEndY],
        [relEndX, relEndY],
      ];
    } else {
      const stepY = Math.round(relEndY * 0.5);
      waypoints = [
        [0, 0],
        [0, stepY],
        [relEndX, stepY],
        [relEndX, relEndY],
      ];
    }
  } else {
    // 3. Curved Arrow (Hand-drawn smooth spline):
    // Control points are strictly monotonic fractions within [0, relEndX] x [0, relEndY].
    // Eliminates orthogonal 90-degree corners that cause Catmull-Rom splines to balloon or loop.
    if (
      (exitSide === "left" || exitSide === "right") &&
      (entrySide === "left" || entrySide === "right")
    ) {
      const p1X = Math.round(relEndX * 0.45);
      const p1Y = Math.round(relEndY * 0.1);
      const p2X = Math.round(relEndX * 0.55);
      const p2Y = Math.round(relEndY * 0.9);
      waypoints = [
        [0, 0],
        [p1X, p1Y],
        [p2X, p2Y],
        [relEndX, relEndY],
      ];
    } else if (
      (exitSide === "top" || exitSide === "bottom") &&
      (entrySide === "top" || entrySide === "bottom")
    ) {
      const p1X = Math.round(relEndX * 0.1);
      const p1Y = Math.round(relEndY * 0.45);
      const p2X = Math.round(relEndX * 0.9);
      const p2Y = Math.round(relEndY * 0.55);
      waypoints = [
        [0, 0],
        [p1X, p1Y],
        [p2X, p2Y],
        [relEndX, relEndY],
      ];
    } else {
      // Perpendicular transitions (e.g. exit side to entry top)
      const midX = Math.round(relEndX * 0.5);
      const midY = Math.round(relEndY * 0.5);
      waypoints = [
        [0, 0],
        [midX, midY],
        [relEndX, relEndY],
      ];
    }
  }

  return { startX, startY, endX, endY, waypoints };
}

/**
 * Converts a LayoutResult into complete, native Excalidraw elements.
 */
export function generateExcalidrawElements(
  layout: LayoutResult,
  options?: VisualNoteOptions,
): any[] {
  elementCounter = 0;
  // Excalidraw standard default colors:
  // All text, borders, and arrows use default black (#1e1e1e) and transparent backgrounds.
  // This allows Excalidraw's built-in canvas theme switcher (light/dark) to automatically invert
  // text and strokes cleanly without hardcoded color conflicts.
  // Only main topic titles use custom elegant pastel palettes.
  const defaultStroke = "#1e1e1e";
  const defaultText = "#1e1e1e";
  const defaultBg = "transparent";
  const roughness = options?.roughness ?? 1;

  const elements: any[] = [];
  const nodeMap = new Map<string, LayoutNode>();
  for (const node of layout.nodes) {
    nodeMap.set(node.id, node);
  }

  // Map of cluster ID to Excalidraw group ID
  const clusterGroupMap = new Map<string, string>();
  for (const c of layout.clusters) {
    clusterGroupMap.set(c.id, nextElementId("grp"));
  }

  // Pre-calculate which arrows connect to which nodes for bidirectional Excalidraw binding
  const nodeArrowBindings = new Map<string, { id: string; type: "arrow" }[]>();
  for (const edge of layout.edges) {
    const arrowId = edge.id;
    if (!nodeArrowBindings.has(edge.sourceId)) nodeArrowBindings.set(edge.sourceId, []);
    nodeArrowBindings.get(edge.sourceId)!.push({ id: arrowId, type: "arrow" });

    if (!nodeArrowBindings.has(edge.targetId)) nodeArrowBindings.set(edge.targetId, []);
    nodeArrowBindings.get(edge.targetId)!.push({ id: arrowId, type: "arrow" });
  }

  const getBoundElements = (nodeId: string, internalTextId?: string) => {
    const arrows = nodeArrowBindings.get(nodeId) ?? [];
    if (internalTextId) {
      return [{ id: internalTextId, type: "text" as const }, ...arrows];
    }
    return arrows.length > 0 ? arrows : null;
  };

  // 1. Generate Nodes (Shapes & Text)
  for (const node of layout.nodes) {
    const groupId = clusterGroupMap.get(node.clusterId) ?? nextElementId("grp");
    const groupIds = [groupId];

    if (node.type === "main-topic") {
      const palette = node.colorTheme;
      const strokeColor = palette?.stroke ?? "#1098ad";
      const bgColor = palette?.fill ?? "#c5f6fa";
      const textColor = palette?.text ?? defaultText;

      const containerId = node.id;
      const textId = `${node.id}_text`;

      // Main Topic Rounded Box
      elements.push({
        id: containerId,
        type: "rectangle",
        x: Math.round(node.x),
        y: Math.round(node.y),
        width: Math.round(node.width),
        height: Math.round(node.height),
        angle: 0,
        strokeColor,
        backgroundColor: bgColor,
        fillStyle: "solid",
        strokeWidth: 2,
        strokeStyle: "solid",
        roughness,
        opacity: 100,
        groupIds,
        roundness: { type: 3 }, // Adaptive radius
        seed: nextSeed(),
        version: 1,
        versionNonce: nextSeed(),
        isDeleted: false,
        boundElements: getBoundElements(node.id, textId),
      });

      // Centered Label Text
      elements.push({
        id: textId,
        type: "text",
        x: Math.round(node.x + 16),
        y: Math.round(node.y + (node.height - 26) / 2),
        width: Math.round(node.width - 32),
        height: 26,
        angle: 0,
        strokeColor: textColor,
        backgroundColor: "transparent",
        fillStyle: "solid",
        strokeWidth: 1,
        strokeStyle: "solid",
        roughness: 0,
        opacity: 100,
        groupIds,
        roundness: null,
        seed: nextSeed(),
        version: 1,
        versionNonce: nextSeed(),
        isDeleted: false,
        text: node.title ?? "",
        fontSize: node.fontSize,
        fontFamily: node.fontFamily,
        textAlign: "center",
        verticalAlign: "middle",
        containerId,
      });
    } else if (node.type === "subtopic") {
      const strokeColor = defaultStroke;
      const bgColor = defaultBg;
      const textColor = defaultText;

      const containerId = node.id;
      const textId = `${node.id}_text`;

      // Subtopic Box (Solid outline)
      elements.push({
        id: containerId,
        type: "rectangle",
        x: Math.round(node.x),
        y: Math.round(node.y),
        width: Math.round(node.width),
        height: Math.round(node.height),
        angle: 0,
        strokeColor,
        backgroundColor: bgColor,
        fillStyle: "solid",
        strokeWidth: 2,
        strokeStyle: node.style || "solid",
        roughness,
        opacity: 100,
        groupIds,
        roundness: { type: 3 },
        seed: nextSeed(),
        version: 1,
        versionNonce: nextSeed(),
        isDeleted: false,
        boundElements: getBoundElements(node.id, textId),
      });

      // Centered Subtopic Text
      elements.push({
        id: textId,
        type: "text",
        x: Math.round(node.x + 12),
        y: Math.round(node.y + (node.height - 22) / 2),
        width: Math.round(node.width - 24),
        height: 22,
        angle: 0,
        strokeColor: textColor,
        backgroundColor: "transparent",
        fillStyle: "solid",
        strokeWidth: 1,
        strokeStyle: "solid",
        roughness: 0,
        opacity: 100,
        groupIds,
        roundness: null,
        seed: nextSeed(),
        version: 1,
        versionNonce: nextSeed(),
        isDeleted: false,
        text: node.title ?? "",
        fontSize: node.fontSize,
        fontFamily: node.fontFamily,
        textAlign: "center",
        verticalAlign: "middle",
        containerId,
      });
    } else if (node.type === "flow-step" || node.type === "sub-subtopic") {
      // Flow steps and sub-subtopics use dashed border matching user sketch
      const strokeColor = defaultStroke;
      const bgColor = defaultBg;
      const textColor = defaultText;

      const containerId = node.id;
      const textId = `${node.id}_text`;

      elements.push({
        id: containerId,
        type: "rectangle",
        x: Math.round(node.x),
        y: Math.round(node.y),
        width: Math.round(node.width),
        height: Math.round(node.height),
        angle: 0,
        strokeColor,
        backgroundColor: bgColor,
        fillStyle: "solid",
        strokeWidth: 2,
        strokeStyle: "dashed", // Dashed border
        roughness,
        opacity: 100,
        groupIds,
        roundness: { type: 3 },
        seed: nextSeed(),
        version: 1,
        versionNonce: nextSeed(),
        isDeleted: false,
        boundElements: getBoundElements(node.id, textId),
      });

      elements.push({
        id: textId,
        type: "text",
        x: Math.round(node.x + 10),
        y: Math.round(node.y + (node.height - 20) / 2),
        width: Math.round(node.width - 20),
        height: 20,
        angle: 0,
        strokeColor: textColor,
        backgroundColor: "transparent",
        fillStyle: "solid",
        strokeWidth: 1,
        strokeStyle: "solid",
        roughness: 0,
        opacity: 100,
        groupIds,
        roundness: null,
        seed: nextSeed(),
        version: 1,
        versionNonce: nextSeed(),
        isDeleted: false,
        text: node.title ?? "",
        fontSize: node.fontSize,
        fontFamily: node.fontFamily,
        textAlign: "center",
        verticalAlign: "middle",
        containerId,
      });
    } else if (node.type === "note") {
      // Clean multiline prose text note (borderless handwritten text)
      elements.push({
        id: node.id,
        type: "text",
        x: Math.round(node.x),
        y: Math.round(node.y),
        width: Math.round(node.width),
        height: Math.round(node.height),
        angle: 0,
        strokeColor: defaultText,
        backgroundColor: "transparent",
        fillStyle: "solid",
        strokeWidth: 1,
        strokeStyle: "solid",
        roughness: 0,
        opacity: 100,
        groupIds,
        roundness: null,
        seed: nextSeed(),
        version: 1,
        versionNonce: nextSeed(),
        isDeleted: false,
        text: node.text ?? "",
        fontSize: node.fontSize,
        fontFamily: node.fontFamily, // Virgil
        textAlign: "left",
        verticalAlign: "top",
        boundElements: getBoundElements(node.id),
      });
    } else if (node.type === "ascii-diagram") {
      // Monospace ASCII Diagram Block (preserving all spaces and alignment)
      const asciiTextId = `${node.id}_code`;
      const padding = 12;

      // Subtle dashed backdrop boundary for the diagram
      elements.push({
        id: node.id,
        type: "rectangle",
        x: Math.round(node.x),
        y: Math.round(node.y),
        width: Math.round(node.width),
        height: Math.round(node.height),
        angle: 0,
        strokeColor: defaultStroke,
        backgroundColor: defaultBg,
        fillStyle: "solid",
        strokeWidth: 1,
        strokeStyle: "dashed",
        roughness: 0,
        opacity: 100,
        groupIds,
        roundness: { type: 3 },
        seed: nextSeed(),
        version: 1,
        versionNonce: nextSeed(),
        isDeleted: false,
        boundElements: getBoundElements(node.id),
      });

      // Raw Cascadia monospace text inside
      elements.push({
        id: asciiTextId,
        type: "text",
        x: Math.round(node.x + padding),
        y: Math.round(node.y + padding),
        width: Math.round(node.width - padding * 2),
        height: Math.round(node.height - padding * 2),
        angle: 0,
        strokeColor: defaultText,
        backgroundColor: "transparent",
        fillStyle: "solid",
        strokeWidth: 1,
        strokeStyle: "solid",
        roughness: 0,
        opacity: 100,
        groupIds,
        roundness: null,
        seed: nextSeed(),
        version: 1,
        versionNonce: nextSeed(),
        isDeleted: false,
        text: node.text ?? "",
        fontSize: node.fontSize,
        fontFamily: 3, // Cascadia monospace
        textAlign: "left",
        verticalAlign: "top",
      });
    }
  }

  // 2. Generate Connecting Arrows (Edges)
  // Pre-group outgoing edges by sourceId and exitSide for multi-port distribution
  const outgoingGroups = new Map<string, { edge: LayoutEdge; target: LayoutNode }[]>();
  for (const edge of layout.edges) {
    const source = nodeMap.get(edge.sourceId);
    const target = nodeMap.get(edge.targetId);
    if (!source || !target) continue;

    const dx = (target.x + target.width / 2) - (source.x + source.width / 2);
    const dy = (target.y + target.height / 2) - (source.y + source.height / 2);
    const exitSide =
      edge.exitSide ||
      (Math.abs(dx) > Math.abs(dy) * 0.7 ? (dx > 0 ? "right" : "left") : dy > 0 ? "bottom" : "top");

    const key = `${edge.sourceId}_${exitSide}`;
    if (!outgoingGroups.has(key)) outgoingGroups.set(key, []);
    outgoingGroups.get(key)!.push({ edge, target });
  }

  // Pre-calculate port fractions
  const edgePortFraction = new Map<string, number>();
  for (const [key, items] of outgoingGroups.entries()) {
    const exitSide = key.split("_")[1];
    if (exitSide === "left" || exitSide === "right") {
      items.sort((a, b) => a.target.y - b.target.y);
    } else {
      items.sort((a, b) => a.target.x - b.target.x);
    }
    const count = items.length;
    for (let i = 0; i < count; i++) {
      const fraction = (i + 1) / (count + 1);
      edgePortFraction.set(items[i]!.edge.id, fraction);
    }
  }

  for (const edge of layout.edges) {
    const source = nodeMap.get(edge.sourceId);
    const target = nodeMap.get(edge.targetId);
    if (!source || !target) continue;

    const groupId = clusterGroupMap.get(edge.clusterId) ?? nextElementId("grp");
    const groupIds = [groupId];

    const portFraction = edgePortFraction.get(edge.id) ?? 0.5;
    const conn = calculateConnectionPoints(source, target, edge, portFraction);
    const strokeColor = defaultStroke;

    const arrowId = edge.id;
    const isSharp = edge.arrowType === "sharp";
    const roundness = isSharp ? null : { type: 2 };

    const arrowElement: any = {
      id: arrowId,
      type: "arrow",
      x: Math.round(conn.startX),
      y: Math.round(conn.startY),
      width: Math.round(conn.endX - conn.startX),
      height: Math.round(conn.endY - conn.startY),
      angle: 0,
      strokeColor,
      backgroundColor: "transparent",
      fillStyle: "solid",
      strokeWidth: 2,
      strokeStyle: edge.style || "solid",
      roughness: isSharp ? 0 : roughness,
      opacity: 100,
      groupIds,
      roundness,
      elbowed: false, // Never set elbowed: true in Excalidraw; our waypoints handle all stepped angles
      seed: nextSeed(),
      version: 1,
      versionNonce: nextSeed(),
      isDeleted: false,
      points: conn.waypoints.map(([x, y]) => [Math.round(x), Math.round(y)]),
      startBinding: {
        elementId: source.id,
        focus: 0,
        gap: 4,
      },
      endBinding: {
        elementId: target.id,
        focus: 0,
        gap: target.type === "note" ? 6 : 8,
      },
      startArrowhead: null,
      endArrowhead: edge.arrowhead || "arrow",
      boundElements: edge.label ? [{ id: `${arrowId}_label`, type: "text" }] : null,
    };

    // 1. Push arrow first
    elements.push(arrowElement);

    // 2. Push bound text element IMMEDIATELY AFTER arrow (critical for Excalidraw bound text)
    if (edge.label) {
      const labelTextId = `${arrowId}_label`;
      const midPoint = conn.waypoints[Math.floor(conn.waypoints.length / 2)] || [0, 0];
      const labelWidth = Math.min(240, Math.max(80, edge.label.length * 9));
      const labelHeight = 24;
      const labelX = conn.startX + midPoint[0] - labelWidth / 2;
      const labelY = conn.startY + midPoint[1] - labelHeight / 2;

      elements.push({
        id: labelTextId,
        type: "text",
        x: Math.round(labelX),
        y: Math.round(labelY),
        width: Math.round(labelWidth),
        height: labelHeight,
        angle: 0,
        strokeColor: defaultText,
        backgroundColor: "transparent",
        fillStyle: "solid",
        strokeWidth: 1,
        strokeStyle: "solid",
        roughness: 0,
        opacity: 100,
        groupIds,
        roundness: null,
        seed: nextSeed(),
        version: 1,
        versionNonce: nextSeed(),
        isDeleted: false,
        text: edge.label,
        fontSize: 14,
        fontFamily: 1, // Virgil
        textAlign: "center",
        verticalAlign: "middle",
        containerId: arrowId,
        autoResize: true,
      });
    }
  }

  return elements;
}

/**
 * Generates the full Excalidraw JSON document from layout results.
 */
export function generateExcalidrawScene(
  layout: LayoutResult,
  options?: VisualNoteOptions,
): ExcalidrawSceneOutput {
  const elements = generateExcalidrawElements(layout, options);
  const theme = options?.theme ?? "light";

  return {
    type: "excalidraw",
    version: 2,
    source: "netherite-visual-notes",
    elements,
    appState: {
      viewBackgroundColor: theme === "dark" ? "#121212" : "#ffffff",
      currentItemFontFamily: options?.defaultFontFamily ?? 1,
      theme,
      gridSize: null,
    },
    files: {},
  };
}
