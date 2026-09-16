import { parseMarkdownNotes } from "./parser";
import { layoutVisualNotes } from "./layout";
import {
  generateExcalidrawElements,
  generateExcalidrawScene,
  type ExcalidrawSceneOutput,
} from "./generator";
import type { VisualNoteOptions, VisualNoteDoc, LayoutResult } from "./types";

export * from "./types";
export * from "./palette";
export * from "./text-measure";
export * from "./parser";
export * from "./layout";
export * from "./generator";
export * from "./templates";

/**
 * Main API: Converts structured Markdown notes into a publication-grade Excalidraw diagram scene.
 *
 * @param markdown - Hierarchical markdown notes with headings, paragraphs, flows, and diagrams
 * @param options - Visual layout and theme options
 * @returns Complete Excalidraw scene JSON object ready to save as .excalidraw or load into canvas
 */
export function markdownToExcalidraw(
  markdown: string,
  options?: VisualNoteOptions,
): ExcalidrawSceneOutput {
  const ast = parseMarkdownNotes(markdown);
  const layout = layoutVisualNotes(ast, options);
  return generateExcalidrawScene(layout, options);
}

/**
 * Converts Markdown notes into raw Excalidraw elements array.
 * Useful for directly inserting into an existing active canvas via ExcalidrawImperativeAPI.
 */
export function markdownToExcalidrawElements(
  markdown: string,
  options?: VisualNoteOptions,
): any[] {
  const ast = parseMarkdownNotes(markdown);
  const layout = layoutVisualNotes(ast, options);
  return generateExcalidrawElements(layout, options);
}
