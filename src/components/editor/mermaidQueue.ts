"use client";

import mermaid from "mermaid";

// Global serial queue for Mermaid renders to prevent concurrent DOM mutations
let renderQueue = Promise.resolve<any>(null);

export function renderMermaidQueued(
  id: string,
  code: string
): Promise<{ svg: string }> {
  return new Promise((resolve, reject) => {
    renderQueue = renderQueue
      .then(async () => {
        try {
          const res = await mermaid.render(id, code);
          resolve(res);
          return res;
        } catch (err) {
          reject(err);
          return null;
        } finally {
          // Clean up ONLY the temporary DOM containers created for this specific ID
          if (typeof document !== "undefined") {
            const phantom = document.getElementById(id);
            if (phantom) phantom.remove();
            const errorEl = document.getElementById(`d${id}`);
            if (errorEl) errorEl.remove();
          }
        }
      })
      .catch(() => null);
  });
}
