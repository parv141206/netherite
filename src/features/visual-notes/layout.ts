import {
  measureAsciiBlock,
  measureContainerBox,
  measureTextBlock,
  wrapText,
} from "./text-measure";
import { getPaletteForTopic } from "./palette";
import { SpaceManager } from "./space-manager";
import type {
  BoundingBox,
  LayoutCluster,
  LayoutEdge,
  LayoutNode,
  LayoutResult,
  SubtopicNode,
  TopicCluster,
  VisualNoteDoc,
  VisualNoteOptions,
} from "./types";

interface NodePlacementContext {
  clusterId: string;
  cx: number;
  cy: number;
  theme: "light" | "dark";
  palette: ReturnType<typeof getPaletteForTopic>;
  maxTextWidth: number;
  asciiPadding: number;
}

export function computeBoundingBox(nodes: LayoutNode[]): BoundingBox {
  if (nodes.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const node of nodes) {
    minX = Math.min(minX, node.x);
    minY = Math.min(minY, node.y);
    maxX = Math.max(maxX, node.x + node.width);
    maxY = Math.max(maxY, node.y + node.height);
  }

  return { minX, minY, maxX, maxY };
}

/**
 * Categorizes subtopics into 4 disjoint spatial sectors:
 * 1. flowSubtopic: has flow steps or ASCII diagram -> Bottom Sector
 * 2. topSubtopic: conceptual or ICMP diagnostics -> Top Sector
 * 3. rightSubtopic: sub-subtopics or rate adaptation -> Top-Right Sector
 * 4. leftSubs: remaining conceptual notes -> Left Sector (Upper & Lower)
 */
function categorizeSubtopics(subtopics: SubtopicNode[]): {
  bottomSub: SubtopicNode | null;
  topSub: SubtopicNode | null;
  rightSub: SubtopicNode | null;
  leftSubs: SubtopicNode[];
} {
  let bottomSub: SubtopicNode | null = null;
  let topSub: SubtopicNode | null = null;
  let rightSub: SubtopicNode | null = null;
  const leftSubs: SubtopicNode[] = [];
  const assigned = new Set<string>();

  // Priority 1: Bottom sector gets the subtopic with diagrams or flow steps
  for (const sub of subtopics) {
    const hasDiagram =
      sub.diagrams.length > 0 || sub.children.some((c) => c.diagrams.length > 0);
    const hasFlows = sub.children.some((c) => c.isFlowStep);

    if (hasDiagram || hasFlows || sub.positionHint === "bottom") {
      bottomSub = sub;
      assigned.add(sub.id);
      break;
    }
  }

  // Priority 2: Right sector gets subtopic with sub-subtopics (like AIMD or Architectural Comparison)
  for (const sub of subtopics) {
    if (assigned.has(sub.id)) continue;
    if (sub.children.length > 0 || sub.positionHint === "right") {
      rightSub = sub;
      assigned.add(sub.id);
      break;
    }
  }

  // Priority 3: Top sector
  for (const sub of subtopics) {
    if (assigned.has(sub.id)) continue;
    if (sub.positionHint === "top" || (!topSub && subtopics.length >= 4)) {
      topSub = sub;
      assigned.add(sub.id);
      break;
    }
  }

  // Priority 4: Left sector gets the rest (up to 2 subtopics)
  for (const sub of subtopics) {
    if (assigned.has(sub.id)) continue;
    leftSubs.push(sub);
    assigned.add(sub.id);
  }

  // If no right subtopic was assigned and we have spare left subtopics, promote one to right
  if (!rightSub && leftSubs.length > 2) {
    rightSub = leftSubs.pop()!;
  }

  return { bottomSub, topSub, rightSub, leftSubs };
}

/**
 * Lays out an entire topic cluster using disjoint 2D spatial sectors.
 * Guaranteed zero overlap between boxes, notes, flows, and diagrams.
 */
function layoutTopicCluster(
  topic: TopicCluster,
  clusterIndex: number,
  centerX: number,
  centerY: number,
  options: Required<VisualNoteOptions>,
): LayoutCluster {
  const palette = getPaletteForTopic(clusterIndex, topic.color, options.theme);
  const clusterId = topic.id;

  const nodes: LayoutNode[] = [];
  const edges: LayoutEdge[] = [];
  const space = new SpaceManager();

  function registerAndPlace(node: LayoutNode, padding = 20): void {
    if (space.collides(node, padding)) {
      const dirX = node.x >= centerX ? 1 : -1;
      const dirY = node.y >= centerY ? 1 : -1;
      const clearPos = space.findClearPosition(node, dirX, dirY, 15, 30, padding);
      node.x = clearPos.x;
      node.y = clearPos.y;
    }
    nodes.push(node);
    space.register({
      id: node.id,
      minX: node.x,
      minY: node.y,
      maxX: node.x + node.width,
      maxY: node.y + node.height,
      padding,
    });
  }

  const ctx: NodePlacementContext = {
    clusterId,
    cx: centerX,
    cy: centerY,
    theme: options.theme,
    palette,
    maxTextWidth: options.maxTextWidth,
    asciiPadding: options.asciiPadding,
  };

  // =========================================================================
  // 1. CENTER: Main Topic Box
  // =========================================================================
  const mainDim = measureContainerBox(topic.title, 22, 1, 32, 20, 240, 68);
  const mainNode: LayoutNode = {
    id: topic.id,
    type: "main-topic",
    title: topic.title,
    x: centerX - mainDim.width / 2,
    y: centerY - mainDim.height / 2,
    width: mainDim.width,
    height: mainDim.height,
    style: "solid",
    colorTheme: palette,
    fontFamily: 1,
    fontSize: 22,
    clusterId,
  };
  registerAndPlace(mainNode, 30);

  // Center note directly below main topic if specified
  if (topic.centerNotes.length > 0) {
    const noteText = wrapText(
      topic.centerNotes.map((n) => n.text).join("\n\n"),
      ctx.maxTextWidth,
      15,
      1,
    );
    const noteDim = measureTextBlock(noteText, 15, 1);
    const noteNode: LayoutNode = {
      id: `${topic.id}-note`,
      type: "note",
      text: noteText,
      x: centerX - noteDim.width / 2,
      y: mainNode.y + mainNode.height + 35,
      width: noteDim.width,
      height: noteDim.height,
      style: "solid",
      fontFamily: 1,
      fontSize: 15,
      clusterId,
    };
    registerAndPlace(noteNode, 20);

    edges.push({
      id: `edge-${topic.id}-${noteNode.id}`,
      sourceId: topic.id,
      targetId: noteNode.id,
      style: "dashed",
      arrowType: "sharp",
      exitSide: "bottom",
      entrySide: "top",
      clusterId,
      arrowhead: "arrow",
    });
  }

  // =========================================================================
  // 2. SECTOR ASSIGNMENT
  // =========================================================================
  const { bottomSub, topSub, rightSub, leftSubs } = categorizeSubtopics(topic.subtopics);

  // Clear corridor boundaries around main topic
  const centerLeftBoundary = centerX - Math.max(mainDim.width / 2, 180) - 80;
  const centerRightBoundary = centerX + Math.max(mainDim.width / 2, 180) + 80;

  // =========================================================================
  // 3. TOP SECTOR: Conceptual Subtopic & Notes (Laid out in y <= centerY - 140)
  // =========================================================================
  if (topSub) {
    const subDim = measureContainerBox(topSub.title, 17, 1, 24, 14, 180, 48);
    const subX = centerX - subDim.width / 2;
    const subY = centerY - Math.max(210, mainDim.height / 2 + 130);

    const subNode: LayoutNode = {
      id: topSub.id,
      type: "subtopic",
      title: topSub.title,
      x: subX,
      y: subY,
      width: subDim.width,
      height: subDim.height,
      style: topSub.style || "solid",
      colorTheme: palette,
      fontFamily: 1,
      fontSize: 17,
      clusterId,
      parentId: topic.id,
    };
    registerAndPlace(subNode, 20);

    // Straight vertical arrow from Main Topic to Top Subtopic
    edges.push({
      id: `edge-${topic.id}-${topSub.id}`,
      sourceId: topic.id,
      targetId: topSub.id,
      style: "solid",
      arrowType: "sharp",
      exitSide: "top",
      entrySide: "bottom",
      clusterId,
      arrowhead: "arrow",
    });

    if (topSub.children.length > 0) {
      // Has child sub-subtopic (like ICMP Diagnostic Operations)
      const child = topSub.children[0]!;
      const childDim = measureContainerBox(child.title, 15, 1, 20, 14, 190, 46);
      const childNode: LayoutNode = {
        id: child.id,
        type: "sub-subtopic",
        title: child.title,
        x: subNode.x + 20,
        y: subNode.y - childDim.height - 85,
        width: childDim.width,
        height: childDim.height,
        style: "dashed",
        colorTheme: palette,
        fontFamily: 1,
        fontSize: 15,
        clusterId,
        parentId: topSub.id,
      };
      registerAndPlace(childNode, 20);

      edges.push({
        id: `edge-${topSub.id}-${child.id}`,
        sourceId: topSub.id,
        targetId: child.id,
        style: "solid",
        arrowType: "curved",
        exitSide: "top",
        entrySide: "bottom",
        clusterId,
        arrowhead: "arrow",
      });

      // Branching notes cleanly divided into non-overlapping Y intervals
      const noteCount = child.notes.length;
      const branchX = Math.max(
        childNode.x + childDim.width + 60,
        subNode.x + subDim.width + 60,
      );

      for (let j = 0; j < noteCount; j++) {
        const item = child.notes[j]!;
        const wrapped = wrapText(item.text, ctx.maxTextWidth, 14, 1);
        const noteDim = measureTextBlock(wrapped, 14, 1);

        let branchY = childNode.y;
        if (noteCount === 1) {
          branchY = childNode.y - 10;
        } else if (j === 0) {
          branchY = childNode.y - noteDim.height - 25;
        } else {
          branchY = childNode.y + 10;
        }

        const noteNode: LayoutNode = {
          id: `${child.id}-note-${j}`,
          type: "note",
          text: wrapped,
          x: branchX,
          y: branchY,
          width: noteDim.width,
          height: noteDim.height,
          style: "solid",
          fontFamily: 1,
          fontSize: 14,
          clusterId,
          parentId: child.id,
        };
        registerAndPlace(noteNode, 8);

        edges.push({
          id: `edge-${child.id}-${noteNode.id}`,
          sourceId: child.id,
          targetId: noteNode.id,
          style: "dashed",
          arrowType: "curved",
          exitSide: "right",
          entrySide: "left",
          clusterId,
          arrowhead: "arrow",
        });
      }
    } else if (topSub.notes.length > 0) {
      // Simple direct note above top subtopic
      const noteText = wrapText(
        topSub.notes.map((n) => n.text).join("\n\n"),
        ctx.maxTextWidth,
        14,
        1,
      );
      const noteDim = measureTextBlock(noteText, 14, 1);
      const noteNode: LayoutNode = {
        id: `${topSub.id}-note`,
        type: "note",
        text: noteText,
        x: centerX - noteDim.width / 2,
        y: subNode.y - noteDim.height - 35,
        width: noteDim.width,
        height: noteDim.height,
        style: "solid",
        fontFamily: 1,
        fontSize: 14,
        clusterId,
        parentId: topSub.id,
      };
      registerAndPlace(noteNode, 16);

      edges.push({
        id: `edge-${topSub.id}-${noteNode.id}`,
        sourceId: topSub.id,
        targetId: noteNode.id,
        style: "dashed",
        arrowType: "sharp",
        exitSide: "top",
        entrySide: "bottom",
        clusterId,
        arrowhead: "arrow",
      });
    }
  }

  // =========================================================================
  // 4. TOP-RIGHT SECTOR: Sub-subtopics & Branching Notes
  // =========================================================================
  if (rightSub) {
    const subDim = measureContainerBox(rightSub.title, 17, 1, 24, 14, 180, 48);
    const subX = Math.max(centerRightBoundary, centerX + 380);
    const subY = centerY - 20;

    const subNode: LayoutNode = {
      id: rightSub.id,
      type: "subtopic",
      title: rightSub.title,
      x: subX,
      y: subY,
      width: subDim.width,
      height: subDim.height,
      style: rightSub.style || "solid",
      colorTheme: palette,
      fontFamily: 1,
      fontSize: 17,
      clusterId,
      parentId: topic.id,
    };
    registerAndPlace(subNode, 20);

    // Main Topic to Right Subtopic
    edges.push({
      id: `edge-${topic.id}-${rightSub.id}`,
      sourceId: topic.id,
      targetId: rightSub.id,
      style: "solid",
      arrowType: "sharp",
      exitSide: "right",
      entrySide: "left",
      clusterId,
      arrowhead: "arrow",
    });

    // Direct note for Right Subtopic placed directly below subNode
    if (rightSub.notes.length > 0) {
      const noteText = wrapText(
        rightSub.notes.map((n) => n.text).join("\n\n"),
        ctx.maxTextWidth,
        14,
        1,
      );
      const noteDim = measureTextBlock(noteText, 14, 1);
      const noteNode: LayoutNode = {
        id: `${rightSub.id}-note`,
        type: "note",
        text: noteText,
        x: subNode.x + 10,
        y: subNode.y + subDim.height + 25,
        width: noteDim.width,
        height: noteDim.height,
        style: "solid",
        fontFamily: 1,
        fontSize: 14,
        clusterId,
        parentId: rightSub.id,
      };
      registerAndPlace(noteNode, 16);

      edges.push({
        id: `edge-${rightSub.id}-${noteNode.id}`,
        sourceId: rightSub.id,
        targetId: noteNode.id,
        style: "dashed",
        arrowType: "sharp",
        exitSide: "bottom",
        entrySide: "top",
        clusterId,
        arrowhead: "arrow",
      });
    }

    // Sub-subtopic (positioned ABOVE Right Subtopic, branching notes strictly to the right)
    if (rightSub.children.length > 0) {
      const child = rightSub.children[0]!;
      const childDim = measureContainerBox(child.title, 15, 1, 20, 14, 190, 46);
      const childNode: LayoutNode = {
        id: child.id,
        type: "sub-subtopic",
        title: child.title,
        x: subNode.x + 20,
        y: subNode.y - childDim.height - 85,
        width: childDim.width,
        height: childDim.height,
        style: "dashed",
        colorTheme: palette,
        fontFamily: 1,
        fontSize: 15,
        clusterId,
        parentId: rightSub.id,
      };
      registerAndPlace(childNode, 20);

      edges.push({
        id: `edge-${rightSub.id}-${child.id}`,
        sourceId: rightSub.id,
        targetId: child.id,
        style: "solid",
        arrowType: "curved",
        exitSide: "top",
        entrySide: "bottom",
        clusterId,
        arrowhead: "arrow",
      });

      // Branching notes cleanly divided into non-overlapping Y intervals
      const noteCount = child.notes.length;
      const rightSubNotesMaxX =
        rightSub.notes.length > 0
          ? subNode.x +
            10 +
            measureTextBlock(
              wrapText(
                rightSub.notes.map((n) => n.text).join("\n\n"),
                ctx.maxTextWidth,
                14,
                1,
              ),
              14,
              1,
            ).width
          : subNode.x + subDim.width;

      const branchX = Math.max(
        childNode.x + childDim.width + 60,
        subNode.x + subDim.width + 60,
        rightSubNotesMaxX + 50,
      );

      for (let j = 0; j < noteCount; j++) {
        const item = child.notes[j]!;
        const wrapped = wrapText(item.text, ctx.maxTextWidth, 14, 1);
        const noteDim = measureTextBlock(wrapped, 14, 1);

        let branchY = childNode.y;
        if (noteCount === 1) {
          branchY = childNode.y - 10;
        } else if (j === 0) {
          branchY = childNode.y - noteDim.height - 25;
        } else {
          branchY = childNode.y + 10;
        }

        const noteNode: LayoutNode = {
          id: `${child.id}-note-${j}`,
          type: "note",
          text: wrapped,
          x: branchX,
          y: branchY,
          width: noteDim.width,
          height: noteDim.height,
          style: "solid",
          fontFamily: 1,
          fontSize: 14,
          clusterId,
          parentId: child.id,
        };
        registerAndPlace(noteNode, 8);

        edges.push({
          id: `edge-${child.id}-${noteNode.id}`,
          sourceId: child.id,
          targetId: noteNode.id,
          style: "dashed",
          arrowType: "curved",
          exitSide: "right",
          entrySide: "left",
          clusterId,
          arrowhead: "arrow",
        });
      }
    }
  }

  // =========================================================================
  // 5. LEFT SECTOR: Up to 2 Subtopics Strictly in y in [centerY - 140, centerY + 80]
  // =========================================================================
  if (leftSubs.length === 1) {
    const sub = leftSubs[0]!;
    const subDim = measureContainerBox(sub.title, 17, 1, 24, 14, 180, 48);
    const subX = centerLeftBoundary - subDim.width;
    const subY = centerY - subDim.height / 2;

    const subNode: LayoutNode = {
      id: sub.id,
      type: "subtopic",
      title: sub.title,
      x: subX,
      y: subY,
      width: subDim.width,
      height: subDim.height,
      style: sub.style || "solid",
      colorTheme: palette,
      fontFamily: 1,
      fontSize: 17,
      clusterId,
      parentId: topic.id,
    };
    registerAndPlace(subNode, 20);

    // Straight horizontal arrow from Main Topic to Left Subtopic
    edges.push({
      id: `edge-${topic.id}-${sub.id}`,
      sourceId: topic.id,
      targetId: sub.id,
      style: "solid",
      arrowType: "sharp",
      exitSide: "left",
      entrySide: "right",
      clusterId,
      arrowhead: "arrow",
    });

    if (sub.notes.length > 0) {
      const noteText = wrapText(sub.notes.map((n) => n.text).join("\n\n"), ctx.maxTextWidth, 14, 1);
      const noteDim = measureTextBlock(noteText, 14, 1);
      const noteNode: LayoutNode = {
        id: `${sub.id}-note`,
        type: "note",
        text: noteText,
        x: subNode.x - noteDim.width - 50,
        y: subNode.y - 10,
        width: noteDim.width,
        height: noteDim.height,
        style: "solid",
        fontFamily: 1,
        fontSize: 14,
        clusterId,
        parentId: sub.id,
      };
      registerAndPlace(noteNode, 16);

      edges.push({
        id: `edge-${sub.id}-${noteNode.id}`,
        sourceId: sub.id,
        targetId: noteNode.id,
        style: "dashed",
        arrowType: "sharp",
        exitSide: "left",
        entrySide: "right",
        clusterId,
        arrowhead: "arrow",
      });
    }
  } else if (leftSubs.length >= 2) {
    // Upper Left Subtopic: strictly above centerY
    const sub0 = leftSubs[0]!;
    const dim0 = measureContainerBox(sub0.title, 17, 1, 24, 14, 180, 48);
    const sub0Node: LayoutNode = {
      id: sub0.id,
      type: "subtopic",
      title: sub0.title,
      x: centerLeftBoundary - dim0.width,
      y: centerY - 90 - dim0.height,
      width: dim0.width,
      height: dim0.height,
      style: sub0.style || "solid",
      colorTheme: palette,
      fontFamily: 1,
      fontSize: 17,
      clusterId,
      parentId: topic.id,
    };

    // Lower Left Subtopic: strictly bounded at y <= centerY + 80 (safe from bottom sector!)
    const sub1 = leftSubs[1]!;
    const dim1 = measureContainerBox(sub1.title, 17, 1, 24, 14, 180, 48);
    const sub1Node: LayoutNode = {
      id: sub1.id,
      type: "subtopic",
      title: sub1.title,
      x: centerLeftBoundary - dim1.width,
      y: centerY + 30,
      width: dim1.width,
      height: dim1.height,
      style: sub1.style || "solid",
      colorTheme: palette,
      fontFamily: 1,
      fontSize: 17,
      clusterId,
      parentId: topic.id,
    };
    registerAndPlace(sub0Node, 20);
    registerAndPlace(sub1Node, 20);

    // Divergent arrows from Main Topic (distinct upper and lower exit ports)
    edges.push({
      id: `edge-${topic.id}-${sub0.id}`,
      sourceId: topic.id,
      targetId: sub0.id,
      style: "solid",
      arrowType: "curved",
      exitSide: "left",
      entrySide: "right",
      clusterId,
      arrowhead: "arrow",
    });
    edges.push({
      id: `edge-${topic.id}-${sub1.id}`,
      sourceId: topic.id,
      targetId: sub1.id,
      style: "solid",
      arrowType: "curved",
      exitSide: "left",
      entrySide: "right",
      clusterId,
      arrowhead: "arrow",
    });

    // Notes for Upper Left
    if (sub0.notes.length > 0) {
      const t0 = wrapText(sub0.notes.map((n) => n.text).join("\n\n"), ctx.maxTextWidth, 14, 1);
      const d0 = measureTextBlock(t0, 14, 1);
      const n0: LayoutNode = {
        id: `${sub0.id}-note`,
        type: "note",
        text: t0,
        x: sub0Node.x - d0.width - 50,
        y: sub0Node.y - 15,
        width: d0.width,
        height: d0.height,
        style: "solid",
        fontFamily: 1,
        fontSize: 14,
        clusterId,
        parentId: sub0.id,
      };
      registerAndPlace(n0, 16);
      edges.push({
        id: `edge-${sub0.id}-${n0.id}`,
        sourceId: sub0.id,
        targetId: n0.id,
        style: "dashed",
        arrowType: "sharp",
        exitSide: "left",
        entrySide: "right",
        clusterId,
        arrowhead: "arrow",
      });
    }

    // Notes for Lower Left
    if (sub1.notes.length > 0) {
      const t1 = wrapText(sub1.notes.map((n) => n.text).join("\n\n"), ctx.maxTextWidth, 14, 1);
      const d1 = measureTextBlock(t1, 14, 1);
      const n1: LayoutNode = {
        id: `${sub1.id}-note`,
        type: "note",
        text: t1,
        x: sub1Node.x - d1.width - 50,
        y: sub1Node.y - 15,
        width: d1.width,
        height: d1.height,
        style: "solid",
        fontFamily: 1,
        fontSize: 14,
        clusterId,
        parentId: sub1.id,
      };
      registerAndPlace(n1, 16);
      edges.push({
        id: `edge-${sub1.id}-${n1.id}`,
        sourceId: sub1.id,
        targetId: n1.id,
        style: "dashed",
        arrowType: "sharp",
        exitSide: "left",
        entrySide: "right",
        clusterId,
        arrowhead: "arrow",
      });
    }
  }

  // =========================================================================
  // 6. BOTTOM SECTOR: Flow Subtopic -> Note -> Horizontal Flows -> Diagram
  // Placed LAST so ASCII diagram position dynamically clears ALL right-sector nodes!
  // =========================================================================
  if (bottomSub) {
    const subDim = measureContainerBox(bottomSub.title, 17, 1, 24, 14, 180, 48);
    const subY = centerY + Math.max(190, mainDim.height / 2 + 110);
    const subX = centerX - subDim.width / 2;

    const subNode: LayoutNode = {
      id: bottomSub.id,
      type: "subtopic",
      title: bottomSub.title,
      x: subX,
      y: subY,
      width: subDim.width,
      height: subDim.height,
      style: bottomSub.style || "solid",
      colorTheme: palette,
      fontFamily: 1,
      fontSize: 17,
      clusterId,
      parentId: topic.id,
    };
    registerAndPlace(subNode, 24);

    // Straight vertical arrow from Main Topic to Bottom Subtopic
    edges.push({
      id: `edge-${topic.id}-${bottomSub.id}`,
      sourceId: topic.id,
      targetId: bottomSub.id,
      style: "solid",
      arrowType: "sharp",
      exitSide: "bottom",
      entrySide: "top",
      clusterId,
      arrowhead: "arrow",
    });

    const hasFlowSteps = bottomSub.children.length > 0;

    if (hasFlowSteps) {
      // Flow Steps placed directly below subNode
      const flowY = subNode.y + subNode.height + 70;
      const children = bottomSub.children;
      const count = children.length;

      if (count === 2) {
        const c0 = children[0]!;
        const c1 = children[1]!;
        const dim0 = measureContainerBox(c0.title, 15, 1, 20, 14, 230, 48);
        const dim1 = measureContainerBox(c1.title, 15, 1, 20, 14, 230, 48);
        const flowGap = 80;

        const x0 = centerX - dim0.width - flowGap / 2;
        const x1 = centerX + flowGap / 2;

        const flowNode0: LayoutNode = {
          id: c0.id,
          type: "flow-step",
          title: c0.title,
          x: x0,
          y: flowY,
          width: dim0.width,
          height: dim0.height,
          style: "dashed",
          colorTheme: palette,
          fontFamily: 1,
          fontSize: 15,
          clusterId,
          parentId: bottomSub.id,
        };
        const flowNode1: LayoutNode = {
          id: c1.id,
          type: "flow-step",
          title: c1.title,
          x: x1,
          y: flowY,
          width: dim1.width,
          height: dim1.height,
          style: "dashed",
          colorTheme: palette,
          fontFamily: 1,
          fontSize: 15,
          clusterId,
          parentId: bottomSub.id,
        };
        registerAndPlace(flowNode0, 20);
        registerAndPlace(flowNode1, 20);

        // Subtopic explanatory note placed to the LEFT of flowNode0 (strictly outside arrow channels)
        if (bottomSub.notes.length > 0) {
          const noteText = wrapText(
            bottomSub.notes.map((n) => n.text).join("\n\n"),
            280,
            14,
            1,
          );
          const noteDim = measureTextBlock(noteText, 14, 1);
          const noteNode: LayoutNode = {
            id: `${bottomSub.id}-note`,
            type: "note",
            text: noteText,
            x: x0 - noteDim.width - 60,
            y: flowY,
            width: noteDim.width,
            height: noteDim.height,
            style: "solid",
            fontFamily: 1,
            fontSize: 14,
            clusterId,
            parentId: bottomSub.id,
          };
          registerAndPlace(noteNode, 16);

          edges.push({
            id: `edge-${bottomSub.id}-${noteNode.id}`,
            sourceId: bottomSub.id,
            targetId: noteNode.id,
            style: "dashed",
            arrowType: "curved",
            exitSide: "left",
            entrySide: "top",
            clusterId,
            arrowhead: "arrow",
          });
        }

        // Divergent forking arrows from parent to flow steps
        edges.push({
          id: `edge-${bottomSub.id}-${c0.id}`,
          sourceId: bottomSub.id,
          targetId: c0.id,
          style: "solid",
          arrowType: "curved",
          exitSide: "bottom",
          entrySide: "top",
          clusterId,
          arrowhead: "arrow",
        });
        edges.push({
          id: `edge-${bottomSub.id}-${c1.id}`,
          sourceId: bottomSub.id,
          targetId: c1.id,
          style: "solid",
          arrowType: "curved",
          exitSide: "bottom",
          entrySide: "top",
          clusterId,
          arrowhead: "arrow",
        });

        // Notes under flow steps
        if (c0.notes.length > 0) {
          const t0 = wrapText(c0.notes.map((n) => n.text).join("\n\n"), ctx.maxTextWidth, 14, 1);
          const d0 = measureTextBlock(t0, 14, 1);
          const n0: LayoutNode = {
            id: `${c0.id}-note`,
            type: "note",
            text: t0,
            x: x0 + (dim0.width - d0.width) / 2,
            y: flowY + dim0.height + 28,
            width: d0.width,
            height: d0.height,
            style: "solid",
            fontFamily: 1,
            fontSize: 14,
            clusterId,
            parentId: c0.id,
          };
          registerAndPlace(n0, 16);
          edges.push({
            id: `edge-${c0.id}-${n0.id}`,
            sourceId: c0.id,
            targetId: n0.id,
            style: "dashed",
            arrowType: "sharp",
            exitSide: "bottom",
            entrySide: "top",
            clusterId,
            arrowhead: "arrow",
          });
        }

        if (c1.notes.length > 0) {
          const t1 = wrapText(c1.notes.map((n) => n.text).join("\n\n"), ctx.maxTextWidth, 14, 1);
          const d1 = measureTextBlock(t1, 14, 1);
          const n1: LayoutNode = {
            id: `${c1.id}-note`,
            type: "note",
            text: t1,
            x: x1 + (dim1.width - d1.width) / 2,
            y: flowY + dim1.height + 28,
            width: d1.width,
            height: d1.height,
            style: "solid",
            fontFamily: 1,
            fontSize: 14,
            clusterId,
            parentId: c1.id,
          };
          registerAndPlace(n1, 16);
          edges.push({
            id: `edge-${c1.id}-${n1.id}`,
            sourceId: c1.id,
            targetId: n1.id,
            style: "dashed",
            arrowType: "sharp",
            exitSide: "bottom",
            entrySide: "top",
            clusterId,
            arrowhead: "arrow",
          });
        }

        // ASCII Diagram attached to Flow 1 (Right flank)
        // Dynamically clear ANY node in the right sector!
        const diag = c1.diagrams[0] || c0.diagrams[0] || bottomSub.diagrams[0];
        if (diag) {
          const rightSectorBottom = Math.max(
            ...nodes.filter((n) => n.x >= centerX + 150).map((n) => n.y + n.height),
            centerY,
          );
          const diagY = Math.max(flowY - 20, rightSectorBottom + 40);

          const diagDim = measureAsciiBlock(diag.code, 13, 16);
          const diagNode: LayoutNode = {
            id: diag.id,
            type: "ascii-diagram",
            text: diag.code,
            x: Math.max(x1 + dim1.width + 100, centerX + 560),
            y: diagY,
            width: diagDim.width,
            height: diagDim.height,
            style: "dashed",
            fontFamily: 3,
            fontSize: 13,
            clusterId,
            parentId: c1.id,
          };
          registerAndPlace(diagNode, 24);

          edges.push({
            id: `edge-${c1.id}-${diag.id}`,
            sourceId: c1.id,
            targetId: diag.id,
            label: diag.label || "diagram for it",
            style: "dashed",
            arrowType: "elbow",
            exitSide: "right",
            entrySide: "left",
            clusterId,
            arrowhead: "arrow",
          });
        }
      } else {
        // Single flow step
        for (let k = 0; k < count; k++) {
          const c = children[k]!;
          const dim = measureContainerBox(c.title, 15, 1, 20, 14, 230, 48);
          const flowNode: LayoutNode = {
            id: c.id,
            type: "flow-step",
            title: c.title,
            x: centerX - dim.width / 2,
            y: flowY + k * 80,
            width: dim.width,
            height: dim.height,
            style: "dashed",
            colorTheme: palette,
            fontFamily: 1,
            fontSize: 15,
            clusterId,
            parentId: bottomSub.id,
          };
          registerAndPlace(flowNode, 20);
          edges.push({
            id: `edge-${bottomSub.id}-${c.id}`,
            sourceId: bottomSub.id,
            targetId: c.id,
            style: "solid",
            arrowType: "sharp",
            exitSide: "bottom",
            entrySide: "top",
            clusterId,
            arrowhead: "arrow",
          });
        }
      }
    } else {
      // Subtopic has NO flow steps: direct note placed directly below subtopic
      if (bottomSub.notes.length > 0) {
        const noteText = wrapText(
          bottomSub.notes.map((n) => n.text).join("\n\n"),
          ctx.maxTextWidth,
          14,
          1,
        );
        const noteDim = measureTextBlock(noteText, 14, 1);
        const noteNode: LayoutNode = {
          id: `${bottomSub.id}-note`,
          type: "note",
          text: noteText,
          x: centerX - noteDim.width / 2,
          y: subNode.y + subNode.height + 35,
          width: noteDim.width,
          height: noteDim.height,
          style: "solid",
          fontFamily: 1,
          fontSize: 14,
          clusterId,
          parentId: bottomSub.id,
        };
        registerAndPlace(noteNode, 16);

        edges.push({
          id: `edge-${bottomSub.id}-${noteNode.id}`,
          sourceId: bottomSub.id,
          targetId: noteNode.id,
          style: "dashed",
          arrowType: "sharp",
          exitSide: "bottom",
          entrySide: "top",
          clusterId,
          arrowhead: "arrow",
        });
      }

      // ASCII Diagram directly attached to subtopic (Right flank)
      if (bottomSub.diagrams.length > 0) {
        const diag = bottomSub.diagrams[0]!;
        const rightSectorBottom = Math.max(
          ...nodes
            .filter((n) => n.x >= centerX + 150 && n.id !== subNode.id)
            .map((n) => n.y + n.height),
          centerY,
        );
        const diagY = Math.max(subNode.y - 20, rightSectorBottom + 40);

        const diagDim = measureAsciiBlock(diag.code, 13, 16);
        const diagNode: LayoutNode = {
          id: diag.id,
          type: "ascii-diagram",
          text: diag.code,
          x: Math.max(subNode.x + subDim.width + 100, centerX + 560),
          y: diagY,
          width: diagDim.width,
          height: diagDim.height,
          style: "dashed",
          fontFamily: 3,
          fontSize: 13,
          clusterId,
          parentId: subNode.id,
        };
        registerAndPlace(diagNode, 24);

        edges.push({
          id: `edge-${subNode.id}-${diag.id}`,
          sourceId: subNode.id,
          targetId: diag.id,
          label: diag.label || "diagram for it",
          style: "dashed",
          arrowType: "elbow",
          exitSide: "right",
          entrySide: "left",
          clusterId,
          arrowhead: "arrow",
        });
      }
    }
  }

  const bounds = computeBoundingBox(nodes);
  return {
    id: clusterId,
    bounds,
    nodes,
    edges,
  };
}

/**
 * Main Layout Engine Entry Point.
 * Converts markdown AST into fully laid-out 2D coordinates.
 * Stacks multiple topics vertically with generous separation.
 */
export function layoutVisualNotes(
  doc: VisualNoteDoc,
  rawOptions?: VisualNoteOptions,
): LayoutResult {
  const options: Required<VisualNoteOptions> = {
    theme: rawOptions?.theme ?? "light",
    clusterGap: rawOptions?.clusterGap ?? 300,
    roughness: rawOptions?.roughness ?? 1,
    defaultFontFamily: rawOptions?.defaultFontFamily ?? 1,
    maxTextWidth: rawOptions?.maxTextWidth ?? 320,
    asciiPadding: rawOptions?.asciiPadding ?? 16,
  };

  const clusters: LayoutCluster[] = [];
  const allNodes: LayoutNode[] = [];
  const allEdges: LayoutEdge[] = [];

  let currentCenterY = 0;
  const centerX = 0;

  for (let c = 0; c < doc.topics.length; c++) {
    const topic = doc.topics[c]!;

    const cluster = layoutTopicCluster(topic, c, centerX, currentCenterY, options);

    if (clusters.length > 0) {
      const prevCluster = clusters[clusters.length - 1]!;
      const requiredTop = prevCluster.bounds.maxY + options.clusterGap;

      if (cluster.bounds.minY < requiredTop) {
        const deltaY = requiredTop - cluster.bounds.minY;
        for (const n of cluster.nodes) {
          n.y += deltaY;
        }
        cluster.bounds = computeBoundingBox(cluster.nodes);
        currentCenterY += deltaY;
      }
    }

    clusters.push(cluster);
    allNodes.push(...cluster.nodes);
    allEdges.push(...cluster.edges);

    currentCenterY = cluster.bounds.maxY + options.clusterGap + 350;
  }

  const overallBounds = computeBoundingBox(allNodes);

  return {
    clusters,
    nodes: allNodes,
    edges: allEdges,
    bounds: overallBounds,
  };
}
