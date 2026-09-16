import type { BoxDimensions } from "./types";

/**
 * Text measurement and wrapping engine.
 * Calibrated for Excalidraw fonts (Virgil hand-drawn, Cascadia monospace).
 * Works reliably in both browser and headless Node/Bun environments.
 */

const LINE_HEIGHT_RATIO = 1.35;

/**
 * Calibrated glyph width ratios per font family.
 * Virgil is slightly wider and loose due to hand-drawn styling (~0.56 of fontSize).
 * Cascadia monospace is fixed-width (~0.60 of fontSize).
 */
const FONT_CHAR_WIDTH_RATIOS: Record<number, number> = {
  1: 0.56, // Virgil (handwritten)
  2: 0.52, // Helvetica (sans-serif)
  3: 0.60, // Cascadia (monospace)
  4: 0.58, // Comic Shanns
};

/**
 * Wraps text to a maximum line length in pixels based on font size and family.
 */
export function wrapText(
  text: string,
  maxWidth: number,
  fontSize: number,
  fontFamily: number = 1,
): string {
  const charWidth = (FONT_CHAR_WIDTH_RATIOS[fontFamily] ?? 0.56) * fontSize;
  const maxCharsPerLine = Math.max(15, Math.floor(maxWidth / charWidth));

  const paragraphs = text.split("\n");
  const wrappedParagraphs: string[] = [];

  for (const para of paragraphs) {
    if (!para.trim()) {
      wrappedParagraphs.push("");
      continue;
    }

    const words = para.split(" ");
    let currentLine = "";

    for (const word of words) {
      if (!currentLine) {
        currentLine = word;
      } else if (currentLine.length + 1 + word.length <= maxCharsPerLine) {
        currentLine += " " + word;
      } else {
        wrappedParagraphs.push(currentLine);
        currentLine = word;
      }
    }

    if (currentLine) {
      wrappedParagraphs.push(currentLine);
    }
  }

  return wrappedParagraphs.join("\n");
}

/**
 * Measures the bounding box of a multiline text block.
 */
export function measureTextBlock(
  text: string,
  fontSize: number,
  fontFamily: number = 1,
): BoxDimensions {
  const lines = text.split("\n");
  const charRatio = FONT_CHAR_WIDTH_RATIOS[fontFamily] ?? 0.56;
  const charWidth = charRatio * fontSize;

  let maxLineWidth = 0;
  for (const line of lines) {
    const lineWidth = line.length * charWidth;
    if (lineWidth > maxLineWidth) {
      maxLineWidth = lineWidth;
    }
  }

  const lineHeight = fontSize * LINE_HEIGHT_RATIO;
  const totalHeight = Math.max(1, lines.length) * lineHeight;

  return {
    width: Math.ceil(maxLineWidth),
    height: Math.ceil(totalHeight),
  };
}

/**
 * Measures an ASCII diagram / code block preserving exact whitespace.
 */
export function measureAsciiBlock(
  code: string,
  fontSize: number = 14,
  padding: number = 16,
): BoxDimensions {
  const lines = code.split("\n");
  const charWidth = 0.60 * fontSize; // Cascadia monospace fixed char width

  let maxChars = 0;
  for (const line of lines) {
    if (line.length > maxChars) {
      maxChars = line.length;
    }
  }

  const lineHeight = fontSize * 1.30;
  const contentWidth = maxChars * charWidth;
  const contentHeight = Math.max(1, lines.length) * lineHeight;

  return {
    width: Math.ceil(contentWidth + padding * 2),
    height: Math.ceil(contentHeight + padding * 2),
  };
}

/**
 * Measures a container box (e.g. rounded rectangle) sized to fit a label.
 */
export function measureContainerBox(
  label: string,
  fontSize: number,
  fontFamily: number = 1,
  paddingX: number = 24,
  paddingY: number = 16,
  minWidth: number = 140,
  minHeight: number = 50,
): BoxDimensions {
  const textDim = measureTextBlock(label, fontSize, fontFamily);

  return {
    width: Math.max(minWidth, textDim.width + paddingX * 2),
    height: Math.max(minHeight, textDim.height + paddingY * 2),
  };
}
