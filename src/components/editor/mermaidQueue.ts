"use client";

import mermaid from "mermaid";

// Global serial queue for Mermaid renders to prevent concurrent DOM mutations.
// Mermaid v11+ shares global state and mutates the DOM during render(), so
// concurrent calls cause "null firstChild" errors and stale DOM references.
let renderQueue = Promise.resolve<any>(null);

// Dedicated hidden container for rendering to avoid body-level pollution
let renderContainer: HTMLDivElement | null = null;

function getOrCreateRenderContainer(): HTMLDivElement {
  if (renderContainer && document.body.contains(renderContainer)) {
    return renderContainer;
  }
  renderContainer = document.createElement("div");
  renderContainer.id = "mermaid-render-sandbox";
  renderContainer.setAttribute("aria-hidden", "true");
  renderContainer.style.cssText =
    "position:fixed;top:-9999px;left:-9999px;width:4000px;height:4000px;overflow:hidden;pointer-events:none;visibility:hidden;z-index:-1;";
  document.body.appendChild(renderContainer);
  return renderContainer;
}

/**
 * Post-processes a raw Mermaid SVG to guarantee correct sizing, remove
 * hardcoded dark fills when in light mode, and ensure responsive layout.
 */
export function postProcessSvg(
  rawSvg: string,
  isDark: boolean
): string {
  let svg = rawSvg;

  // 1. Remove hardcoded max-width that Mermaid v11 injects (e.g., max-width: 798.34px)
  //    and set responsive sizing instead
  svg = svg.replace(
    /style="([^"]*)"/i,
    (fullMatch, styleContent: string) => {
      let cleaned = styleContent
        .replace(/max-width:\s*[\d.]+px\s*;?/gi, "")
        .replace(/height:\s*[\d.]+px\s*;?/gi, "")
        .trim();
      // Keep width if present, but also add responsive constraints
      if (cleaned && !cleaned.endsWith(";")) cleaned += ";";
      return `style="${cleaned} max-width: 100%; height: auto; display: block;"`;
    }
  );

  // 2. If the SVG has width/height attributes (common in Mermaid v11), remove
  //    them so the SVG scales responsively via CSS
  svg = svg.replace(
    /<svg\s([^>]*?)>/i,
    (match, attrs: string) => {
      // Extract viewBox if present
      const viewBoxMatch = attrs.match(/viewBox="([^"]*)"/i);
      
      // Remove explicit width and height attributes
      let cleaned = attrs
        .replace(/\bwidth="[\d.]+(?:px)?"/gi, "")
        .replace(/\bheight="[\d.]+(?:px)?"/gi, "");

      // If no viewBox exists but we had width/height, construct one
      if (!viewBoxMatch) {
        const wMatch = attrs.match(/\bwidth="([\d.]+)/i);
        const hMatch = attrs.match(/\bheight="([\d.]+)/i);
        if (wMatch && hMatch) {
          cleaned += ` viewBox="0 0 ${wMatch[1]} ${hMatch[1]}"`;
        }
      }

      return `<svg ${cleaned.trim()}>`;
    }
  );

  // 3. Light mode: strip hardcoded dark fills from Mermaid's output
  if (!isDark) {
    svg = svg
      .replace(/fill:\s*#1e293b/gi, "fill:#f8fafc")
      .replace(/fill:\s*#0f172a/gi, "fill:#f8fafc")
      .replace(/fill:\s*#020617/gi, "fill:#f8fafc")
      .replace(/fill:\s*#18181b/gi, "fill:#f8fafc")
      .replace(/fill:\s*#111827/gi, "fill:#f8fafc")
      .replace(/fill:\s*#1f2937/gi, "fill:#f8fafc")
      .replace(/fill:\s*#374151/gi, "fill:#e2e8f0")
      .replace(/fill:\s*#334155/gi, "fill:#e2e8f0")
      // Rect element fills (attribute style)
      .replace(/fill="#1e293b"/gi, 'fill="#f8fafc"')
      .replace(/fill="#0f172a"/gi, 'fill="#f8fafc"')
      .replace(/fill="#020617"/gi, 'fill="#f8fafc"')
      .replace(/fill="#18181b"/gi, 'fill="#f8fafc"')
      .replace(/fill="#111827"/gi, 'fill="#f8fafc"')
      .replace(/fill="#1f2937"/gi, 'fill="#f8fafc"')
      .replace(/fill="#374151"/gi, 'fill="#e2e8f0"')
      .replace(/fill="#334155"/gi, 'fill="#e2e8f0"')
      // Text colour corrections for light mode
      .replace(/color:\s*#fff(?:fff)?\b/gi, "color:#0f172a")
      .replace(/fill:\s*#fff(?:fff)?\b/gi, "fill:#0f172a");
  }

  // 4. Inject custom style rules for polished rendering
  const customCSS = isDark
    ? `<style>
        .cluster rect { fill: #1e293b !important; stroke: #475569 !important; rx: 8px !important; }
        .node rect, .node circle, .node ellipse, .node polygon { rx: 6px; }
        text { font-family: Inter, system-ui, sans-serif !important; }
        .nodeLabel, .edgeLabel, .label { font-family: Inter, system-ui, sans-serif !important; }
        .activation0, .activation1, .activation2 { fill: #334155 !important; stroke: #64748b !important; }
        rect.rect { rx: 4px !important; }
      </style>`
    : `<style>
        .cluster rect { fill: #f1f5f9 !important; stroke: #cbd5e1 !important; rx: 8px !important; }
        .node rect, .node circle, .node ellipse, .node polygon { rx: 6px; }
        text { font-family: Inter, system-ui, sans-serif !important; }
        .nodeLabel, .edgeLabel, .label { font-family: Inter, system-ui, sans-serif !important; }
        .activation0, .activation1, .activation2 { fill: #e2e8f0 !important; stroke: #94a3b8 !important; }
        rect.rect { rx: 4px !important; }
      </style>`;

  if (svg.includes("</svg>")) {
    svg = svg.replace("</svg>", `${customCSS}</svg>`);
  }

  return svg;
}

export function renderMermaidQueued(
  id: string,
  code: string
): Promise<{ svg: string }> {
  return new Promise((resolve, reject) => {
    renderQueue = renderQueue
      .then(async () => {
        try {
          // Use our sandboxed container for rendering
          const container = getOrCreateRenderContainer();
          
          // Clear any leftover elements
          container.innerHTML = "";

          const res = await mermaid.render(id, code, container);
          resolve(res);
          return res;
        } catch (err) {
          reject(err);
          return null;
        } finally {
          // Aggressive cleanup of any DOM elements Mermaid injected
          if (typeof document !== "undefined") {
            // Clean specific render ID elements
            const phantom = document.getElementById(id);
            if (phantom) phantom.remove();
            const errorEl = document.getElementById(`d${id}`);
            if (errorEl) errorEl.remove();

            // Clean any error elements Mermaid v11 sprays into body
            document
              .querySelectorAll(
                'body > svg[id^="dmermaid"], body > div[id^="dmermaid"], body > .error-icon, body > svg[aria-roledescription="error"]'
              )
              .forEach((el) => el.remove());

            // Clear the sandbox container
            const container = document.getElementById("mermaid-render-sandbox");
            if (container) container.innerHTML = "";
          }
        }
      })
      .catch(() => null);
  });
}
