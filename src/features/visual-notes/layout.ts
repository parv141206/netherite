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
 * Lays out an entire topic cluster using an adaptive tiered tree structure
 * modeled after real human study whiteboards (e.g. mynotes.excalidraw).
 *
 * Header Pill at top-center ->
 * Introductory Concept Card (if any) ->
 * Multi-column Grid of Subtopics with child leaf concept cards and elbow connectors.
 */
function layoutTopicClusterTieredTree(
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
      const clearPos = space.findClearPosition(node, 1, 1, 15, 30, padding);
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

  // 1. Topic Header Pill
  const titleText = topic.title || "Main Topic";
  const pillW = Math.max(340, Math.min(820, titleText.length * 13 + 60));
  const pillH = 72;
  const headerPill: LayoutNode = {
    id: topic.id,
    type: "main-topic",
    title: titleText,
    x: centerX - pillW / 2,
    y: centerY,
    width: pillW,
    height: pillH,
    style: "solid",
    colorTheme: palette,
    fontFamily: 1,
    fontSize: 22,
    clusterId,
    cardStyle: "pill",
  };
  registerAndPlace(headerPill, 26);

  let currentY = headerPill.y + headerPill.height + 40;
  let rootAnchorId = headerPill.id;

  // 2. Topic Center Notes (Introductory Definition Card)
  if (topic.centerNotes.length > 0) {
    const rawText = topic.centerNotes.map((n) => n.text).join("\n\n");
    const wrappedIntro = wrapText(rawText, Math.min(650, options.maxTextWidth + 150), 16, 1);
    const introDim = measureTextBlock(wrappedIntro, 16, 1);
    const introCardW = Math.max(380, Math.min(720, introDim.width + 40));
    const introCardH = introDim.height + 32;

    const introNode: LayoutNode = {
      id: `${topic.id}-intro`,
      type: "concept-card",
      text: wrappedIntro,
      x: centerX - introCardW / 2,
      y: currentY,
      width: introCardW,
      height: introCardH,
      style: "solid",
      colorTheme: palette,
      fontFamily: 1,
      fontSize: 16,
      clusterId,
      parentId: headerPill.id,
      cardStyle: "card",
    };
    registerAndPlace(introNode, 22);

    edges.push({
      id: `edge-${headerPill.id}-${introNode.id}`,
      sourceId: headerPill.id,
      targetId: introNode.id,
      style: "solid",
      arrowType: "elbow",
      elbowed: true,
      exitSide: "bottom",
      entrySide: "top",
      clusterId,
      arrowhead: "arrow",
    });

    rootAnchorId = introNode.id;
    currentY = introNode.y + introNode.height + 48;
  }

  // 3. Subtopics Tiered Grid Layout
  const subtopics = topic.subtopics;
  if (subtopics.length > 0) {
    const cols = subtopics.length === 1 ? 1 : subtopics.length <= 4 ? 2 : 3;
    const colWidth = 380;
    const colHorizontalGap = 70;
    const totalGridWidth = cols * colWidth + (cols - 1) * colHorizontalGap;
    const gridStartX = centerX - totalGridWidth / 2;

    const colCurrentY: number[] = new Array(cols).fill(currentY);

    for (let i = 0; i < subtopics.length; i++) {
      const sub = subtopics[i]!;
      const colIdx = i % cols;
      const subX = gridStartX + colIdx * (colWidth + colHorizontalGap);
      const subY = colCurrentY[colIdx]!;

      // Measure Subtopic Header
      const subTitleW = measureContainerBox(sub.title, 18, 1, 24, 14, 220, 52);
      const subNode: LayoutNode = {
        id: sub.id,
        type: "subtopic",
        title: sub.title,
        x: subX,
        y: subY,
        width: Math.max(colWidth - 40, subTitleW.width),
        height: subTitleW.height,
        style: sub.style || "solid",
        colorTheme: palette,
        fontFamily: 1,
        fontSize: 18,
        clusterId,
        parentId: rootAnchorId,
        cardStyle: "card",
      };
      registerAndPlace(subNode, 20);

      edges.push({
        id: `edge-${rootAnchorId}-${sub.id}`,
        sourceId: rootAnchorId,
        targetId: sub.id,
        style: "solid",
        arrowType: "elbow",
        elbowed: true,
        clusterId,
        arrowhead: "arrow",
      });

      let subContentBottomY = subNode.y + subNode.height;

      // Subtopic Notes / Bullet definitions
      if (sub.notes.length > 0) {
        const hasStructuredDefs = sub.notes.some((n) => n.boldTitle);

        if (hasStructuredDefs) {
          let leafY = subContentBottomY + 20;
          for (const note of sub.notes) {
            const leafTitle = note.boldTitle || "";
            const leafDesc = note.description || note.text;
            const wrappedDesc = wrapText(leafDesc, colWidth - 50, 14, 1);
            const descDim = measureTextBlock(wrappedDesc, 14, 1);
            const cardHeight = (leafTitle ? 32 : 0) + descDim.height + 24;

            const leafNode: LayoutNode = {
              id: note.id,
              type: "concept-card",
              title: leafTitle,
              text: wrappedDesc,
              x: subX + 10,
              y: leafY,
              width: colWidth - 20,
              height: cardHeight,
              style: "solid",
              colorTheme: palette,
              fontFamily: 1,
              fontSize: 14,
              clusterId,
              parentId: sub.id,
              cardStyle: "card",
            };
            registerAndPlace(leafNode, 14);

            edges.push({
              id: `edge-${sub.id}-${leafNode.id}`,
              sourceId: sub.id,
              targetId: leafNode.id,
              style: "solid",
              arrowType: "elbow",
              elbowed: true,
              clusterId,
              arrowhead: "arrow",
            });

            leafY += cardHeight + 16;
          }
          subContentBottomY = leafY;
        } else {
          const noteText = wrapText(
            sub.notes.map((n) => (n.isBullet ? `• ${n.text}` : n.text)).join("\n"),
            colWidth - 40,
            14,
            1,
          );
          const noteDim = measureTextBlock(noteText, 14, 1);
          const noteNode: LayoutNode = {
            id: `${sub.id}-notes`,
            type: "note",
            text: noteText,
            x: subX + 10,
            y: subContentBottomY + 16,
            width: noteDim.width + 20,
            height: noteDim.height + 10,
            style: "solid",
            fontFamily: 1,
            fontSize: 14,
            clusterId,
            parentId: sub.id,
          };
          registerAndPlace(noteNode, 14);

          edges.push({
            id: `edge-${sub.id}-${noteNode.id}`,
            sourceId: sub.id,
            targetId: noteNode.id,
            style: "solid",
            arrowType: "elbow",
            elbowed: true,
            clusterId,
            arrowhead: "arrow",
          });

          subContentBottomY = noteNode.y + noteNode.height;
        }
      }

      // Subtopic Diagrams / Code Blocks
      if (sub.diagrams.length > 0) {
        let diagY = subContentBottomY + 20;
        for (const diag of sub.diagrams) {
          const asciiDim = measureAsciiBlock(diag.code, 13, 16);
          const diagNode: LayoutNode = {
            id: diag.id,
            type: "ascii-diagram",
            text: diag.code,
            title: diag.label,
            x: subX,
            y: diagY,
            width: Math.max(colWidth, asciiDim.width),
            height: asciiDim.height,
            style: "dashed",
            fontFamily: 3,
            fontSize: 13,
            clusterId,
            parentId: sub.id,
          };
          registerAndPlace(diagNode, 18);

          edges.push({
            id: `edge-${sub.id}-${diag.id}`,
            sourceId: sub.id,
            targetId: diag.id,
            label: diag.label,
            style: "dashed",
            arrowType: "elbow",
            elbowed: true,
            clusterId,
            arrowhead: "arrow",
          });

          diagY += asciiDim.height + 24;
        }
        subContentBottomY = diagY;
      }

      // Subtopic Children (sub-subtopics / flows)
      if (sub.children.length > 0) {
        let childY = subContentBottomY + 20;
        for (const child of sub.children) {
          const childDim = measureContainerBox(child.title, 15, 1, 20, 12, 180, 42);
          const childNode: LayoutNode = {
            id: child.id,
            type: child.isFlowStep ? "flow-step" : "sub-subtopic",
            title: child.title,
            x: subX + 15,
            y: childY,
            width: Math.max(colWidth - 30, childDim.width),
            height: childDim.height,
            style: child.style || "dashed",
            colorTheme: palette,
            fontFamily: 1,
            fontSize: 15,
            clusterId,
            parentId: sub.id,
            cardStyle: "dashed",
          };
          registerAndPlace(childNode, 16);

          edges.push({
            id: `edge-${sub.id}-${child.id}`,
            sourceId: sub.id,
            targetId: child.id,
            style: "solid",
            arrowType: "elbow",
            elbowed: true,
            clusterId,
            arrowhead: "arrow",
          });

          childY += childDim.height + 16;

          // Child notes
          if (child.notes.length > 0) {
            const noteText = wrapText(
              child.notes.map((n) => (n.isBullet ? `• ${n.text}` : n.text)).join("\n"),
              colWidth - 40,
              14,
              1,
            );
            const noteDim = measureTextBlock(noteText, 14, 1);
            const childNoteNode: LayoutNode = {
              id: `${child.id}-notes`,
              type: "note",
              text: noteText,
              x: subX + 20,
              y: childY,
              width: noteDim.width + 10,
              height: noteDim.height + 10,
              style: "solid",
              fontFamily: 1,
              fontSize: 14,
              clusterId,
              parentId: child.id,
            };
            registerAndPlace(childNoteNode, 14);

            edges.push({
              id: `edge-${child.id}-${childNoteNode.id}`,
              sourceId: child.id,
              targetId: childNoteNode.id,
              style: "dashed",
              arrowType: "elbow",
              elbowed: true,
              clusterId,
              arrowhead: "arrow",
            });

            childY += noteDim.height + 18;
          }

          // Child ASCII / Code Diagrams
          if (child.diagrams.length > 0) {
            for (const diag of child.diagrams) {
              const asciiDim = measureAsciiBlock(diag.code, 13, 16);
              const diagNode: LayoutNode = {
                id: diag.id,
                type: "ascii-diagram",
                text: diag.code,
                title: diag.label,
                x: subX + 10,
                y: childY,
                width: Math.max(colWidth - 20, asciiDim.width),
                height: asciiDim.height,
                style: "dashed",
                fontFamily: 3,
                fontSize: 13,
                clusterId,
                parentId: child.id,
              };
              registerAndPlace(diagNode, 18);

              edges.push({
                id: `edge-${child.id}-${diag.id}`,
                sourceId: child.id,
                targetId: diag.id,
                label: diag.label,
                style: "dashed",
                arrowType: "elbow",
                elbowed: true,
                clusterId,
                arrowhead: "arrow",
              });

              childY += asciiDim.height + 24;
            }
          }
        }
        subContentBottomY = childY;
      }

      colCurrentY[colIdx] = subContentBottomY + 50;
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
 * Utilizes a 2D Multi-Column Masonry canvas packer to achieve an expansive
 * landscape canvas (16:9 / 4:3) matching human study notes.
 */
export function layoutVisualNotes(
  doc: VisualNoteDoc,
  rawOptions?: VisualNoteOptions,
): LayoutResult {
  const options: Required<VisualNoteOptions> = {
    theme: rawOptions?.theme ?? "light",
    clusterGap: rawOptions?.clusterGap ?? 240,
    roughness: rawOptions?.roughness ?? 1,
    defaultFontFamily: rawOptions?.defaultFontFamily ?? 1,
    maxTextWidth: rawOptions?.maxTextWidth ?? 340,
    asciiPadding: rawOptions?.asciiPadding ?? 16,
    columns: rawOptions?.columns ?? 0,
    layoutMode: rawOptions?.layoutMode ?? "grid",
    colGap: rawOptions?.colGap ?? 320,
  };

  const clusters: LayoutCluster[] = [];
  const allNodes: LayoutNode[] = [];
  const allEdges: LayoutEdge[] = [];

  const numTopics = doc.topics.length;
  if (numTopics === 0) {
    return {
      clusters: [],
      nodes: [],
      edges: [],
      bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
    };
  }

  // Multi-column determination:
  // If user requested vertical layout: 1 col
  // If 1 topic: 1 col
  // If 2 to 4 topics: 2 cols
  // If 5+ topics: 2 or 3 cols
  let numCols = 1;
  if (options.layoutMode === "vertical" || options.columns === 1) {
    numCols = 1;
  } else if (options.columns && options.columns > 1) {
    numCols = options.columns;
  } else if (numTopics >= 5) {
    numCols = 3;
  } else if (numTopics >= 2) {
    numCols = 2;
  }

  // First pass: generate clusters locally at origin (0, 0)
  const localClusters: LayoutCluster[] = [];
  for (let c = 0; c < numTopics; c++) {
    const topic = doc.topics[c]!;
    // Use tiered tree layout for rich multi-subtopic notes or grid mode
    const cluster =
      topic.subtopics.length >= 4 || options.layoutMode === "grid"
        ? layoutTopicClusterTieredTree(topic, c, 0, 0, options)
        : layoutTopicCluster(topic, c, 0, 0, options);
    localClusters.push(cluster);
  }

  if (numCols === 1) {
    // Single column vertical stack
    let currentY = 0;
    for (const cluster of localClusters) {
      const clusterH = cluster.bounds.maxY - cluster.bounds.minY;
      const deltaY = currentY - cluster.bounds.minY;
      for (const n of cluster.nodes) n.y += deltaY;
      cluster.bounds = computeBoundingBox(cluster.nodes);
      clusters.push(cluster);
      allNodes.push(...cluster.nodes);
      allEdges.push(...cluster.edges);
      currentY += clusterH + options.clusterGap;
    }
  } else {
    // 2D Multi-Column Masonry Bin-Packing
    const colHeights: number[] = new Array(numCols).fill(0);
    const colWidths: number[] = new Array(numCols).fill(0);

    // Track column assignment for each cluster
    const clusterPlacements: { cluster: LayoutCluster; col: number; startY: number }[] = [];

    for (const cluster of localClusters) {
      const clusterW = cluster.bounds.maxX - cluster.bounds.minX;
      const clusterH = cluster.bounds.maxY - cluster.bounds.minY;

      // Find the column with minimum current height
      let minCol = 0;
      let minH = colHeights[0]!;
      for (let i = 1; i < numCols; i++) {
        if (colHeights[i]! < minH) {
          minH = colHeights[i]!;
          minCol = i;
        }
      }

      const startY = minH === 0 ? 0 : minH + options.clusterGap;
      clusterPlacements.push({ cluster, col: minCol, startY });

      colHeights[minCol] = startY + clusterH;
      colWidths[minCol] = Math.max(colWidths[minCol]!, clusterW);
    }

    // Now calculate actual X positions for each column
    const colXPositions: number[] = new Array(numCols).fill(0);
    let runningX = 0;
    for (let i = 0; i < numCols; i++) {
      colXPositions[i] = runningX;
      runningX += (colWidths[i] || 600) + options.colGap;
    }

    // Translate each cluster to its calculated (X, Y) slot
    for (const { cluster, col, startY } of clusterPlacements) {
      const targetX = colXPositions[col]!;
      const deltaX = targetX - cluster.bounds.minX;
      const deltaY = startY - cluster.bounds.minY;

      for (const n of cluster.nodes) {
        n.x += deltaX;
        n.y += deltaY;
      }
      cluster.bounds = computeBoundingBox(cluster.nodes);

      clusters.push(cluster);
      allNodes.push(...cluster.nodes);
      allEdges.push(...cluster.edges);
    }
  }

  const overallBounds = computeBoundingBox(allNodes);

  return {
    clusters,
    nodes: allNodes,
    edges: allEdges,
    bounds: overallBounds,
  };
}
