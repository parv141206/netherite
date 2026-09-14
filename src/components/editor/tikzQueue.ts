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

  // Inject TikZ TeX fonts CSS into main document so SVG font glyphs render with exact TeX metrics
  if (typeof document !== "undefined" && !document.getElementById("netherite-tikz-fonts")) {
    try {
      const link = document.createElement("link");
      link.id = "netherite-tikz-fonts";
      link.rel = "stylesheet";
      link.href = "https://tikzjax.com/v1/fonts.css";
      document.head.appendChild(link);
    } catch {}
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
 * Standard TikZ libraries bundled in TikZJax
 */
const DEFAULT_TIKZ_LIBRARIES = [
  "arrows.meta",
  "positioning",
  "calc",
  "automata",
  "backgrounds",
  "shapes",
  "shapes.geometric",
  "shapes.misc",
  "shapes.symbols",
  "shapes.arrows",
  "shapes.callouts",
  "fit",
  "matrix",
  "trees",
  "decorations",
  "decorations.pathmorphing",
  "decorations.pathreplacing",
  "decorations.markings",
  "intersections",
  "through",
  "fadings",
  "shadows",
  "patterns",
  "mindmap",
  "calendar",
  "scopes",
  "petri",
  "er",
  "plotmarks",
];

/**
 * Normalize raw user TikZ code ensuring valid LaTeX environment, standalone envelope stripping, & color aliases
 */
export function normalizeTikzCode(code: string): string {
  let trimmed = code.trim();
  if (!trimmed) return "";

  // Strip markdown code fences if present (e.g. ```tikz ... ```)
  trimmed = trimmed.replace(/^```(?:tikz|latex-tikz|pgf|latex|tex)?\s*/i, "");
  trimmed = trimmed.replace(/```\s*$/i, "").trim();

  // Strip LaTeX standalone / article envelopes if provided by user
  trimmed = trimmed.replace(/\\documentclass(?:\[[^\]]*\])?\{[^}]*\}/gi, "");
  trimmed = trimmed.replace(/\\usepackage(?:\[[^\]]*\])?\{[^}]*\}/gi, "");
  trimmed = trimmed.replace(/\\begin\{document\}/gi, "");
  trimmed = trimmed.replace(/\\end\{document\}/gi, "");

  // Collect any custom \usetikzlibrary definitions
  const userLibraries = new Set<string>(DEFAULT_TIKZ_LIBRARIES);
  const libRegex = /\\usetikzlibrary\{([^}]+)\}/gi;
  let match: RegExpExecArray | null;
  while ((match = libRegex.exec(trimmed)) !== null) {
    if (match[1]) {
      match[1].split(",").forEach((l) => {
        const clean = l.trim();
        if (clean) userLibraries.add(clean);
      });
    }
  }

  // Remove individual \usetikzlibrary calls from body
  trimmed = trimmed.replace(/\\usetikzlibrary\{[^}]*\}\s*/gi, "").trim();

  // If user didn't include \begin{tikzpicture}, wrap it
  const hasBegin = /\\begin\{tikzpicture\}/.test(trimmed);
  const hasEnd = /\\end\{tikzpicture\}/.test(trimmed);

  let tikzBody = trimmed;
  if (!hasBegin && !hasEnd) {
    tikzBody = `\\begin{tikzpicture}\n${trimmed}\n\\end{tikzpicture}`;
  } else if (hasBegin && !hasEnd) {
    tikzBody = `${trimmed}\n\\end{tikzpicture}`;
  }

  // Prepend standard color definitions and combined libraries
  const standardPreamble = `\\usetikzlibrary{${Array.from(userLibraries).join(", ")}}
\\definecolor{indigo}{RGB}{99,102,241}
\\definecolor{emerald}{RGB}{16,185,129}
\\definecolor{rose}{RGB}{244,63,94}
\\definecolor{amber}{RGB}{245,158,11}
\\definecolor{sky}{RGB}{14,165,233}
\\definecolor{violet}{RGB}{139,92,246}
\\definecolor{fuchsia}{RGB}{217,70,239}
\\definecolor{slate}{RGB}{100,116,139}
\\definecolor{zinc}{RGB}{113,113,122}
\\definecolor{teal}{RGB}{20,184,166}
\\definecolor{cyan}{RGB}{6,182,212}
\\definecolor{orange}{RGB}{249,115,22}
\\definecolor{lime}{RGB}{132,204,22}
\\definecolor{pink}{RGB}{236,72,153}
\\definecolor{purple}{RGB}{168,85,247}
`;

  return `${standardPreamble}\n${tikzBody}`.trim();
}

export function prepareStandaloneLatex(code: string): string {
  let trimmed = (code || "").trim();
  if (!trimmed) return "";

  trimmed = trimmed.replace(/^```(?:tikz|latex-tikz|pgf|latex|tex)?\s*/i, "");
  trimmed = trimmed.replace(/```\s*$/i, "").trim();

  const standardColorDefs = `
\\definecolor{indigo}{RGB}{99,102,241}
\\definecolor{emerald}{RGB}{16,185,129}
\\definecolor{rose}{RGB}{244,63,94}
\\definecolor{amber}{RGB}{245,158,11}
\\definecolor{sky}{RGB}{14,165,233}
\\definecolor{violet}{RGB}{139,92,246}
\\definecolor{fuchsia}{RGB}{217,70,239}
\\definecolor{slate}{RGB}{100,116,139}
\\definecolor{zinc}{RGB}{113,113,122}
\\definecolor{teal}{RGB}{20,184,166}
\\definecolor{cyan}{RGB}{6,182,212}
\\definecolor{orange}{RGB}{249,115,22}
\\definecolor{lime}{RGB}{132,204,22}
\\definecolor{pink}{RGB}{236,72,153}
\\definecolor{purple}{RGB}{168,85,247}
`;

  const hasDocClass = /\\documentclass(?:\[[^\]]*\])?\{[^}]*\}/.test(trimmed);
  const hasDocEnv = /\\begin\{document\}/.test(trimmed);

  // If user provided a complete standalone LaTeX document, preserve their exact preamble and document!
  if (hasDocClass && hasDocEnv) {
    if (!trimmed.includes("\\definecolor{indigo}")) {
      trimmed = trimmed.replace(/\\begin\{document\}/i, `${standardColorDefs}\n\\begin{document}`);
    }
    return trimmed;
  }

  // Otherwise, extract any user \usepackage and \usetikzlibrary declarations
  const userPackages = new Set<string>([
    "tikz",
    "tikz-3dplot",
    "pgfplots",
    "pgfplotstable",
    "amsmath",
    "amssymb",
    "amsfonts",
    "mathtools",
    "bm",
    "xcolor",
    "circuitikz",
  ]);

  const pkgRegex = /\\usepackage(?:\[[^\]]*\])?\{([^}]+)\}/gi;
  let pkgMatch: RegExpExecArray | null;
  while ((pkgMatch = pkgRegex.exec(trimmed)) !== null) {
    if (pkgMatch[1]) {
      pkgMatch[1].split(",").forEach((p) => {
        const clean = p.trim();
        if (clean && !clean.includes("cmbright")) userPackages.add(clean);
      });
    }
  }

  // Collect user libraries
  const userLibraries = new Set<string>(DEFAULT_TIKZ_LIBRARIES);
  const libRegex = /\\usetikzlibrary\{([^}]+)\}/gi;
  let match: RegExpExecArray | null;
  while ((match = libRegex.exec(trimmed)) !== null) {
    if (match[1]) {
      match[1].split(",").forEach((l) => {
        const clean = l.trim();
        if (clean) userLibraries.add(clean);
      });
    }
  }

  // Clean standalone markers if partial document
  let cleanBody = trimmed;
  cleanBody = cleanBody.replace(/\\documentclass(?:\[[^\]]*\])?\{[^}]*\}/gi, "");
  cleanBody = cleanBody.replace(/\\usepackage(?:\[[^\]]*\])?\{[^}]*\}/gi, "");
  cleanBody = cleanBody.replace(/\\usetikzlibrary\{[^}]*\}\s*/gi, "");
  cleanBody = cleanBody.replace(/\\begin\{document\}/gi, "");
  cleanBody = cleanBody.replace(/\\end\{document\}/gi, "").trim();

  const hasBegin = /\\begin\{tikzpicture\}/.test(cleanBody);
  const hasEnd = /\\end\{tikzpicture\}/.test(cleanBody);

  let body = cleanBody;
  if (!hasBegin && !hasEnd) {
    body = `\\begin{tikzpicture}\n${cleanBody}\n\\end{tikzpicture}`;
  } else if (hasBegin && !hasEnd) {
    body = `${cleanBody}\n\\end{tikzpicture}`;
  }

  const packageImports = Array.from(userPackages)
    .map((p) => `\\usepackage{${p}}`)
    .join("\n");

  return `\\documentclass[tikz,border=12pt]{standalone}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
${packageImports}
\\usetikzlibrary{${Array.from(userLibraries).join(", ")}}
${standardColorDefs}

\\begin{document}
${body}
\\end{document}`;
}

/**
 * Fast TeX compiler using full TeXLive engine
 */
async function compileWithTeXEngine(standaloneDoc: string): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
    const response = await fetch("https://kroki.io/tikz/svg", {
      method: "POST",
      headers: { "Content-Type": "text/plain; charset=utf-8" },
      body: standaloneDoc,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text();
      const cleanErr = errText
        .replace(/^Error \d+:\s*/i, "")
        .replace(/latex: Not reading from [^\n]*/gi, "")
        .trim();
      throw new Error(cleanErr || `Compilation failed (HTTP ${response.status})`);
    }

    const svg = await response.text();
    if (!svg || !svg.includes("<svg")) {
      throw new Error("Invalid SVG received from TeX engine");
    }

    return svg;
  } catch (err: any) {
    clearTimeout(timeoutId);
    throw err;
  }
}

/**
 * Fallback client-side WebAssembly compiler running inside isolated sandboxed iframe
 */
async function compileWithLocalSandbox(normalized: string): Promise<string> {
  const iframe = await ensureTikzjaxLoaded();
  const doc = iframe.contentDocument;
  const win = iframe.contentWindow as any;

  if (!doc || !win) {
    throw new Error("TikZ sandbox iframe not ready");
  }

  doc.body.innerHTML = "";

  const scriptEl = doc.createElement("script");
  scriptEl.setAttribute("type", "text/tikz");
  scriptEl.appendChild(doc.createTextNode(normalized));
  doc.body.appendChild(scriptEl);

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

  return new Promise<string>((res, rej) => {
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
        rej(new Error("TikZ compilation timed out. Please verify your LaTeX TikZ syntax."));
      }
    }, 8000);
  }).finally(() => {
    try {
      doc.body.innerHTML = "";
    } catch {}
  });
}

/**
 * Render TikZ code into SVG using high-speed TeX engine with local WebAssembly fallback
 */
export function renderTikzQueued(
  code: string,
  isDark: boolean = false
): Promise<{ svg: string }> {
  const normalized = normalizeTikzCode(code);
  if (!normalized) {
    return Promise.resolve({ svg: "" });
  }

  const cacheKey = `${normalized}__dark:${isDark}`;
  if (tikzSvgCache.has(cacheKey)) {
    return Promise.resolve({ svg: tikzSvgCache.get(cacheKey)! });
  }

  const standaloneDoc = prepareStandaloneLatex(code);

  return new Promise((resolve, reject) => {
    tikzQueue = tikzQueue
      .then(async () => {
        try {
          let rawSvg: string;

          // Attempt fast TeXLive compiler first
          try {
            rawSvg = await compileWithTeXEngine(standaloneDoc);
          } catch (onlineErr: any) {
            // If offline / network error, fallback to local sandbox WebAssembly
            try {
              rawSvg = await compileWithLocalSandbox(normalized);
            } catch {
              throw onlineErr;
            }
          }

          const processed = postProcessTikzSvg(rawSvg, isDark);
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

  // Add netherite-tikz-svg class to root <svg>
  if (!svg.includes('class="')) {
    svg = svg.replace("<svg", '<svg class="netherite-tikz-svg"');
  } else {
    svg = svg.replace(/class="([^"]*)"/i, (_full, cls: string) => {
      return `class="${cls} netherite-tikz-svg"`;
    });
  }

  // Ensure responsive sizing with clean aspect ratio preservation
  if (!svg.includes('style="')) {
    svg = svg.replace(
      "<svg",
      '<svg style="max-width: 100%; height: auto; display: block; margin: 0 auto; overflow: visible;"'
    );
  } else {
    svg = svg.replace(/style="([^"]*)"/i, (_full, style: string) => {
      const cleaned = style.replace(/max-width:\s*[^;]+;?/gi, "").trim();
      return `style="${cleaned}${
        cleaned && !cleaned.endsWith(";") ? ";" : ""
      } max-width: 100%; height: auto; display: block; margin: 0 auto; overflow: visible;"`;
    });
  }

  // Inject TeX fonts rendering rules and anti-clipping
  const baseStyles = `
    <style>
      .netherite-tikz-svg { overflow: visible !important; }
      .netherite-tikz-svg text, .netherite-tikz-svg tspan { font-family: cmr10, "Computer Modern", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    </style>
  `;

  // Dark mode theme inversion for TeX strokes, arrows, and font glyphs
  const darkModeStyles = isDark
    ? `
    <style>
      .netherite-tikz-svg text, .netherite-tikz-svg tspan { fill: #f4f4f5 !important; }
      .netherite-tikz-svg path[stroke="#000000"], .netherite-tikz-svg path[stroke="#000"], .netherite-tikz-svg path[stroke="black"], .netherite-tikz-svg path[stroke="rgb(0,0,0)"] { stroke: #f4f4f5 !important; }
      .netherite-tikz-svg path[stroke="rgb(51,51,51)"], .netherite-tikz-svg path[stroke="rgb(76,76,76)"] { stroke: #e4e4e7 !important; }
      .netherite-tikz-svg path[fill="#000000"], .netherite-tikz-svg path[fill="#000"], .netherite-tikz-svg path[fill="black"], .netherite-tikz-svg path[fill="rgb(0,0,0)"] { fill: #f4f4f5 !important; }
      .netherite-tikz-svg use { fill: #f4f4f5 !important; }
      .netherite-tikz-svg g[stroke="#000000"], .netherite-tikz-svg g[stroke="#000"], .netherite-tikz-svg g[stroke="black"] { stroke: #f4f4f5 !important; }
      .netherite-tikz-svg g[fill="#000000"], .netherite-tikz-svg g[fill="#000"], .netherite-tikz-svg g[fill="black"] { fill: #f4f4f5 !important; }
    </style>
  `
    : "";

  if (svg.includes("</svg>")) {
    svg = svg.replace("</svg>", `${baseStyles}${darkModeStyles}</svg>`);
  }

  return svg;
}
