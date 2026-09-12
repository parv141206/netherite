"use client";

import mermaid from "mermaid";

// Global serial queue for Mermaid renders to prevent concurrent DOM mutations.
// Mermaid v11+ shares global state and mutates the DOM during render(), so
// concurrent calls cause "null firstChild" errors and stale DOM references.
// IMPORTANT: mermaid.initialize() must also be serialized — calling it from
// multiple components at different times corrupts the global config and causes
// "Could not find a suitable point for the given distance" path-routing errors.
let renderQueue = Promise.resolve<any>(null);

/**
 * Post-processes a raw Mermaid SVG to ensure responsive scaling,
 * correct light-mode colours, and clean typography.
 */
export function postProcessSvg(rawSvg: string, isDark: boolean): string {
  let svg = rawSvg;

  // 1. Replace Mermaid's hardcoded max-width with responsive value
  svg = svg.replace(
    /style="([^"]*)"/i,
    (_full, style: string) => {
      const cleaned = style
        .replace(/max-width:\s*[\d.]+px\s*;?/gi, "")
        .replace(/^\s*;\s*/, "")
        .trim();
      return `style="${cleaned}${cleaned && !cleaned.endsWith(";") ? ";" : ""} max-width: 100%; height: auto;"`;
    }
  );

  // 2. Light mode: cleanup dark theme fills that might leak through
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
      .replace(/fill="#1e293b"/gi, 'fill="#f8fafc"')
      .replace(/fill="#0f172a"/gi, 'fill="#f8fafc"')
      .replace(/fill="#020617"/gi, 'fill="#f8fafc"')
      .replace(/fill="#18181b"/gi, 'fill="#f8fafc"')
      .replace(/fill="#111827"/gi, 'fill="#f8fafc"')
      .replace(/fill="#1f2937"/gi, 'fill="#f8fafc"')
      .replace(/fill="#374151"/gi, 'fill="#e2e8f0"')
      .replace(/fill="#334155"/gi, 'fill="#e2e8f0"');
  }

  // 3. Inject custom style rules for polished rendering
  const customCSS = isDark
    ? `<style>
        .cluster rect { fill: #1e293b !important; stroke: #475569 !important; rx: 8px !important; }
        .node rect, .node circle, .node ellipse, .node polygon { rx: 6px; }
        text { font-family: Inter, system-ui, sans-serif !important; }
        .nodeLabel, .edgeLabel, .label { font-family: Inter, system-ui, sans-serif !important; }
      </style>`
    : `<style>
        .cluster rect { fill: #f8fafc !important; stroke: #cbd5e1 !important; rx: 8px !important; }
        .node rect, .node circle, .node ellipse, .node polygon { rx: 6px; }
        text { font-family: Inter, system-ui, sans-serif !important; }
        .nodeLabel, .edgeLabel, .label { font-family: Inter, system-ui, sans-serif !important; }
      </style>`;

  if (svg.includes("</svg>")) {
    svg = svg.replace("</svg>", `${customCSS}</svg>`);
  }

  return svg;
}

/**
 * Build the Mermaid config object for a given theme.
 * Centralised here so every call site gets the same config.
 */
function buildMermaidConfig(isDark: boolean) {
  return {
    startOnLoad: false,
    suppressErrorRendering: true,
    theme: (isDark ? "dark" : "neutral") as any,
    securityLevel: "loose" as const,
    fontFamily:
      "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    flowchart: {
      htmlLabels: true,
      useMaxWidth: true,
      padding: 20,
      nodeSpacing: 45,
      rankSpacing: 45,
      curve: "linear" as const, // "linear" avoids dagre-d3 edge label calculation errors on "basis"
    },
    sequence: {
      useMaxWidth: true,
      showSequenceNumbers: true,
    },
    themeVariables: isDark
      ? {
          darkMode: true,
          background: "transparent",
          primaryColor: "#1e293b",
          primaryTextColor: "#f1f5f9",
          primaryBorderColor: "#475569",
          lineColor: "#94a3b8",
          secondaryColor: "#0f172a",
          tertiaryColor: "#1e293b",
          nodeBorder: "#475569",
          mainBkg: "#1e293b",
          nodeTextColor: "#f8fafc",
          clusterBkg: "#1e293b",
          clusterBorder: "#475569",
          titleColor: "#f8fafc",
          edgeLabelBackground: "#0f172a",
          actorBkg: "#1e293b",
          actorBorder: "#475569",
          actorTextColor: "#f8fafc",
          actorLineColor: "#64748b",
          signalColor: "#e2e8f0",
          signalTextColor: "#f1f5f9",
          labelBoxBkgColor: "#1e293b",
          labelBoxBorderColor: "#475569",
          labelTextColor: "#f1f5f9",
          loopTextColor: "#e2e8f0",
          activationBorderColor: "#64748b",
          activationBkgColor: "#334155",
          sequenceNumberColor: "#f8fafc",
        }
      : {
          darkMode: false,
          background: "transparent",
          primaryColor: "#ffffff",
          primaryTextColor: "#0f172a",
          primaryBorderColor: "#cbd5e1",
          lineColor: "#64748b",
          secondaryColor: "#f8fafc",
          tertiaryColor: "#f1f5f9",
          nodeBorder: "#cbd5e1",
          mainBkg: "#ffffff",
          nodeTextColor: "#0f172a",
          clusterBkg: "#f8fafc",
          clusterBorder: "#cbd5e1",
          titleColor: "#0f172a",
          edgeLabelBackground: "#ffffff",
          actorBkg: "#ffffff",
          actorBorder: "#cbd5e1",
          actorTextColor: "#0f172a",
          actorLineColor: "#94a3b8",
          signalColor: "#334155",
          signalTextColor: "#0f172a",
          labelBoxBkgColor: "#f8fafc",
          labelBoxBorderColor: "#cbd5e1",
          labelTextColor: "#0f172a",
          loopTextColor: "#334155",
          activationBorderColor: "#94a3b8",
          activationBkgColor: "#e2e8f0",
          sequenceNumberColor: "#ffffff",
        },
  };
}

/**
 * Queue a Mermaid render. This serialises all renders across the entire app
 * (embedded editor blocks, Mermaid Studio, Copilot sidebar) to prevent the
 * global mermaid state from being corrupted by concurrent initialize/render calls.
 *
 * @param id   Unique DOM ID for this render (will be cleaned up automatically)
 * @param code Raw Mermaid diagram source
 * @param isDark Whether dark mode is active (used to pick theme config)
 */
export function renderMermaidQueued(
  id: string,
  code: string,
  isDark: boolean = false
): Promise<{ svg: string }> {
  return new Promise((resolve, reject) => {
    renderQueue = renderQueue
      .then(async () => {
        try {
          // Initialize immediately before render inside the serial queue
          // so no other component can call initialize() in between.
          mermaid.initialize(buildMermaidConfig(isDark));

          const res = await mermaid.render(id, code);
          resolve(res);
          return res;
        } catch (err) {
          reject(err);
          return null;
        } finally {
          if (typeof document !== "undefined") {
            const phantom = document.getElementById(id);
            if (phantom) phantom.remove();
            const errorEl = document.getElementById(`d${id}`);
            if (errorEl) errorEl.remove();

            document
              .querySelectorAll(
                'body > svg[id^="dmermaid"], body > div[id^="dmermaid"], body > .error-icon, body > svg[aria-roledescription="error"]'
              )
              .forEach((el) => el.remove());
          }
        }
      })
      .catch(() => null);
  });
}
