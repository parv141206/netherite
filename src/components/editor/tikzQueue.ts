"use client";

// Global cache for compiled TikZ SVGs
const tikzSvgCache = new Map<string, string>();
let tikzjaxLoaded = false;
let tikzjaxLoadPromise: Promise<void> | null = null;

/**
 * Load TikZJax script and style dynamically on demand
 */
export function ensureTikzjaxLoaded(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (tikzjaxLoaded && (window as any).tikzjax) return Promise.resolve();
  if (tikzjaxLoadPromise) return tikzjaxLoadPromise;

  tikzjaxLoadPromise = new Promise((resolve, reject) => {
    // 1. Check if already injected
    if (document.getElementById("netherite-tikzjax-script")) {
      tikzjaxLoaded = true;
      resolve();
      return;
    }

    // 2. Inject CSS for Computer Modern TeX font glyphs
    if (!document.getElementById("netherite-tikzjax-css")) {
      const link = document.createElement("link");
      link.id = "netherite-tikzjax-css";
      link.rel = "stylesheet";
      link.href = "https://tikzjax.com/v1/fonts.css";
      document.head.appendChild(link);
    }

    // 3. Inject JS WebAssembly TeX compiler
    const script = document.createElement("script");
    script.id = "netherite-tikzjax-script";
    script.src = "https://tikzjax.com/v1/tikzjax.js";
    script.async = true;
    script.onload = () => {
      tikzjaxLoaded = true;
      resolve();
    };
    script.onerror = (err) => {
      tikzjaxLoadPromise = null;
      reject(new Error("Failed to load TikZ WebAssembly engine"));
    };
    document.head.appendChild(script);
  });

  return tikzjaxLoadPromise;
}

// Global serial queue to prevent concurrent TeX WebAssembly collisions
let tikzQueue = Promise.resolve<any>(null);

/**
 * Normalize raw user TikZ code ensuring valid LaTeX environment
 */
export function normalizeTikzCode(code: string): string {
  let trimmed = code.trim();
  if (!trimmed) return "";

  // Extract any libraries or packages if provided outside
  const hasBegin = /\\begin\{tikzpicture\}/.test(trimmed);
  const hasEnd = /\\end\{tikzpicture\}/.test(trimmed);

  if (!hasBegin && !hasEnd) {
    trimmed = `\\begin{tikzpicture}\n${trimmed}\n\\end{tikzpicture}`;
  } else if (hasBegin && !hasEnd) {
    trimmed = `${trimmed}\n\\end{tikzpicture}`;
  }

  return trimmed;
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
          await ensureTikzjaxLoaded();

          if (!normalized) {
            resolve({ svg: "" });
            return { svg: "" };
          }

          // Create an off-screen sandbox container
          const sandbox = document.createElement("div");
          sandbox.style.position = "absolute";
          sandbox.style.left = "-99999px";
          sandbox.style.top = "-99999px";
          sandbox.style.opacity = "0";
          sandbox.style.pointerEvents = "none";
          document.body.appendChild(sandbox);

          const scriptEl = document.createElement("script");
          scriptEl.type = "text/tikz";
          scriptEl.textContent = normalized;
          sandbox.appendChild(scriptEl);

          // Wait for TikZJax Mutation Observer to compile and replace with SVG
          const compiledSvg = await new Promise<string>((res, rej) => {
            let timeoutId: any;

            const checkSvg = () => {
              const svgEl = sandbox.querySelector("svg");
              if (svgEl && svgEl.innerHTML.trim().length > 0) {
                clearTimeout(timeoutId);
                observer.disconnect();
                res(svgEl.outerHTML);
                return true;
              }
              return false;
            };

            const observer = new MutationObserver(() => {
              checkSvg();
            });

            observer.observe(sandbox, {
              childList: true,
              subtree: true,
              attributes: true,
            });

            // Trigger TikZJax processing if available
            if ((window as any).tikzjax && typeof (window as any).tikzjax.process === "function") {
              try {
                (window as any).tikzjax.process(sandbox);
              } catch {}
            }

            // Polling fallback every 60ms
            const interval = setInterval(() => {
              if (checkSvg()) clearInterval(interval);
            }, 60);

            timeoutId = setTimeout(() => {
              clearInterval(interval);
              observer.disconnect();
              const svgEl = sandbox.querySelector("svg");
              if (svgEl) {
                res(svgEl.outerHTML);
              } else {
                rej(new Error("TikZ compilation timed out. Verify your LaTeX TikZ syntax."));
              }
            }, 8000);
          });

          // Cleanup sandbox
          try {
            document.body.removeChild(sandbox);
          } catch {}

          const processed = postProcessTikzSvg(compiledSvg, isDark);
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
    svg = svg.replace("<svg", '<svg style="max-width: 100%; height: auto; display: block; margin: auto;"');
  } else {
    svg = svg.replace(/style="([^"]*)"/i, (_full, style: string) => {
      const cleaned = style.replace(/max-width:\s*[^;]+;?/gi, "").trim();
      return `style="${cleaned}${cleaned && !cleaned.endsWith(";") ? ";" : ""} max-width: 100%; height: auto; display: block; margin: auto;"`;
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
