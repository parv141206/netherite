/**
 * Core type definitions for the Visual Notes Engine.
 * Converts structured hierarchical Markdown into publication-grade Excalidraw diagrams.
 */

export type TopicColor =
  | "green"
  | "blue"
  | "lavender"
  | "peach"
  | "amber"
  | "rose"
  | "cyan"
  | "emerald"
  | "violet"
  | string;

export type CardinalSlot =
  | "top"
  | "top-left"
  | "top-right"
  | "bottom"
  | "bottom-left"
  | "bottom-right"
  | "left"
  | "right";

export type BoxBorderStyle = "solid" | "dashed" | "dotted";

export type ArrowStyle = "solid" | "dashed" | "dotted";

export interface NoteItem {
  id: string;
  text: string;
  isBullet?: boolean;
  boldTitle?: string;
  description?: string;
  indentLevel?: number;
  children?: NoteItem[];
}

export interface DiagramBlock {
  id: string;
  code: string;
  language?: string;
  label?: string; // e.g. "diagram for it"
}

export interface SubtopicNode {
  id: string;
  title: string;
  style?: BoxBorderStyle;
  color?: string;
  positionHint?: CardinalSlot;
  isFlowStep?: boolean;
  notes: NoteItem[];
  children: SubtopicNode[]; // sub-subtopics or flow steps
  diagrams: DiagramBlock[]; // ascii / code blocks
}

export interface TopicCluster {
  id: string;
  title: string;
  color?: TopicColor;
  centerNotes: NoteItem[];
  subtopics: SubtopicNode[];
}

export interface VisualNoteDoc {
  topics: TopicCluster[];
}

// ==========================================
// Layout Engine Types
// ==========================================

export interface Point2D {
  x: number;
  y: number;
}

export interface BoxDimensions {
  width: number;
  height: number;
}

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export type LayoutNodeType =
  | "main-topic"
  | "header-pill"
  | "subtopic"
  | "concept-card"
  | "flow-step"
  | "sub-subtopic"
  | "note"
  | "ascii-diagram";

export interface LayoutNode {
  id: string;
  type: LayoutNodeType;
  title?: string;
  text?: string;
  secondaryText?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  style: BoxBorderStyle;
  colorTheme?: TopicPalette;
  fontFamily: number; // 1 = Virgil (hand-drawn), 3 = Cascadia (monospace)
  fontSize: number;
  clusterId: string;
  parentId?: string;
  isContainer?: boolean;
  cardStyle?: "pill" | "card" | "plain" | "dashed" | "tinted";
}

export interface LayoutEdge {
  id: string;
  sourceId: string;
  targetId: string;
  label?: string;
  style: ArrowStyle;
  arrowType?: "sharp" | "curved" | "elbow";
  elbowed?: boolean;
  roundness?: number | null;
  clusterId: string;
  arrowhead?: "arrow" | "triangle" | "dot" | "bar";
  exitSide?: "left" | "right" | "top" | "bottom";
  entrySide?: "left" | "right" | "top" | "bottom";
}

export interface LayoutCluster {
  id: string;
  bounds: BoundingBox;
  nodes: LayoutNode[];
  edges: LayoutEdge[];
}

export interface LayoutResult {
  clusters: LayoutCluster[];
  nodes: LayoutNode[];
  edges: LayoutEdge[];
  bounds: BoundingBox;
}

// ==========================================
// Palette & Options
// ==========================================

export interface TopicPalette {
  name: string;
  fill: string;
  stroke: string;
  text: string;
  accent: string;
  subtopicBg: string;
  noteText: string;
}

export interface VisualNoteOptions {
  theme?: "light" | "dark";
  clusterGap?: number; // gap between topic clusters (default 240)
  roughness?: number; // 0 for clean, 1 for sketchy (default 1)
  defaultFontFamily?: number; // default 1 (Virgil)
  maxTextWidth?: number; // wrapping width for prose notes (default 340)
  asciiPadding?: number; // padding for ascii diagram blocks (default 16)
  columns?: number; // 1 (vertical), 2 (balanced 2-col), 3 (3-col) - default auto/2
  layoutMode?: "grid" | "tree" | "vertical" | "radial"; // default "grid"
  colGap?: number; // horizontal gap between columns (default 360)
}
