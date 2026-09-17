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
  DiagramBlock,
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
  const palette = getPaletteForTopic(clusterIndex, topic.color, "light");
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

  // =========================================================================
  // 2. SECTOR ASSIGNMENT & CORRIDOR BOUNDARIES
  // =========================================================================
  const { bottomSub, topSub, rightSub, leftSubs } = categorizeSubtopics(topic.subtopics);

  // Clear corridor boundaries around main topic
  const centerLeftBoundary = centerX - Math.max(mainDim.width / 2, 180) - 80;
  const centerRightBoundary = centerX + Math.max(mainDim.width / 2, 180) + 80;

  // =========================================================================
  // 2.5 TOPIC-LEVEL CENTER / METADATA NOTES
  // =========================================================================
  if (topic.centerNotes.length > 0) {
    const noteText = wrapText(
      topic.centerNotes.map((n) => n.text).join("\n\n"),
      ctx.maxTextWidth,
      15,
      1,
    );
    const noteDim = measureTextBlock(noteText, 15, 1);

    let noteX: number;
    let noteY: number;
    let exitSide: "left" | "right" | "top" | "bottom";
    let entrySide: "left" | "right" | "top" | "bottom";

    if (!bottomSub) {
      // If no bottom subtopic, center corridor below main topic is completely free
      noteX = centerX - noteDim.width / 2;
      noteY = mainNode.y + mainNode.height + 35;
      exitSide = "bottom";
      entrySide = "top";
    } else if (!rightSub) {
      // If bottom subtopic exists but right flank is free, place on right flank
      noteX = mainNode.x + mainNode.width + 45;
      noteY = mainNode.y + 4;
      exitSide = "right";
      entrySide = "left";
    } else if (leftSubs.length < 2) {
      // If right is occupied but left flank has room
      noteX = mainNode.x - noteDim.width - 45;
      noteY = mainNode.y + 4;
      exitSide = "left";
      entrySide = "right";
    } else {
      // Both left and right have subtopics: place in bottom-right diagonal quadrant
      // strictly offset from the central corridor [centerX - 80, centerX + 80]
      noteX = centerX + Math.max(mainDim.width / 2, 160) + 30;
      noteY = mainNode.y + mainNode.height + 30;
      exitSide = "bottom";
      entrySide = "top";
    }

    const noteNode: LayoutNode = {
      id: `${topic.id}-note`,
      type: "note",
      text: noteText,
      x: noteX,
      y: noteY,
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
      exitSide,
      entrySide,
      clusterId,
      arrowhead: "arrow",
    });
  }

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

      if (noteCount === 1) {
        const item = child.notes[0]!;
        const wrapped = wrapText(item.text, ctx.maxTextWidth, 14, 1);
        const noteDim = measureTextBlock(wrapped, 14, 1);
        const noteNode: LayoutNode = {
          id: `${child.id}-note`,
          type: "note",
          text: wrapped,
          x: branchX,
          y: childNode.y + (childDim.height - noteDim.height) / 2,
          width: noteDim.width,
          height: noteDim.height,
          style: "solid",
          fontFamily: 1,
          fontSize: 14,
          clusterId,
          parentId: child.id,
        };
        registerAndPlace(noteNode, 16);
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
      } else if (noteCount === 2) {
        // Two distinct branching concepts: one above, one below
        const item0 = child.notes[0]!;
        const item1 = child.notes[1]!;
        const wrapped0 = wrapText(item0.text, ctx.maxTextWidth, 14, 1);
        const wrapped1 = wrapText(item1.text, ctx.maxTextWidth, 14, 1);
        const dim0 = measureTextBlock(wrapped0, 14, 1);
        const dim1 = measureTextBlock(wrapped1, 14, 1);

        const note0: LayoutNode = {
          id: `${child.id}-note-0`,
          type: "note",
          text: wrapped0,
          x: branchX,
          y: childNode.y - dim0.height - 20,
          width: dim0.width,
          height: dim0.height,
          style: "solid",
          fontFamily: 1,
          fontSize: 14,
          clusterId,
          parentId: child.id,
        };
        const note1: LayoutNode = {
          id: `${child.id}-note-1`,
          type: "note",
          text: wrapped1,
          x: branchX,
          y: childNode.y + childDim.height + 20,
          width: dim1.width,
          height: dim1.height,
          style: "solid",
          fontFamily: 1,
          fontSize: 14,
          clusterId,
          parentId: child.id,
        };
        registerAndPlace(note0, 12);
        registerAndPlace(note1, 12);
        edges.push({
          id: `edge-${child.id}-${note0.id}`,
          sourceId: child.id,
          targetId: note0.id,
          style: "dashed",
          arrowType: "curved",
          exitSide: "right",
          entrySide: "left",
          clusterId,
          arrowhead: "arrow",
        });
        edges.push({
          id: `edge-${child.id}-${note1.id}`,
          sourceId: child.id,
          targetId: note1.id,
          style: "dashed",
          arrowType: "curved",
          exitSide: "right",
          entrySide: "left",
          clusterId,
          arrowhead: "arrow",
        });
      } else if (noteCount > 2) {
        // Consolidate bulleted / long list of notes into one unified, structured note card
        const formatted = child.notes
          .map((n) => (n.isBullet && !n.text.startsWith("•") ? `• ${n.text}` : n.text))
          .join("\n\n");
        const wrapped = wrapText(formatted, Math.max(ctx.maxTextWidth, 340), 14, 1);
        const noteDim = measureTextBlock(wrapped, 14, 1);

        const noteNode: LayoutNode = {
          id: `${child.id}-note`,
          type: "note",
          text: wrapped,
          x: branchX,
          y: childNode.y + (childDim.height - noteDim.height) / 2,
          width: noteDim.width,
          height: noteDim.height,
          style: "solid",
          fontFamily: 1,
          fontSize: 14,
          clusterId,
          parentId: child.id,
        };
        registerAndPlace(noteNode, 16);
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

      if (noteCount === 1) {
        const item = child.notes[0]!;
        const wrapped = wrapText(item.text, ctx.maxTextWidth, 14, 1);
        const noteDim = measureTextBlock(wrapped, 14, 1);
        const noteNode: LayoutNode = {
          id: `${child.id}-note`,
          type: "note",
          text: wrapped,
          x: branchX,
          y: childNode.y + (childDim.height - noteDim.height) / 2,
          width: noteDim.width,
          height: noteDim.height,
          style: "solid",
          fontFamily: 1,
          fontSize: 14,
          clusterId,
          parentId: child.id,
        };
        registerAndPlace(noteNode, 16);
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
      } else if (noteCount === 2) {
        // Two distinct branching concepts: one above, one below
        const item0 = child.notes[0]!;
        const item1 = child.notes[1]!;
        const wrapped0 = wrapText(item0.text, ctx.maxTextWidth, 14, 1);
        const wrapped1 = wrapText(item1.text, ctx.maxTextWidth, 14, 1);
        const dim0 = measureTextBlock(wrapped0, 14, 1);
        const dim1 = measureTextBlock(wrapped1, 14, 1);

        const note0: LayoutNode = {
          id: `${child.id}-note-0`,
          type: "note",
          text: wrapped0,
          x: branchX,
          y: childNode.y - dim0.height - 20,
          width: dim0.width,
          height: dim0.height,
          style: "solid",
          fontFamily: 1,
          fontSize: 14,
          clusterId,
          parentId: child.id,
        };
        const note1: LayoutNode = {
          id: `${child.id}-note-1`,
          type: "note",
          text: wrapped1,
          x: branchX,
          y: childNode.y + childDim.height + 20,
          width: dim1.width,
          height: dim1.height,
          style: "solid",
          fontFamily: 1,
          fontSize: 14,
          clusterId,
          parentId: child.id,
        };
        registerAndPlace(note0, 12);
        registerAndPlace(note1, 12);
        edges.push({
          id: `edge-${child.id}-${note0.id}`,
          sourceId: child.id,
          targetId: note0.id,
          style: "dashed",
          arrowType: "curved",
          exitSide: "right",
          entrySide: "left",
          clusterId,
          arrowhead: "arrow",
        });
        edges.push({
          id: `edge-${child.id}-${note1.id}`,
          sourceId: child.id,
          targetId: note1.id,
          style: "dashed",
          arrowType: "curved",
          exitSide: "right",
          entrySide: "left",
          clusterId,
          arrowhead: "arrow",
        });
      } else if (noteCount > 2) {
        // Consolidate bulleted / long list of notes into one unified, structured note card
        const formatted = child.notes
          .map((n) => (n.isBullet && !n.text.startsWith("•") ? `• ${n.text}` : n.text))
          .join("\n\n");
        const wrapped = wrapText(formatted, Math.max(ctx.maxTextWidth, 340), 14, 1);
        const noteDim = measureTextBlock(wrapped, 14, 1);

        const noteNode: LayoutNode = {
          id: `${child.id}-note`,
          type: "note",
          text: wrapped,
          x: branchX,
          y: childNode.y + (childDim.height - noteDim.height) / 2,
          width: noteDim.width,
          height: noteDim.height,
          style: "solid",
          fontFamily: 1,
          fontSize: 14,
          clusterId,
          parentId: child.id,
        };
        registerAndPlace(noteNode, 16);
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
 * Resolves overlapping bounding boxes iteratively using rigid-body separation.
 * Pushes intersecting nodes apart along the minimum penetration axis while preserving
 * generous breathing room (padding) around every node.
 */
export function resolveCollisionsPhysics(
  nodes: LayoutNode[],
  padding = 45,
  maxIterations = 60,
): void {
  for (let iter = 0; iter < maxIterations; iter++) {
    let hadCollision = false;

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i]!;
        const b = nodes[j]!;

        const acx = a.x + a.width / 2;
        const acy = a.y + a.height / 2;
        const bcx = b.x + b.width / 2;
        const bcy = b.y + b.height / 2;

        const reqDistX = (a.width + b.width) / 2 + padding;
        const reqDistY = (a.height + b.height) / 2 + padding;

        const dx = bcx - acx;
        const dy = bcy - acy;

        const overlapX = reqDistX - Math.abs(dx);
        const overlapY = reqDistY - Math.abs(dy);

        if (overlapX > 0 && overlapY > 0) {
          hadCollision = true;

          // Resolve along the axis of least displacement
          if (overlapX < overlapY) {
            const sign = dx >= 0 ? 1 : -1;
            const push = (overlapX / 2) * sign;
            if (a.type === "main-topic") {
              b.x += push * 2;
            } else if (b.type === "main-topic") {
              a.x -= push * 2;
            } else {
              a.x -= push;
              b.x += push;
            }
          } else {
            const sign = dy >= 0 ? 1 : -1;
            const push = (overlapY / 2) * sign;
            if (a.type === "main-topic") {
              b.y += push * 2;
            } else if (b.type === "main-topic") {
              a.y -= push * 2;
            } else {
              a.y -= push;
              b.y += push;
            }
          }
        }
      }
    }

    if (!hadCollision) break;
  }
}

/**
 * Calculates the exact distance from the center of an axis-aligned box
 * to its perimeter along a ray at angle `angle`.
 */
export function getBoxRadialRadius(width: number, height: number, angle: number): number {
  const cos = Math.abs(Math.cos(angle));
  const sin = Math.abs(Math.sin(angle));
  const halfW = width / 2;
  const halfH = height / 2;

  const tX = cos > 1e-6 ? halfW / cos : Infinity;
  const tY = sin > 1e-6 ? halfH / sin : Infinity;
  return Math.min(tX, tY);
}

/**
 * Calculates the exact minimum center-to-center clearance distance between two
 * axis-aligned boxes along a ray at angle `angle` to guarantee zero overlap with `gap`.
 */
export function getBoxesClearanceDistance(
  w1: number,
  h1: number,
  w2: number,
  h2: number,
  angle: number,
  gap = 40,
): number {
  const cos = Math.abs(Math.cos(angle));
  const sin = Math.abs(Math.sin(angle));
  const reqX = (w1 + w2) / 2 + gap;
  const reqY = (h1 + h2) / 2 + gap;
  const dX = cos > 1e-4 ? reqX / cos : Infinity;
  const dY = sin > 1e-4 ? reqY / sin : Infinity;
  return Math.min(dX, dY);
}

/**
 * Lays out an entire topic cluster as an organic Floral Radial Tree using a 2-Pass Engine:
 * - Pass 1: Analyzes and pre-measures all subtopics, branches, flows, and diagrams to compute exact subtree weights.
 * - Pass 2: Generates a tight, snug floral halo around the hub using exact perimeter ray-box intersections.
 */
/**
 * Lays out an entire topic cluster using a 4-Directional Mind Map Tree Engine:
 * - Center: Main Topic Hub Box
 * - North Sector (Top): Conceptual subtopics & branches fanning cleanly UPWARD
 * - South Sector (Bottom): Flow pipelines, architectural diagrams & branches extending DOWNWARD
 * - East Sector (Right): Category branches and leaves extending RIGHTWARD
 * - West Sector (Left): Category branches and leaves extending LEFTWARD
 * Guaranteed ZERO box overlap, ZERO arrow cuts, and clean human whiteboard readability.
 */
function layoutTopicClusterFloral(
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

  // ==========================================
  // 1. TOPIC HUB (CENTER)
  // ==========================================
  const titleText = topic.title || "Main Topic";
  const hasIntro = topic.centerNotes.length > 0;
  const rawIntro = hasIntro ? topic.centerNotes.map((n) => n.text).join("\n\n") : "";

  let hubW = Math.max(380, Math.min(850, titleText.length * 15 + 70));
  let hubH = 68;
  let wrappedIntro = "";

  if (hasIntro) {
    hubW = Math.max(hubW, Math.min(740, options.maxTextWidth + 240));
    wrappedIntro = wrapText(rawIntro, hubW - 60, 14, 1);
    const introDim = measureTextBlock(wrappedIntro, 14, 1);
    hubH = Math.max(85, 52 + introDim.height + 24);
  }

  const hubNode: LayoutNode = {
    id: topic.id,
    type: "main-topic",
    title: titleText,
    text: wrappedIntro || undefined,
    x: centerX - hubW / 2,
    y: centerY - hubH / 2,
    width: hubW,
    height: hubH,
    style: "solid",
    colorTheme: palette,
    fontFamily: 1,
    fontSize: 22,
    clusterId,
    cardStyle: hasIntro ? "card" : "pill",
  };
  nodes.push(hubNode);

  const subtopics = topic.subtopics;
  const numSubtopics = subtopics.length;

  if (numSubtopics === 0) {
    const bounds = computeBoundingBox(nodes);
    return { id: clusterId, bounds, nodes, edges };
  }

  // ==========================================
  // 2. SECTOR ASSIGNMENT
  // ==========================================
  type Sector = "top" | "bottom" | "right" | "left";
  const sectorAssignments: { sub: SubtopicNode; sector: Sector }[] = [];

  // Categorize subtopics by priority
  if (numSubtopics === 1) {
    sectorAssignments.push({ sub: subtopics[0]!, sector: "bottom" });
  } else if (numSubtopics === 2) {
    sectorAssignments.push({ sub: subtopics[0]!, sector: "bottom" });
    sectorAssignments.push({ sub: subtopics[1]!, sector: "top" });
  } else if (numSubtopics === 3) {
    // Find bottom subtopic (diagrams or flows)
    let bottomIdx = subtopics.findIndex(
      (s) => s.diagrams.length > 0 || s.children.some((c) => c.diagrams.length > 0 || c.isFlowStep),
    );
    if (bottomIdx === -1) bottomIdx = 0;

    const remaining = subtopics.filter((_, i) => i !== bottomIdx);
    sectorAssignments.push({ sub: subtopics[bottomIdx]!, sector: "bottom" });
    sectorAssignments.push({ sub: remaining[0]!, sector: "right" });
    sectorAssignments.push({ sub: remaining[1]!, sector: "left" });
  } else {
    // 4+ Subtopics: map to bottom, top, right, left
    const assigned = new Set<string>();
    for (const sub of subtopics) {
      if (sub.diagrams.length > 0 || sub.children.some((c) => c.diagrams.length > 0 || c.isFlowStep)) {
        sectorAssignments.push({ sub, sector: "bottom" });
        assigned.add(sub.id);
        break;
      }
    }
    const remaining = subtopics.filter((s) => !assigned.has(s.id));
    const sectors: Sector[] = ["top", "right", "left", "bottom"];
    let sIdx = 0;
    for (const sub of remaining) {
      const sector = sectors[sIdx % sectors.length]!;
      sectorAssignments.push({ sub, sector });
      sIdx++;
    }
  }

  // Helper: Format and dynamically measure any hierarchy node (subtopic, branch, leaf)
  const formatCardNode = (
    n: SubtopicNode,
    defaultMinW: number,
    defaultMaxW: number,
  ): { title: string; text?: string; width: number; height: number; hasNotes: boolean } => {
    const hasNotes = n.notes.length > 0;
    if (!hasNotes) {
      const w = Math.max(defaultMinW, Math.min(defaultMaxW, n.title.length * 10 + 36));
      return { title: n.title, width: w, height: 44, hasNotes: false };
    }

    const lines: string[] = [];
    for (const note of n.notes) {
      if (note.boldTitle) {
        lines.push(`• ${note.boldTitle}: ${note.description || note.text}`);
      } else if (note.isBullet) {
        lines.push(`• ${note.text}`);
      } else {
        lines.push(note.text);
      }
    }
    const raw = lines.join("\n\n");
    const cardW = Math.max(defaultMinW, Math.min(defaultMaxW, options.maxTextWidth));
    const wrapped = wrapText(raw, cardW - 28, 13, 1);
    const textDim = measureTextBlock(wrapped, 13, 1);
    const cardH = Math.max(56, textDim.height + 46);

    return {
      title: n.title,
      text: wrapped,
      width: cardW,
      height: cardH,
      hasNotes: true,
    };
  };

  // ==========================================
  // 3. SECTOR RENDERING
  // ==========================================
  for (const { sub, sector } of sectorAssignments) {
    const subCard = formatCardNode(sub, 280, 380);
    const allChildren = sub.children;
    const numChildren = allChildren.length;

    // ------------------------------------------------------------------------
    // SECTOR: TOP (North -> expands UP)
    // ------------------------------------------------------------------------
    if (sector === "top") {
      const subCenterX = centerX;
      const subCenterY = centerY - hubH / 2 - 50 - subCard.height / 2;

      const subNode: LayoutNode = {
        id: sub.id,
        type: subCard.hasNotes ? "concept-card" : "subtopic",
        title: subCard.title,
        text: subCard.text,
        x: subCenterX - subCard.width / 2,
        y: subCenterY - subCard.height / 2,
        width: subCard.width,
        height: subCard.height,
        style: sub.style || "solid",
        colorTheme: palette,
        fontFamily: 1,
        fontSize: subCard.hasNotes ? 14 : 17,
        clusterId,
        parentId: hubNode.id,
        cardStyle: "card",
      };
      nodes.push(subNode);

      edges.push({
        id: `edge-${hubNode.id}-${sub.id}`,
        sourceId: hubNode.id,
        targetId: sub.id,
        style: "solid",
        arrowType: "curved",
        exitSide: "top",
        entrySide: "bottom",
        clusterId,
        arrowhead: "arrow",
      });

      if (numChildren > 0) {
        const leafGapX = 36;
        const branchProfiles = allChildren.map((c) => {
          const cCard = formatCardNode(c, 200, 290);
          const leafCards = c.children.map((l) => formatCardNode(l, 200, 270));
          const numLeaves = leafCards.length;
          const totalLeavesW = leafCards.reduce((sum, lc) => sum + lc.width, 0) + Math.max(0, numLeaves - 1) * leafGapX;
          const subtreeW = Math.max(cCard.width, totalLeavesW);
          return { child: c, cCard, leafCards, numLeaves, subtreeW };
        });

        const totalRowW = branchProfiles.reduce((sum, b) => sum + b.subtreeW, 0) + (numChildren - 1) * 48;
        let curX = centerX - totalRowW / 2;

        for (const bp of branchProfiles) {
          const branchCenterX = curX + bp.subtreeW / 2;
          curX += bp.subtreeW + 48;

          const branchX = branchCenterX - bp.cCard.width / 2;
          const branchY = subCenterY - subCard.height / 2 - 50 - bp.cCard.height;

          const childNode: LayoutNode = {
            id: bp.child.id,
            type: bp.cCard.hasNotes ? "concept-card" : (bp.child.isFlowStep ? "flow-step" : "sub-subtopic"),
            title: bp.cCard.title,
            text: bp.cCard.text,
            x: branchX,
            y: branchY,
            width: bp.cCard.width,
            height: bp.cCard.height,
            style: bp.child.style || (bp.child.isFlowStep ? "solid" : "dashed"),
            colorTheme: palette,
            fontFamily: 1,
            fontSize: 14,
            clusterId,
            parentId: subNode.id,
            cardStyle: bp.cCard.hasNotes ? "card" : (bp.child.isFlowStep ? "card" : "dashed"),
          };
          nodes.push(childNode);

          edges.push({
            id: `edge-${subNode.id}-${bp.child.id}`,
            sourceId: subNode.id,
            targetId: bp.child.id,
            style: "solid",
            arrowType: "curved",
            exitSide: "top",
            entrySide: "bottom",
            clusterId,
            arrowhead: "arrow",
          });

          // Leaves arranged directly above this branch
          const maxLeafH = bp.leafCards.reduce((max, lc) => Math.max(max, lc.height), 44);
          const leafRowBottomY = branchY - 50;
          let topY = branchY;

          const totalLeavesWidth = bp.leafCards.reduce((sum, lc) => sum + lc.width, 0) + Math.max(0, bp.numLeaves - 1) * leafGapX;
          let leafCurX = branchCenterX - totalLeavesWidth / 2;

          for (let lIdx = 0; lIdx < bp.numLeaves; lIdx++) {
            const leaf = bp.child.children[lIdx]!;
            const lc = bp.leafCards[lIdx]!;
            const leafX = leafCurX;
            leafCurX += lc.width + leafGapX;
            const leafY = leafRowBottomY - lc.height;

            topY = Math.min(topY, leafY);

            const leafNode: LayoutNode = {
              id: leaf.id,
              type: lc.hasNotes ? "concept-card" : "sub-subtopic",
              title: lc.title,
              text: lc.text,
              x: leafX,
              y: leafY,
              width: lc.width,
              height: lc.height,
              style: leaf.style || "dashed",
              colorTheme: palette,
              fontFamily: 1,
              fontSize: 13,
              clusterId,
              parentId: bp.child.id,
              cardStyle: lc.hasNotes ? "card" : "dashed",
            };
            nodes.push(leafNode);

            edges.push({
              id: `edge-${bp.child.id}-${leaf.id}`,
              sourceId: bp.child.id,
              targetId: leaf.id,
              style: "solid",
              arrowType: "curved",
              exitSide: "top",
              entrySide: "bottom",
              clusterId,
              arrowhead: "arrow",
            });
          }

          // Branch diagrams (placed directly above leaves)
          if (bp.child.diagrams.length > 0) {
            let lastAnchor = bp.child.id;
            let curDiagY = topY - 24;
            for (const diag of bp.child.diagrams) {
              const asciiDim = measureAsciiBlock(diag.code, 13, 16);
              curDiagY -= asciiDim.height + 20;
              const diagNode: LayoutNode = {
                id: diag.id,
                type: "ascii-diagram",
                text: diag.code,
                title: diag.label,
                x: branchCenterX - asciiDim.width / 2,
                y: curDiagY,
                width: asciiDim.width,
                height: asciiDim.height,
                style: "dashed",
                fontFamily: 3,
                fontSize: 13,
                clusterId,
                parentId: lastAnchor,
              };
              nodes.push(diagNode);
              edges.push({
                id: `edge-${lastAnchor}-${diag.id}`,
                sourceId: lastAnchor,
                targetId: diag.id,
                style: "dashed",
                arrowType: "curved",
                exitSide: "top",
                entrySide: "bottom",
                clusterId,
                arrowhead: "arrow",
              });
              lastAnchor = diag.id;
            }
          }
        }
      }
    }

    // ------------------------------------------------------------------------
    // SECTOR: BOTTOM (South -> expands DOWN)
    // ------------------------------------------------------------------------
    else if (sector === "bottom") {
      const subCenterX = centerX;
      const subCenterY = centerY + hubH / 2 + 50 + subCard.height / 2;

      const subNode: LayoutNode = {
        id: sub.id,
        type: subCard.hasNotes ? "concept-card" : "subtopic",
        title: subCard.title,
        text: subCard.text,
        x: subCenterX - subCard.width / 2,
        y: subCenterY - subCard.height / 2,
        width: subCard.width,
        height: subCard.height,
        style: sub.style || "solid",
        colorTheme: palette,
        fontFamily: 1,
        fontSize: subCard.hasNotes ? 14 : 17,
        clusterId,
        parentId: hubNode.id,
        cardStyle: "card",
      };
      nodes.push(subNode);

      edges.push({
        id: `edge-${hubNode.id}-${sub.id}`,
        sourceId: hubNode.id,
        targetId: sub.id,
        style: "solid",
        arrowType: "curved",
        exitSide: "bottom",
        entrySide: "top",
        clusterId,
        arrowhead: "arrow",
      });

      if (numChildren > 0) {
        const leafGapX = 36;
        const branchProfiles = allChildren.map((c) => {
          const cCard = formatCardNode(c, 200, 290);
          const leafCards = c.children.map((l) => formatCardNode(l, 200, 270));
          const numLeaves = leafCards.length;
          const totalLeavesW = leafCards.reduce((sum, lc) => sum + lc.width, 0) + Math.max(0, numLeaves - 1) * leafGapX;
          const subtreeW = Math.max(cCard.width, totalLeavesW);
          return { child: c, cCard, leafCards, numLeaves, subtreeW };
        });

        const totalRowW = branchProfiles.reduce((sum, b) => sum + b.subtreeW, 0) + (numChildren - 1) * 48;
        let curX = centerX - totalRowW / 2;

        for (const bp of branchProfiles) {
          const branchCenterX = curX + bp.subtreeW / 2;
          curX += bp.subtreeW + 48;

          const branchX = branchCenterX - bp.cCard.width / 2;
          const branchY = subCenterY + subCard.height / 2 + 50;

          const childNode: LayoutNode = {
            id: bp.child.id,
            type: bp.cCard.hasNotes ? "concept-card" : (bp.child.isFlowStep ? "flow-step" : "sub-subtopic"),
            title: bp.cCard.title,
            text: bp.cCard.text,
            x: branchX,
            y: branchY,
            width: bp.cCard.width,
            height: bp.cCard.height,
            style: bp.child.style || (bp.child.isFlowStep ? "solid" : "dashed"),
            colorTheme: palette,
            fontFamily: 1,
            fontSize: 14,
            clusterId,
            parentId: subNode.id,
            cardStyle: bp.cCard.hasNotes ? "card" : (bp.child.isFlowStep ? "card" : "dashed"),
          };
          nodes.push(childNode);

          edges.push({
            id: `edge-${subNode.id}-${bp.child.id}`,
            sourceId: subNode.id,
            targetId: bp.child.id,
            style: "solid",
            arrowType: "curved",
            exitSide: "bottom",
            entrySide: "top",
            clusterId,
            arrowhead: "arrow",
          });

          // Leaves arranged directly below this branch
          let bottomY = branchY + bp.cCard.height;
          const leafRowTopY = branchY + bp.cCard.height + 50;

          const totalLeavesWidth = bp.leafCards.reduce((sum, lc) => sum + lc.width, 0) + Math.max(0, bp.numLeaves - 1) * leafGapX;
          let leafCurX = branchCenterX - totalLeavesWidth / 2;

          for (let lIdx = 0; lIdx < bp.numLeaves; lIdx++) {
            const leaf = bp.child.children[lIdx]!;
            const lc = bp.leafCards[lIdx]!;
            const leafX = leafCurX;
            leafCurX += lc.width + leafGapX;
            const leafY = leafRowTopY;

            bottomY = Math.max(bottomY, leafY + lc.height);

            const leafNode: LayoutNode = {
              id: leaf.id,
              type: lc.hasNotes ? "concept-card" : "sub-subtopic",
              title: lc.title,
              text: lc.text,
              x: leafX,
              y: leafY,
              width: lc.width,
              height: lc.height,
              style: leaf.style || "dashed",
              colorTheme: palette,
              fontFamily: 1,
              fontSize: 13,
              clusterId,
              parentId: bp.child.id,
              cardStyle: lc.hasNotes ? "card" : "dashed",
            };
            nodes.push(leafNode);

            edges.push({
              id: `edge-${bp.child.id}-${leaf.id}`,
              sourceId: bp.child.id,
              targetId: leaf.id,
              style: "solid",
              arrowType: "curved",
              exitSide: "bottom",
              entrySide: "top",
              clusterId,
              arrowhead: "arrow",
            });
          }

          // Diagrams / flow steps (placed directly below leaves)
          if (bp.child.diagrams.length > 0) {
            let lastAnchor = bp.child.id;
            let curDiagY = bottomY + 24;
            for (const diag of bp.child.diagrams) {
              const asciiDim = measureAsciiBlock(diag.code, 13, 16);
              const diagNode: LayoutNode = {
                id: diag.id,
                type: "ascii-diagram",
                text: diag.code,
                title: diag.label,
                x: branchCenterX - asciiDim.width / 2,
                y: curDiagY,
                width: asciiDim.width,
                height: asciiDim.height,
                style: "dashed",
                fontFamily: 3,
                fontSize: 13,
                clusterId,
                parentId: lastAnchor,
              };
              nodes.push(diagNode);
              edges.push({
                id: `edge-${lastAnchor}-${diag.id}`,
                sourceId: lastAnchor,
                targetId: diag.id,
                style: "dashed",
                arrowType: "curved",
                exitSide: "bottom",
                entrySide: "top",
                clusterId,
                arrowhead: "arrow",
              });
              lastAnchor = diag.id;
              curDiagY += asciiDim.height + 24;
            }
          }
        }
      }
    }

    // ------------------------------------------------------------------------
    // SECTOR: RIGHT (East -> expands RIGHTWARD)
    // ------------------------------------------------------------------------
    else if (sector === "right") {
      const subCenterX = centerX + hubW / 2 + 60 + subCard.width / 2;
      const subCenterY = centerY;

      const subNode: LayoutNode = {
        id: sub.id,
        type: subCard.hasNotes ? "concept-card" : "subtopic",
        title: subCard.title,
        text: subCard.text,
        x: subCenterX - subCard.width / 2,
        y: subCenterY - subCard.height / 2,
        width: subCard.width,
        height: subCard.height,
        style: sub.style || "solid",
        colorTheme: palette,
        fontFamily: 1,
        fontSize: subCard.hasNotes ? 14 : 17,
        clusterId,
        parentId: hubNode.id,
        cardStyle: "card",
      };
      nodes.push(subNode);

      edges.push({
        id: `edge-${hubNode.id}-${sub.id}`,
        sourceId: hubNode.id,
        targetId: sub.id,
        style: "solid",
        arrowType: "curved",
        exitSide: "right",
        entrySide: "left",
        clusterId,
        arrowhead: "arrow",
      });

      if (numChildren > 0) {
        const leafGapY = 28;
        const branchProfiles = allChildren.map((c) => {
          const cCard = formatCardNode(c, 200, 290);
          const leafCards = c.children.map((l) => formatCardNode(l, 200, 270));
          const numLeaves = leafCards.length;
          const totalLeavesH = leafCards.reduce((sum, lc) => sum + lc.height, 0) + Math.max(0, numLeaves - 1) * leafGapY;
          const subtreeH = Math.max(cCard.height, totalLeavesH);
          return { child: c, cCard, leafCards, numLeaves, subtreeH };
        });

        const totalColH = branchProfiles.reduce((sum, b) => sum + b.subtreeH, 0) + (numChildren - 1) * 36;
        let curY = centerY - totalColH / 2;

        for (const bp of branchProfiles) {
          const branchCenterY = curY + bp.subtreeH / 2;
          curY += bp.subtreeH + 36;

          const branchX = subCenterX + subCard.width / 2 + 50;
          const branchY = branchCenterY - bp.cCard.height / 2;

          const childNode: LayoutNode = {
            id: bp.child.id,
            type: bp.cCard.hasNotes ? "concept-card" : (bp.child.isFlowStep ? "flow-step" : "sub-subtopic"),
            title: bp.cCard.title,
            text: bp.cCard.text,
            x: branchX,
            y: branchY,
            width: bp.cCard.width,
            height: bp.cCard.height,
            style: bp.child.style || "solid",
            colorTheme: palette,
            fontFamily: 1,
            fontSize: 14,
            clusterId,
            parentId: subNode.id,
            cardStyle: bp.cCard.hasNotes ? "card" : "card",
          };
          nodes.push(childNode);

          edges.push({
            id: `edge-${subNode.id}-${bp.child.id}`,
            sourceId: subNode.id,
            targetId: bp.child.id,
            style: "solid",
            arrowType: "curved",
            exitSide: "right",
            entrySide: "left",
            clusterId,
            arrowhead: "arrow",
          });

          // Leaves arranged directly to the right of this branch
          const totalLeavesHeight = bp.leafCards.reduce((sum, lc) => sum + lc.height, 0) + Math.max(0, bp.numLeaves - 1) * leafGapY;
          let leafCurY = branchCenterY - totalLeavesHeight / 2;
          const leafColX = branchX + bp.cCard.width + 50;

          for (let lIdx = 0; lIdx < bp.numLeaves; lIdx++) {
            const leaf = bp.child.children[lIdx]!;
            const lc = bp.leafCards[lIdx]!;
            const leafX = leafColX;
            const leafY = leafCurY;
            leafCurY += lc.height + leafGapY;

            const leafNode: LayoutNode = {
              id: leaf.id,
              type: lc.hasNotes ? "concept-card" : "sub-subtopic",
              title: lc.title,
              text: lc.text,
              x: leafX,
              y: leafY,
              width: lc.width,
              height: lc.height,
              style: leaf.style || "dashed",
              colorTheme: palette,
              fontFamily: 1,
              fontSize: 13,
              clusterId,
              parentId: bp.child.id,
              cardStyle: lc.hasNotes ? "card" : "dashed",
            };
            nodes.push(leafNode);

            edges.push({
              id: `edge-${bp.child.id}-${leaf.id}`,
              sourceId: bp.child.id,
              targetId: leaf.id,
              style: "solid",
              arrowType: "curved",
              exitSide: "right",
              entrySide: "left",
              clusterId,
              arrowhead: "arrow",
            });
          }
        }
      }
    }

    // ------------------------------------------------------------------------
    // SECTOR: LEFT (West -> expands LEFTWARD)
    // ------------------------------------------------------------------------
    else if (sector === "left") {
      const subCenterX = centerX - hubW / 2 - 60 - subCard.width / 2;
      const subCenterY = centerY;

      const subNode: LayoutNode = {
        id: sub.id,
        type: subCard.hasNotes ? "concept-card" : "subtopic",
        title: subCard.title,
        text: subCard.text,
        x: subCenterX - subCard.width / 2,
        y: subCenterY - subCard.height / 2,
        width: subCard.width,
        height: subCard.height,
        style: sub.style || "solid",
        colorTheme: palette,
        fontFamily: 1,
        fontSize: subCard.hasNotes ? 14 : 17,
        clusterId,
        parentId: hubNode.id,
        cardStyle: "card",
      };
      nodes.push(subNode);

      edges.push({
        id: `edge-${hubNode.id}-${sub.id}`,
        sourceId: hubNode.id,
        targetId: sub.id,
        style: "solid",
        arrowType: "curved",
        exitSide: "left",
        entrySide: "right",
        clusterId,
        arrowhead: "arrow",
      });

      if (numChildren > 0) {
        const leafGapY = 28;
        const branchProfiles = allChildren.map((c) => {
          const cCard = formatCardNode(c, 200, 290);
          const leafCards = c.children.map((l) => formatCardNode(l, 200, 270));
          const numLeaves = leafCards.length;
          const totalLeavesH = leafCards.reduce((sum, lc) => sum + lc.height, 0) + Math.max(0, numLeaves - 1) * leafGapY;
          const subtreeH = Math.max(cCard.height, totalLeavesH);
          return { child: c, cCard, leafCards, numLeaves, subtreeH };
        });

        const totalColH = branchProfiles.reduce((sum, b) => sum + b.subtreeH, 0) + (numChildren - 1) * 36;
        let curY = centerY - totalColH / 2;

        for (const bp of branchProfiles) {
          const branchCenterY = curY + bp.subtreeH / 2;
          curY += bp.subtreeH + 36;

          const branchX = subCenterX - subCard.width / 2 - 50 - bp.cCard.width;
          const branchY = branchCenterY - bp.cCard.height / 2;

          const childNode: LayoutNode = {
            id: bp.child.id,
            type: bp.cCard.hasNotes ? "concept-card" : (bp.child.isFlowStep ? "flow-step" : "sub-subtopic"),
            title: bp.cCard.title,
            text: bp.cCard.text,
            x: branchX,
            y: branchY,
            width: bp.cCard.width,
            height: bp.cCard.height,
            style: bp.child.style || "solid",
            colorTheme: palette,
            fontFamily: 1,
            fontSize: 14,
            clusterId,
            parentId: subNode.id,
            cardStyle: bp.cCard.hasNotes ? "card" : "card",
          };
          nodes.push(childNode);

          edges.push({
            id: `edge-${subNode.id}-${bp.child.id}`,
            sourceId: subNode.id,
            targetId: bp.child.id,
            style: "solid",
            arrowType: "curved",
            exitSide: "left",
            entrySide: "right",
            clusterId,
            arrowhead: "arrow",
          });

          // Leaves arranged directly to the left of this branch
          const totalLeavesHeight = bp.leafCards.reduce((sum, lc) => sum + lc.height, 0) + Math.max(0, bp.numLeaves - 1) * leafGapY;
          let leafCurY = branchCenterY - totalLeavesHeight / 2;
          const leafColRightX = branchX - 50;

          for (let lIdx = 0; lIdx < bp.numLeaves; lIdx++) {
            const leaf = bp.child.children[lIdx]!;
            const lc = bp.leafCards[lIdx]!;
            const leafX = leafColRightX - lc.width;
            const leafY = leafCurY;
            leafCurY += lc.height + leafGapY;

            const leafNode: LayoutNode = {
              id: leaf.id,
              type: lc.hasNotes ? "concept-card" : "sub-subtopic",
              title: lc.title,
              text: lc.text,
              x: leafX,
              y: leafY,
              width: lc.width,
              height: lc.height,
              style: leaf.style || "dashed",
              colorTheme: palette,
              fontFamily: 1,
              fontSize: 13,
              clusterId,
              parentId: bp.child.id,
              cardStyle: lc.hasNotes ? "card" : "dashed",
            };
            nodes.push(leafNode);

            edges.push({
              id: `edge-${bp.child.id}-${leaf.id}`,
              sourceId: bp.child.id,
              targetId: leaf.id,
              style: "solid",
              arrowType: "curved",
              exitSide: "left",
              entrySide: "right",
              clusterId,
              arrowhead: "arrow",
            });
          }
        }
      }
    }
  }

  // Bounded gentle relaxation
  resolveCollisionsPhysics(nodes, 20, 40);

  const bounds = computeBoundingBox(nodes);
  return {
    id: clusterId,
    bounds,
    nodes,
    edges,
  };
}

/**
 * Packs multiple topic clusters into an organic 2D constellation (like Obsidian's graph view)
 * using shortest-column masonry bin-packing, tight inter-cluster gaps, and origin normalization.
 */
function packClusterConstellation(
  clusters: LayoutCluster[],
  options: Required<VisualNoteOptions>,
): {
  allNodes: LayoutNode[];
  allEdges: LayoutEdge[];
  bounds: BoundingBox;
} {
  const numClusters = clusters.length;
  if (numClusters === 0) {
    return { allNodes: [], allEdges: [], bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 } };
  }

  let numCols = 2;
  if (options.layoutMode === "vertical" || options.columns === 1) {
    numCols = 1;
  } else if (options.columns && options.columns > 1) {
    numCols = options.columns;
  } else if (numClusters >= 5) {
    numCols = 3;
  } else if (numClusters === 1) {
    numCols = 1;
  }

  const colGap = options.colGap ?? 140;
  const rowGap = options.clusterGap ?? 120;

  if (numCols === 1) {
    let currentY = 40;
    const allNodes: LayoutNode[] = [];
    const allEdges: LayoutEdge[] = [];
    for (const cluster of clusters) {
      const clusterH = cluster.bounds.maxY - cluster.bounds.minY;
      const deltaY = currentY - cluster.bounds.minY;
      const deltaX = 40 - cluster.bounds.minX;
      for (const n of cluster.nodes) {
        n.x += deltaX;
        n.y += deltaY;
      }
      cluster.bounds = computeBoundingBox(cluster.nodes);
      allNodes.push(...cluster.nodes);
      allEdges.push(...cluster.edges);
      currentY += clusterH + rowGap;
    }
    return { allNodes, allEdges, bounds: computeBoundingBox(allNodes) };
  }

  // 2D Column Masonry Packing
  // 1. Assign each cluster to a column: col = i % numCols
  const colClusters: LayoutCluster[][] = Array.from({ length: numCols }, () => []);
  for (let i = 0; i < numClusters; i++) {
    const col = i % numCols;
    colClusters[col]!.push(clusters[i]!);
  }

  // 2. Measure actual max width of each column
  const colWidths: number[] = new Array(numCols).fill(0);
  for (let c = 0; c < numCols; c++) {
    for (const cluster of colClusters[c]!) {
      const cW = cluster.bounds.maxX - cluster.bounds.minX;
      colWidths[c] = Math.max(colWidths[c]!, cW);
    }
  }

  // 3. Compute starting X for each column
  const colX: number[] = new Array(numCols).fill(40);
  let curX = 40;
  for (let c = 0; c < numCols; c++) {
    colX[c] = curX;
    curX += colWidths[c]! + colGap;
  }

  // 4. Position clusters in their columns
  const allNodes: LayoutNode[] = [];
  const allEdges: LayoutEdge[] = [];

  for (let c = 0; c < numCols; c++) {
    let curY = 40;
    const targetX = colX[c]!;
    for (const cluster of colClusters[c]!) {
      const cH = cluster.bounds.maxY - cluster.bounds.minY;
      const targetY = curY;

      const deltaX = targetX - cluster.bounds.minX;
      const deltaY = targetY - cluster.bounds.minY;

      for (const n of cluster.nodes) {
        n.x += deltaX;
        n.y += deltaY;
      }
      cluster.bounds = computeBoundingBox(cluster.nodes);
      allNodes.push(...cluster.nodes);
      allEdges.push(...cluster.edges);

      curY += cH + rowGap;
    }
  }

  // 5. Canvas Origin Normalization: Shift everything so minX = 40, minY = 40
  const totalBounds = computeBoundingBox(allNodes);
  const shiftOriginX = 40 - totalBounds.minX;
  const shiftOriginY = 40 - totalBounds.minY;
  if (shiftOriginX !== 0 || shiftOriginY !== 0) {
    for (const n of allNodes) {
      n.x += shiftOriginX;
      n.y += shiftOriginY;
    }
  }

  return {
    allNodes,
    allEdges,
    bounds: computeBoundingBox(allNodes),
  };
}

/**
 * Main Layout Engine Entry Point.
 * Converts markdown AST into fully laid-out 2D coordinates.
 * Generates an organic floral radial tree for each topic cluster and packs
 * multi-topic whiteboards into an expansive 2D constellation (like Obsidian's graph view).
 */
export function layoutVisualNotes(
  doc: VisualNoteDoc,
  rawOptions?: VisualNoteOptions,
): LayoutResult {
  const options: Required<VisualNoteOptions> = {
    theme: rawOptions?.theme ?? "light",
    clusterGap: rawOptions?.clusterGap ?? 120,
    roughness: rawOptions?.roughness ?? 1,
    defaultFontFamily: rawOptions?.defaultFontFamily ?? 1,
    maxTextWidth: rawOptions?.maxTextWidth ?? 340,
    asciiPadding: rawOptions?.asciiPadding ?? 16,
    columns: rawOptions?.columns ?? 0,
    layoutMode: rawOptions?.layoutMode ?? "floral",
    colGap: rawOptions?.colGap ?? 140,
  };

  const numTopics = doc.topics.length;
  if (numTopics === 0) {
    return {
      clusters: [],
      nodes: [],
      edges: [],
      bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
    };
  }

  // Generate each topic cluster organically as a floral radial tree
  const localClusters: LayoutCluster[] = [];
  for (let c = 0; c < numTopics; c++) {
    const topic = doc.topics[c]!;
    const cluster = layoutTopicClusterFloral(topic, c, 0, 0, options);
    localClusters.push(cluster);
  }

  // Pack clusters into an expansive 2D constellation
  const packed = packClusterConstellation(localClusters, options);

  return {
    clusters: localClusters,
    nodes: packed.allNodes,
    edges: packed.allEdges,
    bounds: packed.bounds,
  };
}
