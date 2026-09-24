"use client";

import katex from "katex";
import hljs from "highlight.js";
import { renderMermaidQueued } from "~/components/editor/mermaidQueue";
import { renderTikzQueued } from "~/components/editor/tikzQueue";

export interface CompilePdfOptions {
  title?: string;
  subtitle?: string;
  author?: string;
  date?: string;
  theme?: "academic" | "engineering" | "executive" | "monochrome" | "nord" | "dracula";
  fontFamily?: string;
  baseFontSize?: string;
  includeCoverPage?: boolean;
  includeTableOfContents?: boolean;
  sectionNumbering?: boolean;
  showPageNumbers?: boolean;
  showHeaderTitle?: boolean;
  showDate?: boolean;
  isDark?: boolean;
}

export interface HeadingItem {
  id: string;
  level: number;
  text: string;
  numberPrefix?: string;
}

export interface CompiledPdfDocument {
  html: string;
  headings: HeadingItem[];
  wordCount: number;
  readingTimeMinutes: number;
}

/**
 * Converts image URLs (such as /api/notes/image?id=... or remote links)
 * to inline base64 data URLs in the browser so html2canvas and print render them synchronously without CORS issues.
 */
async function resolveImageToDataUrl(url: string): Promise<string> {
  if (!url || url.startsWith("data:")) return url;
  if (typeof window === "undefined") return url;

  try {
    const res = await fetch(url, { credentials: "same-origin" });
    if (!res.ok) return url;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string) || url);
      reader.onerror = () => resolve(url);
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.warn("Could not convert image to base64 for PDF:", url, err);
    return url;
  }
}

/**
 * Escapes HTML characters
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Strips HTML tags and markdown symbols to produce clean plain text for IDs and Table of Contents
 */
function stripFormattingToPlainText(str: string): string {
  return str
    .replace(/<[^>]*>/g, "")
    .replace(/[*_~`+=]/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .trim();
}

/**
 * Formats inline markdown elements (bold, italic, code, links, highlights)
 * and normalizes HTML mark tags so they match document color tokens.
 */
function formatInlineMarkdown(str: string): string {
  let s = str;

  // Code spans
  s = s.replace(/`([^`]+)`/g, '<code class="pdf-inline-code">$1</code>');

  // Bold & Italic
  s = s.replace(/\*\*\*(.*?)\*\*\*/g, "<strong><em>$1</em></strong>");
  s = s.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/__(.*?)__/g, "<strong>$1</strong>");
  s = s.replace(/\*(.*?)\*/g, "<em>$1</em>");
  s = s.replace(/_(.*?)_/g, "<em>$1</em>");

  // Strikethrough
  s = s.replace(/~~(.*?)~~/g, "<del>$1</del>");

  // Underline
  s = s.replace(/\+\+(.*?)\+\+/g, "<u>$1</u>");

  // Highlight standard markdown: ==highlight==
  s = s.replace(/==(.*?)==/g, '<mark class="pdf-highlight pdf-highlight-yellow">$1</mark>');

  // Normalize TipTap / HTML <mark> tags to assign clean highlight classes
  s = s.replace(/<mark\b([^>]*)>/gi, (match: string, attrs: string) => {
    if (attrs.includes("pdf-highlight")) return match;
    let colorClass = "pdf-highlight-yellow";
    if (/pink/i.test(attrs)) colorClass = "pdf-highlight-pink";
    else if (/green/i.test(attrs)) colorClass = "pdf-highlight-green";
    else if (/blue/i.test(attrs)) colorClass = "pdf-highlight-blue";
    else if (/purple/i.test(attrs)) colorClass = "pdf-highlight-purple";

    if (/class=["']/i.test(attrs)) {
      return match.replace(/class=["']([^"']*)["']/i, `class="$1 pdf-highlight ${colorClass}"`);
    }
    return `<mark class="pdf-highlight ${colorClass}" ${attrs}>`;
  });

  // Links
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="pdf-link">$1</a>');

  return s;
}

/**
 * High-performance, rich In-House Markdown to Structured HTML compiler
 * designed specifically for publication-grade PDF generation.
 */
export async function compileMarkdownForPdf(
  rawMarkdown: string,
  options: CompilePdfOptions = {}
): Promise<CompiledPdfDocument> {
  const {
    title = "Document",
    subtitle = "",
    author = "Netherite Sovereign Studio",
    date = new Date().toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    }),
    includeCoverPage = false,
    includeTableOfContents = false,
    sectionNumbering = false,
    isDark = false,
  } = options;

  let text = rawMarkdown || "";

  // Normalize CRLF to LF
  text = text.replace(/\r\n/g, "\n");

  // Compute word count and reading time
  const cleanWords = text.replace(/```[\s\S]*?```/g, "").match(/\b\w+\b/g) ?? [];
  const wordCount = cleanWords.length;
  const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));

  // Store extracted complex blocks to prevent interference during regex processing.
  // Note: Placeholders use hyphens (NOT underscores) to prevent collision with markdown italics `_(.*?)_`.
  const codeBlocks: { lang: string; code: string; placeholder: string }[] = [];
  const mathBlocks: { latex: string; isDisplay: boolean; placeholder: string }[] = [];
  const mermaidBlocks: { code: string; placeholder: string }[] = [];
  const tikzBlocks: { code: string; placeholder: string }[] = [];

  // 1. Extract fenced code blocks (supporting arbitrary backticks/tildes, trailing spaces, CRLF)
  text = text.replace(
    /(?:^|\n)(`{3,}|~{3,})([^\n`~]*)\n([\s\S]*?)\n\1(?:\n|$)/g,
    (_, _fence: string, langSpec: string, code: string) => {
      const cleanLang = (langSpec ?? "").trim().split(/\s+/)[0]?.toLowerCase() ?? "";
      if (cleanLang === "mermaid") {
        const placeholder = `<!--NETHERITE-MMD-${mermaidBlocks.length}-->`;
        mermaidBlocks.push({ code: code.trim(), placeholder });
        return `\n\n${placeholder}\n\n`;
      }
      if (cleanLang === "tikz" || cleanLang === "latex-tikz" || cleanLang === "pgf") {
        const placeholder = `<!--NETHERITE-TIKZ-${tikzBlocks.length}-->`;
        tikzBlocks.push({ code: code.trim(), placeholder });
        return `\n\n${placeholder}\n\n`;
      }
      const placeholder = `<!--NETHERITE-CODE-${codeBlocks.length}-->`;
      codeBlocks.push({ lang: cleanLang, code: code, placeholder });
      return `\n\n${placeholder}\n\n`;
    }
  );

  // 2. Extract display math blocks $$ ... $$
  text = text.replace(/\$\$([\s\S]*?)\$\$/g, (_, latex) => {
    const placeholder = `<!--NETHERITE-MATH-BLOCK-${mathBlocks.length}-->`;
    mathBlocks.push({ latex: latex.trim(), isDisplay: true, placeholder });
    return `\n\n${placeholder}\n\n`;
  });

  // 3. Extract inline math $ ... $
  text = text.replace(/(?<!\\)\$([^\n$]+?)(?<!\\)\$/g, (_, latex) => {
    const placeholder = `<!--NETHERITE-MATH-INLINE-${mathBlocks.length}-->`;
    mathBlocks.push({ latex: latex.trim(), isDisplay: false, placeholder });
    return placeholder;
  });

  // 4. Pre-resolve images to base64 Data URLs so html2canvas never drops them
  const imgRegex = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g;
  const foundImages: { fullMatch: string; alt: string; url: string; title?: string }[] = [];
  let imgMatch: RegExpExecArray | null;

  while ((imgMatch = imgRegex.exec(text)) !== null) {
    foundImages.push({
      fullMatch: imgMatch[0],
      alt: imgMatch[1] || "",
      url: imgMatch[2] || "",
      title: imgMatch[3],
    });
  }

  // Also check standard HTML img tags: <img src="..." />
  const htmlImgRegex = /<img\s+[^>]*src="([^"]+)"[^>]*>/gi;
  let htmlImgMatch: RegExpExecArray | null;
  while ((htmlImgMatch = htmlImgRegex.exec(text)) !== null) {
    if (htmlImgMatch[1]) {
      foundImages.push({
        fullMatch: htmlImgMatch[0],
        alt: "",
        url: htmlImgMatch[1],
      });
    }
  }

  // Pre-convert all unique image URLs to base64 concurrently
  const uniqueUrls = Array.from(new Set(foundImages.map((i) => i.url)));
  const urlToDataUrl = new Map<string, string>();
  await Promise.all(
    uniqueUrls.map(async (u) => {
      const resolved = await resolveImageToDataUrl(u);
      urlToDataUrl.set(u, resolved);
    })
  );

  // Replace images with resolved base64 images
  text = text.replace(imgRegex, (_, alt, url, title) => {
    const resolved = urlToDataUrl.get(url) || url;
    const caption = title || alt;
    const captionHtml = caption
      ? `<figcaption class="pdf-figcaption">${escapeHtml(caption)}</figcaption>`
      : "";
    return `\n\n<figure class="pdf-image-container"><img src="${resolved}" alt="${escapeHtml(
      alt
    )}" class="pdf-image" />${captionHtml}</figure>\n\n`;
  });

  text = text.replace(htmlImgRegex, (tag, src) => {
    const resolved = urlToDataUrl.get(src) || src;
    return tag.replace(src, resolved);
  });

  // 5. Extract Headings and build section numbers safely without escaping HTML tags
  const headings: HeadingItem[] = [];
  let h1Counter = 0;
  let h2Counter = 0;
  let h3Counter = 0;

  text = text.replace(/^(#{1,6})\s+(.+)$/gm, (_, hashes, headingText) => {
    const level = hashes.length;
    const rawHeading = headingText.trim();
    const plainText = stripFormattingToPlainText(rawHeading);

    // Detect if the heading already has manual numbers like "1.2 ", "1.4. ", etc.
    const manualNumMatch = plainText.match(/^(\d+(?:\.\d+)*\.?)\s+(.*)$/);
    const existingManualNum = manualNumMatch ? manualNumMatch[1] : null;
    const headingTitleWithoutNum = manualNumMatch ? manualNumMatch[2] : plainText;

    let numberPrefix = "";
    if (sectionNumbering) {
      if (level === 1) {
        h1Counter++;
        h2Counter = 0;
        h3Counter = 0;
        numberPrefix = `${h1Counter}. `;
      } else if (level === 2) {
        h2Counter++;
        h3Counter = 0;
        numberPrefix = `${h1Counter > 0 ? `${h1Counter}.` : ""}${h2Counter}. `;
      } else if (level === 3) {
        h3Counter++;
        numberPrefix = `${h1Counter > 0 ? `${h1Counter}.` : ""}${h2Counter > 0 ? `${h2Counter}.` : ""}${h3Counter}. `;
      }
    }

    const tocTitle = sectionNumbering ? headingTitleWithoutNum : plainText;
    const id = `sec-${headings.length + 1}-${tocTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "heading"}`;

    headings.push({
      id,
      level,
      text: tocTitle,
      numberPrefix: sectionNumbering ? numberPrefix : (existingManualNum ? `${existingManualNum} ` : ""),
    });

    // Reconcile manual numbering so it never duplicates into "1.1.2. 1.2"
    let headingInnerContent = rawHeading;
    if (sectionNumbering && existingManualNum) {
      headingInnerContent = headingInnerContent.replace(
        new RegExp(`(^|>)\\s*${existingManualNum.replace(/\./g, "\\.")}\\s*`, "i"),
        "$1"
      );
    }

    const formattedHeading = formatInlineMarkdown(headingInnerContent);

    return `\n\n<h${level} id="${id}" class="pdf-heading pdf-h${level}"><span class="pdf-heading-num">${numberPrefix}</span>${formattedHeading}</h${level}>\n\n`;
  });

  // 6. GitHub / Obsidian-style Alert / Callout Boxes
  const alertRegex = /^>[ \t]*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION|INFO|SUCCESS|DANGER|QUESTION|EXAMPLE|QUOTE)\][ \t]*(.*?)\n((?:^[ \t]*>.*(?:\n|$))*)/gim;
  text = text.replace(alertRegex, (_, type, customTitle, body) => {
    const alertType = type.toUpperCase();
    const cleanTitle = customTitle.trim() || alertType;
    const cleanBodyLines = (body || "")
      .split("\n")
      .map((l: string) => l.replace(/^[ \t]*>[ \t]?/, "").trim())
      .filter((l: string) => l.length > 0);
    const cleanBody = formatInlineMarkdown(cleanBodyLines.join("<br/>"));

    return `\n\n<div class="pdf-callout pdf-callout-${alertType.toLowerCase()}">
      <div class="pdf-callout-header">
        <span class="pdf-callout-icon">${getCalloutIcon(alertType)}</span>
        <span class="pdf-callout-type">${escapeHtml(cleanTitle)}</span>
      </div>
      <div class="pdf-callout-body">${cleanBody}</div>
    </div>\n\n`;
  });

  // Standard multi-line blockquotes (group consecutive `>` lines into a single <blockquote>)
  const blockquoteRegex = /(?:^[ \t]*>[ \t]?[^\n]*(?:\n|$))+/gm;
  text = text.replace(blockquoteRegex, (block) => {
    if (block.includes("pdf-callout")) return block;
    const lines = block
      .split("\n")
      .map((l) => l.replace(/^[ \t]*>[ \t]?/, "").trim())
      .filter((l) => l.length > 0);
    if (lines.length === 0) return "";
    const innerHtml = formatInlineMarkdown(lines.join("<br/>"));
    return `\n\n<blockquote class="pdf-blockquote">${innerHtml}</blockquote>\n\n`;
  });

  // 7. Markdown Tables
  text = text.replace(
    /((?:^[ \t]*\|[^\n]+\|\n)+)/gm,
    (tableBlock) => {
      const lines = tableBlock.trim().split("\n").map((l) => l.trim());
      if (lines.length < 2) return tableBlock;

      const headerRow = lines[0]!;
      const separatorRow = lines[1]!;
      const bodyRows = lines.slice(2);

      if (!separatorRow.includes("-")) return tableBlock;

      const aligns = separatorRow
        .split("|")
        .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1)
        .map((col) => {
          const c = col.trim();
          if (c.startsWith(":") && c.endsWith(":")) return "center";
          if (c.endsWith(":")) return "right";
          return "left";
        });

      const parseCells = (row: string) =>
        row
          .split("|")
          .filter((_, idx, arr) => idx > 0 && idx < arr.length - 1)
          .map((c) => formatInlineMarkdown(c.trim()));

      const headerCells = parseCells(headerRow);

      let html = '<div class="pdf-table-wrapper"><table class="pdf-table"><thead><tr>';
      headerCells.forEach((cell, idx) => {
        const align = aligns[idx] || "left";
        html += `<th style="text-align: ${align};">${cell}</th>`;
      });
      html += "</tr></thead><tbody>";

      bodyRows.forEach((row, rIdx) => {
        const cells = parseCells(row);
        const rowClass = rIdx % 2 === 1 ? "pdf-row-zebra" : "";
        html += `<tr class="${rowClass}">`;
        cells.forEach((cell, idx) => {
          const align = aligns[idx] || "left";
          html += `<td style="text-align: ${align};">${cell}</td>`;
        });
        html += "</tr>";
      });

      html += "</tbody></table></div>";
      return `\n\n${html}\n\n`;
    }
  );

  // 8. Task Lists
  text = text.replace(/^- \[(x|X)\]\s+(.+)$/gm, '<div class="pdf-task-item pdf-task-done"><span class="pdf-checkbox checked">☑</span><span>$2</span></div>');
  text = text.replace(/^- \[ \]\s+(.+)$/gm, '<div class="pdf-task-item"><span class="pdf-checkbox">☐</span><span>$1</span></div>');

  // 9. Standard Unordered and Ordered Lists
  text = text.replace(/^(\s*)[-*+]\s+(.+)$/gm, '<li class="pdf-li-bullet">$2</li>');
  text = text.replace(/^(\s*)\d+\.\s+(.+)$/gm, '<li class="pdf-li-number">$2</li>');

  // Wrap consecutive list items
  text = text.replace(/(<li class="pdf-li-bullet">[\s\S]*?<\/li>)+/g, '<ul class="pdf-ul">$&</ul>');
  text = text.replace(/(<li class="pdf-li-number">[\s\S]*?<\/li>)+/g, '<ol class="pdf-ol">$&</ol>');

  // 10. Horizontal Rules
  text = text.replace(/^(\*{3,}|-{3,}|_{3,})$/gm, '<hr class="pdf-hr" />');

  // 11. Inline Styling (Bold, Italic, Strikethrough, Underline, Code, Links, Highlights)
  text = formatInlineMarkdown(text);

  // 12. Paragraph wrapping for loose lines without duplicate margins
  text = text
    .split(/\n\s*\n/)
    .map((chunk) => {
      const trimmed = chunk.trim();
      if (!trimmed) return "";
      // Don't wrap blocks that are already block-level elements
      if (
        trimmed.startsWith("<h") ||
        trimmed.startsWith("<div") ||
        trimmed.startsWith("<p") ||
        trimmed.startsWith("<table") ||
        trimmed.startsWith("<figure") ||
        trimmed.startsWith("<ul") ||
        trimmed.startsWith("<ol") ||
        trimmed.startsWith("<blockquote") ||
        trimmed.startsWith("<hr") ||
        trimmed.startsWith("<!--NETHERITE")
      ) {
        return trimmed;
      }
      return `<p class="pdf-paragraph">${trimmed.replace(/\n/g, "<br/>")}</p>`;
    })
    .filter(Boolean)
    .join("\n\n");

  // 13. Render KaTeX Math Blocks
  mathBlocks.forEach(({ latex, isDisplay, placeholder }) => {
    try {
      const rendered = katex.renderToString(latex, {
        displayMode: isDisplay,
        throwOnError: false,
      });
      const wrapper = isDisplay
        ? `<div class="pdf-math-display">${rendered}</div>`
        : `<span class="pdf-math-inline">${rendered}</span>`;
      text = text.replace(placeholder, wrapper);
    } catch {
      text = text.replace(placeholder, `<code class="pdf-math-error">${escapeHtml(latex)}</code>`);
    }
  });

  // 14. Render Mermaid Diagrams Asynchronously
  for (const { code, placeholder } of mermaidBlocks) {
    try {
      const { svg } = await renderMermaidQueued(placeholder, code, isDark);
      if (svg) {
        const svgWrapper = `<div class="pdf-diagram-wrapper">${svg}</div>`;
        text = text.replace(placeholder, svgWrapper);
      } else {
        text = text.replace(
          placeholder,
          `<div class="pdf-diagram-fallback"><pre>${escapeHtml(code)}</pre></div>`
        );
      }
    } catch {
      text = text.replace(
        placeholder,
        `<div class="pdf-diagram-fallback"><pre>${escapeHtml(code)}</pre></div>`
      );
    }
  }

  // 15. Render TikZ LaTeX Diagrams Asynchronously
  for (const { code, placeholder } of tikzBlocks) {
    try {
      const { svg } = await renderTikzQueued(code, isDark);
      if (svg) {
        const svgWrapper = `<div class="pdf-diagram-wrapper">${svg}</div>`;
        text = text.replace(placeholder, svgWrapper);
      } else {
        text = text.replace(
          placeholder,
          `<div class="pdf-diagram-fallback"><pre>${escapeHtml(code)}</pre></div>`
        );
      }
    } catch {
      text = text.replace(
        placeholder,
        `<div class="pdf-diagram-fallback"><pre>${escapeHtml(code)}</pre></div>`
      );
    }
  }

  // 16. Render Highlighted Code Blocks
  codeBlocks.forEach(({ lang, code, placeholder }) => {
    let highlighted = "";
    try {
      if (lang && hljs.getLanguage(lang)) {
        highlighted = hljs.highlight(code, { language: lang }).value;
      } else {
        highlighted = hljs.highlightAuto(code).value;
      }
    } catch {
      highlighted = escapeHtml(code);
    }

    const lines = highlighted.split("\n");
    const numberedLines = lines
      .map(
        (line, idx) =>
          `<div class="pdf-code-line"><span class="pdf-code-line-num">${idx + 1}</span><span class="pdf-code-line-content">${line || " "}</span></div>`
      )
      .join("");

    const blockHtml = `
      <div class="pdf-code-container">
        <div class="pdf-code-header">
          <span class="pdf-code-lang-badge">${escapeHtml(lang || "text")}</span>
          <span class="pdf-code-dots"><span class="dot red"></span><span class="dot yellow"></span><span class="dot green"></span></span>
        </div>
        <pre class="pdf-code-pre"><code>${numberedLines}</code></pre>
      </div>
    `;
    text = text.replace(placeholder, blockHtml);
  });

  // 17. Generate Table of Contents (if enabled)
  let tocHtml = "";
  if (includeTableOfContents && headings.length > 0) {
    tocHtml = `
      <div class="pdf-toc-card">
        <h2 class="pdf-toc-heading">Table of Contents</h2>
        <div class="pdf-toc-list">
          ${headings
            .map(
              (h) => `
            <div class="pdf-toc-item pdf-toc-level-${h.level}">
              <span class="pdf-toc-item-title">
                ${h.numberPrefix ? `<span class="pdf-toc-num">${escapeHtml(h.numberPrefix)}</span>` : ""}
                ${escapeHtml(h.text)}
              </span>
              <span class="pdf-toc-dots"></span>
            </div>
          `
            )
            .join("")}
        </div>
      </div>
      <div class="pdf-page-break"></div>
    `;
  }

  // 18. Generate Cover Page (if enabled)
  let coverPageHtml = "";
  if (includeCoverPage) {
    coverPageHtml = `
      <div class="pdf-cover-page">
        <div class="pdf-cover-badge">Netherite Sovereign Document</div>
        <h1 class="pdf-cover-title">${escapeHtml(title)}</h1>
        ${subtitle ? `<h2 class="pdf-cover-subtitle">${escapeHtml(subtitle)}</h2>` : ""}
        <div class="pdf-cover-divider"></div>
        <div class="pdf-cover-meta-grid">
          <div class="pdf-cover-meta-item">
            <span class="label">Author</span>
            <span class="val">${escapeHtml(author)}</span>
          </div>
          <div class="pdf-cover-meta-item">
            <span class="label">Date</span>
            <span class="val">${escapeHtml(date)}</span>
          </div>
          <div class="pdf-cover-meta-item">
            <span class="label">Length</span>
            <span class="val">${wordCount} words (~${readingTimeMinutes} min read)</span>
          </div>
          <div class="pdf-cover-meta-item">
            <span class="label">Security</span>
            <span class="val">End-to-End Sovereign Storage</span>
          </div>
        </div>
      </div>
      <div class="pdf-page-break"></div>
    `;
  }

  const finalHtml = `
    <div class="pdf-compiled-document">
      ${coverPageHtml}
      ${tocHtml}
      <div class="pdf-document-body">
        ${text}
      </div>
    </div>
  `;

  return {
    html: finalHtml,
    headings,
    wordCount,
    readingTimeMinutes,
  };
}

function getCalloutIcon(type: string): string {
  switch (type.toUpperCase()) {
    case "NOTE":
    case "INFO":
      return "ℹ";
    case "TIP":
      return "💡";
    case "SUCCESS":
      return "✓";
    case "IMPORTANT":
      return "★";
    case "WARNING":
      return "⚠";
    case "CAUTION":
    case "DANGER":
      return "🛑";
    case "QUESTION":
      return "❓";
    case "EXAMPLE":
      return "📋";
    case "QUOTE":
      return "❝";
    default:
      return "ℹ";
  }
}
