"use client";

// Global cache for compiled TikZ SVGs
const tikzSvgCache = new Map<string, string>();
let tikzIframe: HTMLIFrameElement | null = null;
let tikzIframeReadyPromise: Promise<HTMLIFrameElement> | null = null;

/**
 * Load TikZJax inside an isolated sandboxed iframe to prevent global ReadableStream pollution
 */
export function ensureTikzjaxLoaded(): Promise<HTMLIFrameElement> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Window is undefined"));
  }

  // Clean up any legacy script from main document head to restore native streams
  const legacyScript = document.getElementById("netherite-tikzjax-script");
  if (legacyScript) {
    try {
      legacyScript.remove();
    } catch {}
  }

  if (tikzIframe && tikzIframe.contentDocument) {
    return Promise.resolve(tikzIframe);
  }
  if (tikzIframeReadyPromise) return tikzIframeReadyPromise;

  tikzIframeReadyPromise = new Promise<HTMLIFrameElement>((resolve, reject) => {
    try {
      const iframe = document.createElement("iframe");
      iframe.id = "netherite-tikz-sandbox-frame";
      iframe.style.position = "fixed";
      iframe.style.left = "-99999px";
      iframe.style.top = "-99999px";
      iframe.style.width = "1px";
      iframe.style.height = "1px";
      iframe.style.opacity = "0";
      iframe.style.pointerEvents = "none";
      iframe.style.visibility = "hidden";
      document.body.appendChild(iframe);

      const doc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!doc) {
        reject(new Error("Unable to create sandboxed iframe for TikZ"));
        return;
      }

      doc.open();
      doc.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <link rel="stylesheet" href="https://tikzjax.com/v1/fonts.css" />
  <script src="https://tikzjax.com/v1/tikzjax.js"></script>
</head>
<body>
</body>
</html>`);
      doc.close();

      const script = doc.querySelector("script");
      if (script) {
        script.onload = () => {
          tikzIframe = iframe;
          resolve(iframe);
        };
        script.onerror = () => {
          tikzIframeReadyPromise = null;
          reject(
            new Error(
              "Failed to load TikZ WebAssembly in sandbox. Check your network."
            )
          );
        };
      } else {
        tikzIframe = iframe;
        resolve(iframe);
      }
    } catch (err: any) {
      tikzIframeReadyPromise = null;
      reject(err);
    }
  });

  return tikzIframeReadyPromise;
}

// Global serial queue to prevent concurrent TeX WebAssembly memory collisions
let tikzQueue = Promise.resolve<any>(null);

/**
 * Normalize raw user TikZ code ensuring valid LaTeX environment & color aliases
 */
export function normalizeTikzCode(code: string): string {
  let trimmed = code.trim();
  if (!trimmed) return "";

  // Strip markdown code fences if present (e.g. ```tikz ... ```)
  trimmed = trimmed.replace(/^```(?:tikz|latex-tikz|pgf|latex|tex)?\s*/i, "");
  trimmed = trimmed.replace(/```\s*$/i, "").trim();

  // If user didn't include \begin{tikzpicture}, wrap it
  const hasBegin = /\\begin\{tikzpicture\}/.test(trimmed);
  const hasEnd = /\\end\{tikzpicture\}/.test(trimmed);

  let tikzBody = trimmed;
  if (!hasBegin && !hasEnd) {
    tikzBody = `\\begin{tikzpicture}\n${trimmed}\n\\end{tikzpicture}`;
  } else if (hasBegin && !hasEnd) {
    tikzBody = `${trimmed}\n\\end{tikzpicture}`;
  }

  // Prepend standard color definitions and libraries if not already declared
  const standardPreamble = `\\usetikzlibrary{arrows.meta, positioning, automata, backgrounds, shapes, calc, fit, matrix, trees}
\\definecolor{indigo}{RGB}{99,102,241}
\\definecolor{emerald}{RGB}{16,185,129}
\\definecolor{rose}{RGB}{244,63,94}
\\definecolor{amber}{RGB}{245,158,11}
\\definecolor{sky}{RGB}{14,165,233}
\\definecolor{violet}{RGB}{139,92,246}
\\definecolor{fuchsia}{RGB}{217,70,239}
\\definecolor{slate}{RGB}{100,116,139}
`;

  if (!tikzBody.includes("\\definecolor{indigo}")) {
    tikzBody = `${standardPreamble}\n${tikzBody}`;
  }

  return tikzBody.trim();
}

/**
 * Render TikZ code into SVG using client-side WebAssembly TeX engine
 */
export function renderTikzQueued(
  code: string,
  isDark: boolean = false
): Promise<{ svg: string }> {
  const normalized = normalizeTikzCode(code);
  const cacheKey = `${normalized}__dark:${isDark}`;

  if (tikzSvgCache.has(cacheKey)) {
    return Promise.resolve({ svg: tikzSvgCache.get(cacheKey)! });
  }

  return new Promise((resolve, reject) => {
    tikzQueue = tikzQueue
      .then(async () => {
        try {
          const iframe = await ensureTikzjaxLoaded();
          const doc = iframe.contentDocument;
          const win = iframe.contentWindow as any;

          if (!doc || !win) {
            throw new Error("TikZ sandbox iframe not ready");
          }

          if (!normalized) {
            resolve({ svg: "" });
            return { svg: "" };
          }

          // Clear previous scripts/svgs in iframe body
          doc.body.innerHTML = "";

          const scriptEl = doc.createElement("script");
          scriptEl.setAttribute("type", "text/tikz");
          scriptEl.appendChild(doc.createTextNode(normalized));
          doc.body.appendChild(scriptEl);

          // Trigger TikZJax processing inside the isolated iframe realm
          const processFn = win.__tikzjax_process || win.onload;
          if (typeof processFn === "function") {
            try {
              await processFn();
            } catch (err: any) {
              doc.body.innerHTML = "";
              const msg = err?.message || String(err);
              throw new Error(`LaTeX Error: ${msg}`);
            }
          } else {
            win.dispatchEvent(new Event("load"));
          }

          // Wait for SVG generation with polling fallback
          const finalSvgHtml = await new Promise<string>((res, rej) => {
            const check = () => {
              const svgEl = doc.body.querySelector("svg");
              if (svgEl && svgEl.innerHTML.trim().length > 0) {
                res(svgEl.outerHTML);
                return true;
              }
              return false;
            };

            if (check()) return;

            const observer = new MutationObserver(() => {
              if (check()) observer.disconnect();
            });
            observer.observe(doc.body, { childList: true, subtree: true });

            const interval = setInterval(() => {
              if (check()) {
                clearInterval(interval);
                observer.disconnect();
              }
            }, 60);

            setTimeout(() => {
              clearInterval(interval);
              observer.disconnect();
              const svgEl = doc.body.querySelector("svg");
              if (svgEl) {
                res(svgEl.outerHTML);
              } else {
                rej(
                  new Error(
                    "TikZ compilation timed out. Please verify your LaTeX TikZ syntax."
                  )
                );
              }
            }, 12000);
          });

          // Cleanup iframe body
          doc.body.innerHTML = "";

          const processed = postProcessTikzSvg(finalSvgHtml, isDark);
          tikzSvgCache.set(cacheKey, processed);
          resolve({ svg: processed });
          return { svg: processed };
        } catch (err: any) {
          reject(err);
          return null;
        }
      })
      .catch((err) => {
        reject(err);
        return null;
      });
  });
}

/**
 * Post-process compiled TikZ SVG for responsiveness and theme adaptation
 */
export function postProcessTikzSvg(rawSvg: string, isDark: boolean): string {
  if (!rawSvg) return "";

  let svg = rawSvg;

  // Ensure responsive sizing
  if (!svg.includes('style="')) {
    svg = svg.replace(
      "<svg",
      '<svg style="max-width: 100%; height: auto; display: block; margin: auto;"'
    );
  } else {
    svg = svg.replace(/style="([^"]*)"/i, (_full, style: string) => {
      const cleaned = style.replace(/max-width:\s*[^;]+;?/gi, "").trim();
      return `style="${cleaned}${
        cleaned && !cleaned.endsWith(";") ? ";" : ""
      } max-width: 100%; height: auto; display: block; margin: auto;"`;
    });
  }

  // Dark mode theme inversion & contrast enhancement for TeX strokes and text
  if (isDark) {
    const darkModeStyles = `
      <style>
        .tikz text, .tikz tspan { fill: var(--foreground, #f3f4f6) !important; color: var(--foreground, #f3f4f6) !important; }
        .tikz path[stroke="#000000"], .tikz path[stroke="#000"], .tikz path:not([stroke]) { stroke: var(--foreground, #f3f4f6); }
        .tikz path[fill="#000000"], .tikz path[fill="#000"] { fill: var(--foreground, #f3f4f6); }
        .tikz g { color: var(--foreground, #f3f4f6); }
      </style>
    `;
    if (svg.includes("</svg>")) {
      svg = svg.replace("</svg>", `${darkModeStyles}</svg>`);
    }
  }

  return svg;
}
