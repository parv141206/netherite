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
 * Calculates exact ray-box perimeter intersection.
 * Finds the point where a ray from the box center towards (targetX, targetY)
 * crosses the box perimeter with the given clearance gap.
 */
function getBoxBoundaryPoint(
  node: LayoutNode,
  targetX: number,
  targetY: number,
  gap = 2,
  preferredSide?: "top" | "bottom" | "left" | "right",
): { x: number; y: number } {
  const cx = node.x + node.width / 2;
  const cy = node.y + node.height / 2;
  const dx = targetX - cx;
  const dy = targetY - cy;

  if (Math.abs(dx) < 1e-4 && Math.abs(dy) < 1e-4) {
    return { x: cx, y: cy };
  }

  if (preferredSide === "left" || (!preferredSide && targetX < node.x)) {
    const exitX = node.x - gap;
    const exitY = Math.max(node.y + 4, Math.min(node.y + node.height - 4, cy + dy * ((node.x - cx) / dx)));
    return { x: exitX, y: exitY };
  }
  if (preferredSide === "right" || (!preferredSide && targetX > node.x + node.width)) {
    const exitX = node.x + node.width + gap;
    const exitY = Math.max(node.y + 4, Math.min(node.y + node.height - 4, cy + dy * ((node.x + node.width - cx) / dx)));
    return { x: exitX, y: exitY };
  }
  if (preferredSide === "top" || (!preferredSide && targetY < node.y)) {
    const exitY = node.y - gap;
    const exitX = Math.max(node.x + 4, Math.min(node.x + node.width - 4, cx + dx * ((node.y - cy) / dy)));
    return { x: exitX, y: exitY };
  }
  if (preferredSide === "bottom" || (!preferredSide && targetY > node.y + node.height)) {
    const exitY = node.y + node.height + gap;
    const exitX = Math.max(node.x + 4, Math.min(node.x + node.width - 4, cx + dx * ((node.y + node.height - cy) / dy)));
    return { x: exitX, y: exitY };
  }

  const halfW = node.width / 2 + gap;
  const halfH = node.height / 2 + gap;

  const tx = halfW / Math.abs(dx);
  const ty = halfH / Math.abs(dy);
  const t = Math.min(tx, ty);

  return {
    x: cx + t * dx,
    y: cy + t * dy,
  };
}

/**
 * Calculates exit and entry boundary points between two nodes with clean radial line-of-sight
 * and smart obstacle-avoiding curved spline routing.
 */
function calculateConnectionPoints(
  source: LayoutNode,
  target: LayoutNode,
  edge?: LayoutEdge,
  _portFraction = 0.5,
  allNodes: LayoutNode[] = [],
): {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  waypoints: [number, number][];
} {
  const gap = 3;
  const isNote = target.type === "note";
  const endGap = isNote ? 4 : 6;

  let startX = source.x + source.width / 2;
  let startY = source.y + source.height / 2;
  let endX = target.x + target.width / 2;
  let endY = target.y + target.height / 2;

  // 1. Determine Exit and Entry Sides
  let exitSide = edge?.exitSide;
  let entrySide = edge?.entrySide;

  if (!exitSide || !entrySide) {
    const scx = source.x + source.width / 2;
    const scy = source.y + source.height / 2;
    const tcx = target.x + target.width / 2;
    const tcy = target.y + target.height / 2;
    const dx = tcx - scx;
    const dy = tcy - scy;

    if (Math.abs(dy) > Math.abs(dx)) {
      if (dy < 0) {
        exitSide = exitSide || "top";
        entrySide = entrySide || "bottom";
      } else {
        exitSide = exitSide || "bottom";
        entrySide = entrySide || "top";
      }
    } else {
      if (dx > 0) {
        exitSide = exitSide || "right";
        entrySide = entrySide || "left";
      } else {
        exitSide = exitSide || "left";
        entrySide = entrySide || "right";
      }
    }
  }

  // 2. Exact Port Anchors
  // Target entry point: squarely in the center of the target's entry face
  if (entrySide === "bottom") {
    endX = target.x + target.width / 2;
    endY = target.y + target.height + endGap;
  } else if (entrySide === "top") {
    endX = target.x + target.width / 2;
    endY = target.y - endGap;
  } else if (entrySide === "left") {
    endX = target.x - endGap;
    endY = target.y + target.height / 2;
  } else if (entrySide === "right") {
    endX = target.x + target.width + endGap;
    endY = target.y + target.height / 2;
  }

  // Source exit point: on the exit face of the source, aligned with target's position
  if (exitSide === "top") {
    startY = source.y - gap;
    startX = Math.max(source.x + 14, Math.min(source.x + source.width - 14, endX));
  } else if (exitSide === "bottom") {
    startY = source.y + source.height + gap;
    startX = Math.max(source.x + 14, Math.min(source.x + source.width - 14, endX));
  } else if (exitSide === "left") {
    startX = source.x - gap;
    startY = Math.max(source.y + 10, Math.min(source.y + source.height - 10, endY));
  } else if (exitSide === "right") {
    startX = source.x + source.width + gap;
    startY = Math.max(source.y + 10, Math.min(source.y + source.height - 10, endY));
  }

  const relEndX = endX - startX;
  const relEndY = endY - startY;
  const len = Math.hypot(relEndX, relEndY);

  let waypoints: [number, number][] = [];

  if (edge?.arrowType === "elbow" && edge?.elbowed) {
    if (exitSide === "top" || exitSide === "bottom") {
      const midY = Math.round(relEndY * 0.5);
      waypoints = [
        [0, 0],
        [0, midY],
        [relEndX, midY],
        [relEndX, relEndY],
      ];
    } else {
      const midX = Math.round(relEndX * 0.5);
      waypoints = [
        [0, 0],
        [midX, 0],
        [midX, relEndY],
        [relEndX, relEndY],
      ];
    }
  } else if (edge?.arrowType === "sharp") {
    waypoints = [
      [0, 0],
      [relEndX, relEndY],
    ];
  } else {
    // Curved arrow: Smooth, natural curve respecting the flow direction
    if (len < 15) {
      waypoints = [
        [0, 0],
        [relEndX, relEndY],
      ];
    } else {
      let midRelX = relEndX * 0.5;
      let midRelY = relEndY * 0.5;

      if (exitSide === "top" || exitSide === "bottom") {
        const lateralSpan = relEndX;
        midRelX = lateralSpan * 0.45;
        midRelY = relEndY * 0.5;
      } else {
        const verticalSpan = relEndY;
        midRelX = relEndX * 0.5;
        midRelY = verticalSpan * 0.45;
      }

      waypoints = [
        [0, 0],
        [Math.round(midRelX), Math.round(midRelY)],
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

    if (node.type === "main-topic" || node.type === "header-pill") {
      const palette = node.colorTheme;
      const strokeColor = defaultStroke;
      const bgColor = palette?.fill ?? "#a5d8ff";
      const textColor = palette?.text ?? defaultText;

      const containerId = node.id;
      const hasText = Boolean(node.text && node.text.trim().length > 0);
      const titleTextId = `${node.id}_title`;
      const bodyTextId = `${node.id}_text`;

      // Main Topic Hub Rounded Box
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
        roundness: hasText ? { type: 2 } : { type: 3 }, // Rounded card if multiline, pill if single
        seed: nextSeed(),
        version: 1,
        versionNonce: nextSeed(),
        isDeleted: false,
        boundElements: getBoundElements(node.id),
      });

      if (!hasText) {
        // Centered Label Text (Single Line Pill)
        elements.push({
          id: titleTextId,
          type: "text",
          x: Math.round(node.x),
          y: Math.round(node.y + (node.height - 28) / 2),
          width: Math.round(node.width),
          height: 28,
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
        });
      } else {
        // Prominent Bold Header at Top
        elements.push({
          id: titleTextId,
          type: "text",
          x: Math.round(node.x + 20),
          y: Math.round(node.y + 14),
          width: Math.round(node.width - 40),
          height: 28,
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
          verticalAlign: "top",
        });

        // Overview / Subtitle Text Body
        elements.push({
          id: bodyTextId,
          type: "text",
          x: Math.round(node.x + 24),
          y: Math.round(node.y + 50),
          width: Math.round(node.width - 48),
          height: Math.max(20, Math.round(node.height - 58)),
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
          text: node.text ?? "",
          fontSize: 14,
          fontFamily: node.fontFamily,
          textAlign: "center",
          verticalAlign: "top",
        });
      }
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
    } else if (node.type === "concept-card") {
      const strokeColor = defaultStroke;
      const bgColor = node.cardStyle === "tinted" ? (node.colorTheme?.fill ?? defaultBg) : defaultBg;
      const textColor = defaultText;

      const containerId = node.id;
      const hasTitle = Boolean(node.title && node.title.trim().length > 0);
      const titleTextId = hasTitle ? `${node.id}_title` : undefined;
      const bodyTextId = `${node.id}_text`;

      // Concept Card Container Box
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
        strokeWidth: 1,
        strokeStyle: node.style || "solid",
        roughness: 0,
        opacity: 100,
        groupIds,
        roundness: { type: 3 },
        seed: nextSeed(),
        version: 1,
        versionNonce: nextSeed(),
        isDeleted: false,
        boundElements: getBoundElements(node.id, hasTitle ? undefined : bodyTextId),
      });

      if (hasTitle) {
        // Prominent Bold Term Header
        elements.push({
          id: titleTextId!,
          type: "text",
          x: Math.round(node.x + 14),
          y: Math.round(node.y + 10),
          width: Math.round(node.width - 28),
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
          text: node.title!,
          fontSize: 16,
          fontFamily: node.fontFamily,
          textAlign: "left",
          verticalAlign: "top",
        });

        // Formatted Body / Description Text
        elements.push({
          id: bodyTextId,
          type: "text",
          x: Math.round(node.x + 14),
          y: Math.round(node.y + 34),
          width: Math.round(node.width - 28),
          height: Math.max(20, Math.round(node.height - 40)),
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
          text: node.text ?? "",
          fontSize: node.fontSize || 14,
          fontFamily: node.fontFamily,
          textAlign: "left",
          verticalAlign: "top",
        });
      } else {
        // Description only card
        elements.push({
          id: bodyTextId,
          type: "text",
          x: Math.round(node.x + 16),
          y: Math.round(node.y + 12),
          width: Math.round(node.width - 32),
          height: Math.max(20, Math.round(node.height - 24)),
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
          text: node.text ?? "",
          fontSize: node.fontSize || 15,
          fontFamily: node.fontFamily,
          textAlign: "left",
          verticalAlign: "top",
        });
      }
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
    const conn = calculateConnectionPoints(source, target, edge, portFraction, layout.nodes);
    const strokeColor = defaultStroke;

    const arrowId = edge.id;
    const isSharp = edge.arrowType === "sharp";
    const isElbow = edge.arrowType === "elbow" || Boolean(edge.elbowed);
    const roundness = isSharp || isElbow ? null : { type: 2 };

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
      elbowed: isElbow,
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
