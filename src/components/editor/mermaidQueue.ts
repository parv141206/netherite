"use client";

import mermaid from "mermaid";

let initializedTheme: string | null = null;

function ensureInitialized(isDark: boolean) {
  const targetTheme = isDark ? "dark" : "default";
  if (initializedTheme === targetTheme) return;

  try {
    mermaid.initialize({
      startOnLoad: false,
      suppressErrorRendering: true,
      securityLevel: "loose",
      theme: (isDark ? "dark" : "default") as any,
      fontFamily:
        "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      flowchart: {
        useMaxWidth: true,
        htmlLabels: true,
      },
      sequence: {
        useMaxWidth: true,
      },
    });
    initializedTheme = targetTheme;
  } catch (e) {
    console.warn("Mermaid initialize warning:", e);
  }
}

// Global serial queue to prevent concurrent DOM collisions
let renderQueue = Promise.resolve<any>(null);

/**
 * Standard, robust Mermaid rendering using official Mermaid library.
 * Serialized to prevent concurrent DOM collisions.
 */
export function renderMermaidQueued(
  _id: string,
  code: string,
  isDark: boolean = false
): Promise<{ svg: string }> {
  return new Promise((resolve, reject) => {
    renderQueue = renderQueue
      .then(async () => {
        try {
          ensureInitialized(isDark);
          const cleanCode = code.trim();
          if (!cleanCode) {
            resolve({ svg: "" });
            return { svg: "" };
          }

          // Generate a clean, unique ID for this render
          const renderId = `mmd-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;
          const res = await mermaid.render(renderId, cleanCode);
          resolve(res);
          return res;
        } catch (err) {
          reject(err);
          return null;
        }
      })
      .catch(() => null);
  });
}

/**
 * Standard responsive SVG sizing: ensures SVG fits within its container smoothly.
 */
export function postProcessSvg(rawSvg: string, _isDark: boolean): string {
  if (!rawSvg) return "";

  // Replace hardcoded max-width with responsive 100% max-width
  let svg = rawSvg.replace(/style="([^"]*)"/i, (_full, style: string) => {
    const cleaned = style.replace(/max-width:\s*[\d.]+px\s*;?/gi, "").trim();
    return `style="${cleaned}${cleaned && !cleaned.endsWith(";") ? ";" : ""} max-width: 100%; height: auto;"`;
  });

  if (!svg.includes("max-width: 100%")) {
    svg = svg.replace(/<svg\b/i, '<svg style="max-width: 100%; height: auto;" ');
  }

  return svg;
}
