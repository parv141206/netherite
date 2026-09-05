import { Node, mergeAttributes } from "@tiptap/core";
import katex from "katex";

export function cleanLatexString(str: string): string {
  if (!str) return "";
  let s = str;

  // 1. Decode HTML entities
  s = s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");

  // 2. Specific known corrupted/legacy math tokens
  s = s.replace(/%([Ss])%[Ee]2/g, "$1^2");
  s = s.replace(/%([Ss])%5[Ee]2/g, "$1^2");
  s = s.replace(/%([Ss])(?=[%A-Za-z0-9_\\])/g, "$1");

  // Superscript characters to LaTeX
  s = s.replace(/\u00B2/g, "^2").replace(/\u00B3/g, "^3");
  s = s.replace(/%C2%B2/gi, "^2").replace(/%C2%B3/gi, "^3");

  // 3. Robust URI decoding
  try {
    let prev = "";
    let count = 0;
    while (s.includes("%") && s !== prev && count < 5) {
      prev = s;
      count++;
      s = decodeURIComponent(s);
    }
  } catch {
    // If standard decode throws on malformed sequences, handle hex bytes
    s = s.replace(/%([0-9A-Fa-f]{2})/g, (_, hex) => {
      try {
        return decodeURIComponent("%" + hex);
      } catch {
        const code = parseInt(hex, 16);
        if (code === 0xe2) return "^2";
        return String.fromCharCode(code);
      }
    });
    // Remove isolated stray % before letter
    s = s.replace(/%([A-Za-z])/g, "$1");
  }

  // 4. Strip any inner HTML tags
  s = s.replace(/<[^>]*>/g, "");

  // 5. Strip trailing unescaped backslashes (e.g. "\sigma\" -> "\sigma", "s_f\" -> "s_f")
  s = s.replace(/\\+$/, "");

  return s.trim();
}

export function insertMathTextIntoEditor(editor: any, text: string) {
  if (!editor || !text) return;
  const schema = editor.schema;
  const { tr } = editor.state;

  // Split by block math $$...$$ or \[...\]
  const blockRegex = /(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\])/g;
  const parts = text.split(blockRegex);

  parts.forEach((part) => {
    if (!part) return;

    if (
      (part.startsWith("$$") && part.endsWith("$$")) ||
      (part.startsWith("\\[") && part.endsWith("\\]"))
    ) {
      const latex = cleanLatexString(part.slice(2, -2));
      const node = schema.nodes.mathBlock?.create({ latex });
      if (node) tr.replaceSelectionWith(node);
    } else {
      // Split by inline math \(...\) or $...$
      const inlineRegex = /(\\\([\s\S]+?\\\)|(?:\$[^$\n]+\$))/g;
      const inlineParts = part.split(inlineRegex);

      inlineParts.forEach((sub) => {
        if (!sub) return;

        if (sub.startsWith("\\(") && sub.endsWith("\\)")) {
          const latex = cleanLatexString(sub.slice(2, -2));
          const node = schema.nodes.mathInline?.create({ latex });
          if (node) tr.replaceSelectionWith(node);
        } else if (
          sub.startsWith("$") &&
          sub.endsWith("$") &&
          sub.length > 2 &&
          !/^\$\d+(\.\d+)?\$$/.test(sub)
        ) {
          const latex = cleanLatexString(sub.slice(1, -1));
          const node = schema.nodes.mathInline?.create({ latex });
          if (node) tr.replaceSelectionWith(node);
        } else {
          tr.insertText(sub);
        }
      });
    }
  });

  editor.view.dispatch(tr);
}

export function escapeHtmlAttr(str: string): string {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function preprocessMarkdownMath(content: string): string {
  if (!content) return "";

  // 1. Protect code blocks and inline code from regex transformations
  const codeBlocks: string[] = [];
  let s = content.replace(/(```[\s\S]*?```|`[^`\n]+`)/g, (match) => {
    const placeholder = `___NETHERITE_CB_${codeBlocks.length}___`;
    codeBlocks.push(match);
    return placeholder;
  });

  // 2. Frontmatter protection: convert starting YAML frontmatter to a ```yaml code block so it doesn't become a giant Setext <h2> heading
  s = s.replace(/^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/, (_, yaml) => {
    return `\`\`\`yaml\n${yaml.trim()}\n\`\`\`\n\n`;
  });

  // 3. Heal existing/legacy or corrupted HTML math tags (closed, unclosed, or HTML-escaped)
  s = s.replace(
    /(?:<span|&lt;span)[^>]*?data-latex=(?:"([^"]+)"|&quot;([^&]+)&quot;|'([^']+)')(?:[^>]*?>|.*?&gt;)(?:<\/span>|&lt;\/span&gt;)?/gi,
    (_, l1, l2, l3) => {
      const latex = l1 || l2 || l3 || "";
      const clean = cleanLatexString(latex);
      return clean ? `<span data-type="math-inline" data-latex="${escapeHtmlAttr(clean)}"></span>` : "";
    }
  );

  s = s.replace(
    /(?:<div|&lt;div)[^>]*?data-latex=(?:"([^"]+)"|&quot;([^&]+)&quot;|'([^']+)')(?:[^>]*?>|.*?&gt;)(?:<\/div>|&lt;\/div&gt;)?/gi,
    (_, l1, l2, l3) => {
      const latex = l1 || l2 || l3 || "";
      const clean = cleanLatexString(latex);
      return clean ? `\n\n<div data-type="math-block" data-latex="${escapeHtmlAttr(clean)}"></div>\n\n` : "";
    }
  );

  // 4. Display math: \\[ ... \\] or \[ ... \]
  s = s.replace(/\\+\[([\s\S]+?)\\+\]/g, (match, latex) => {
    if (/^\s*\^/.test(latex) || match.includes("](") || match.includes("]:")) return match;
    const clean = cleanLatexString(latex);
    return clean ? `\n\n<div data-type="math-block" data-latex="${escapeHtmlAttr(clean)}"></div>\n\n` : match;
  });

  // 5. Display math: multiline with $$ on separate lines (tolerates zero-width spaces/BOM)
  s = s.replace(/(?:^|\n)[ \t\u200b\u200c\u200d\ufeff]*\$\$[ \t\u200b\u200c\u200d\ufeff]*\n([\s\S]+?)\n[ \t\u200b\u200c\u200d\ufeff]*\$\$[ \t\u200b\u200c\u200d\ufeff]*(?=\n|$)/g, (_, latex) => {
    const clean = cleanLatexString(latex);
    return clean ? `\n\n<div data-type="math-block" data-latex="${escapeHtmlAttr(clean)}"></div>\n\n` : "";
  });

  // 6. Display math trailing text: e.g. "z-score: $$\nz_{if} = ... $$"
  s = s.replace(/([^\n]*?:\s*)\$\$[ \t]*\n([\s\S]+?)[ \t]*\$\$(?=\n|$)/g, (_, prefix, latex) => {
    const clean = cleanLatexString(latex);
    return clean ? `${prefix}\n\n<div data-type="math-block" data-latex="${escapeHtmlAttr(clean)}"></div>\n\n` : _;
  });

  // 7. Display math: single line strictly bounded $$...$$
  s = s.replace(/(?<![\$\\])\$\$([^\$\n]+?)(?<!\\)\$\$(?![\$])/g, (_, latex) => {
    const clean = cleanLatexString(latex);
    return clean ? `\n\n<div data-type="math-block" data-latex="${escapeHtmlAttr(clean)}"></div>\n\n` : "";
  });

  // 8. Standalone naked LaTeX formulas (only when not already in data-latex tags)
  s = s.replace(/(?:^|\n)[ \t]*(\\+(?:text|frac|sum|prod|int)\b[^\n<]+)(?=\n|$)/g, (match, eq) => {
    if (eq.includes("data-type") || eq.includes("data-latex")) return match;
    const clean = cleanLatexString(eq);
    return clean ? `\n\n<div data-type="math-block" data-latex="${escapeHtmlAttr(clean)}"></div>\n\n` : match;
  });
  s = s.replace(/(?:^|\n)[ \t]*([a-zA-Z_0-9\^\{\}\[\]\s]+\s*=\s*\\+(?:frac|sum|prod|int|text)\b[^\n<]+)(?=\n|$)/g, (match, eq) => {
    if (eq.includes("data-type") || eq.includes("data-latex")) return match;
    const clean = cleanLatexString(eq);
    return clean ? `\n\n<div data-type="math-block" data-latex="${escapeHtmlAttr(clean)}"></div>\n\n` : match;
  });

  // 9. Inline math: \\( ... \\) or \( ... \)
  s = s.replace(/\\+\(([\s\S]+?)\\+\)/g, (_, latex) => {
    const clean = cleanLatexString(latex);
    return clean ? `<span data-type="math-inline" data-latex="${escapeHtmlAttr(clean)}"></span>` : "";
  });

  // 10. Inline math: $...$ (strict single-line, non-whitespace boundaries, not currency or solitary $$)
  s = s.replace(/(?<![\$\w\\])\$([^\s\$](?:[^\$\n]*?[^\s\$])?)\$(?![\$\w\d])/g, (match, latex) => {
    if (/^\s*\d+(\.\d+)?\s*$/.test(latex)) return match;
    const clean = cleanLatexString(latex);
    if (!clean) return match;
    return `<span data-type="math-inline" data-latex="${escapeHtmlAttr(clean)}"></span>`;
  });

  // 11. Clean up accidental 4+ space indentation immediately following display math blocks to avoid unintended indented code blocks
  s = s.replace(/(<\/div>\s*)\n[ \t]{4,}(\S)/g, "$1\n$2");

  // 12. Restore protected code blocks (preserving all spaces, gaps, ASCII art, and indentation intact)
  s = s.replace(/___NETHERITE_CB_(\d+)___/g, (_, idx) => codeBlocks[Number(idx)] || "");

  return s;
}

export function transformMathInEditor(editor: any) {
  if (!editor || !editor.state) return;
  const { state, view } = editor;
  const { tr, doc, schema } = state;
  let modified = false;

  const mathInlineType = schema.nodes.mathInline;
  const mathBlockType = schema.nodes.mathBlock;
  if (!mathInlineType || !mathBlockType) return;

  const textReplacements: Array<{ from: number; to: number; node: any }> = [];

  doc.descendants((node: any, pos: number, parent: any) => {
    // 1. NEVER mutate code blocks or content inside code blocks or nodes with code marks!
    if (node.type.name === "codeBlock" || parent?.type?.name === "codeBlock") {
      return false;
    }
    if (node.marks?.some((m: any) => m.type.name === "code")) {
      return false;
    }

    // 2. Handle text nodes
    if (node.isText) {
      const text = node.text || "";
      if (!text) return;

      const hasLegacyHtml = text.includes('data-type="math-') || text.includes('data-latex=');
      const hasDisplayMath = text.includes("$$") || text.includes("\\[");
      const hasInlineMath = text.includes("$") || text.includes("\\(");

      if (!hasLegacyHtml && !hasDisplayMath && !hasInlineMath) return;

      // Match single-line or multiline $$...$$ or \[...\] or existing data-latex
      const blockRegex = /(<div[^>]*data-type="math-block"[^>]*data-latex="([^"]+)"[^>]*>.*?<\/div>|<div[^>]*data-latex="([^"]+)"[^>]*>.*?<\/div>|(?<![\$\\])\$\$([\s\S]+?)(?<!\\)\$\$(?![\$])|\\\[([\s\S]+?)\\\])/gi;
      let match: RegExpExecArray | null;

      let lastIndex = 0;
      const newNodes: any[] = [];
      let foundBlockMatch = false;

      while ((match = blockRegex.exec(text)) !== null) {
        foundBlockMatch = true;
        const matchStart = match.index;
        const matchText = match[0];
        const latex = match[2] || match[3] || match[4] || match[5] || "";
        const clean = cleanLatexString(latex);

        if (matchStart > lastIndex) {
          const precedingText = text.slice(lastIndex, matchStart);
          parseInlineMathToNodes(precedingText, schema, newNodes);
        }

        if (clean) {
          newNodes.push(mathBlockType.create({ latex: clean }));
        }

        lastIndex = matchStart + matchText.length;
      }

      if (foundBlockMatch) {
        if (lastIndex < text.length) {
          const trailingText = text.slice(lastIndex);
          parseInlineMathToNodes(trailingText, schema, newNodes);
        }
        textReplacements.push({ from: pos, to: pos + node.nodeSize, node: newNodes });
        modified = true;
      } else {
        const inlineNodes: any[] = [];
        const hasInline = parseInlineMathToNodes(text, schema, inlineNodes);
        if (hasInline) {
          textReplacements.push({ from: pos, to: pos + node.nodeSize, node: inlineNodes });
          modified = true;
        }
      }
    }
  });

  if (modified && textReplacements.length > 0) {
    textReplacements.sort((a, b) => b.from - a.from);
    textReplacements.forEach(({ from, to, node }) => {
      if (Array.isArray(node)) {
        if (node.length > 0) {
          tr.replaceWith(from, to, node);
        }
      } else if (node) {
        tr.replaceWith(from, to, node);
      }
    });
    view.dispatch(tr);
  }
}

function parseInlineMathToNodes(text: string, schema: any, outNodes: any[]): boolean {
  // Catch legacy/corrupted spans, \(...\), or $latex$
  const inlineRegex = /(?:<span|&lt;span)[^>]*?data-latex=(?:"([^"]+)"|&quot;([^&]+)&quot;|'([^']+)')(?:[^>]*?>|.*?&gt;)(?:<\/span>|&lt;\/span&gt;)?|\\\(([\s\S]+?)\\\)|(?<![\$\w\\])\$([^\s\$](?:[^\$\n]*?[^\s\$])?)\$(?![\$\w\d])/gi;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let found = false;

  const mathInlineType = schema.nodes.mathInline;

  while ((match = inlineRegex.exec(text)) !== null) {
    const matchStart = match.index;
    const matchText = match[0];
    const latex = match[1] || match[2] || match[3] || match[4] || match[5] || "";
    const clean = cleanLatexString(latex);

    if (!clean || /^\d+(\.\d+)?$/.test(clean)) {
      continue;
    }

    found = true;
    if (matchStart > lastIndex) {
      outNodes.push(schema.text(text.slice(lastIndex, matchStart)));
    }

    if (clean && mathInlineType) {
      outNodes.push(mathInlineType.create({ latex: clean }));
    }

    lastIndex = matchStart + matchText.length;
  }

  if (found) {
    if (lastIndex < text.length) {
      outNodes.push(schema.text(text.slice(lastIndex)));
    }
    return true;
  }

  outNodes.push(schema.text(text));
  return false;
}

export function postprocessMathMarkdown(text: string): string {
  if (!text) return "";
  let result = text;

  // Restore YAML frontmatter from protected code block to standard markdown frontmatter
  result = result.replace(/^```yaml[ \t]*\r?\n([\s\S]*?)\r?\n```[ \t]*(?:\r?\n|$)/, (_, yaml) => {
    return `---\n${yaml.trim()}\n---\n\n`;
  });

  // Replace any leftover HTML math tags with standard LaTeX markdown syntax
  result = result.replace(/(?:<div|&lt;div)[^>]*?data-latex=(?:"([^"]+)"|&quot;([^&]+)&quot;|'([^']+)')(?:[^>]*?>|.*?&gt;)(?:<\/div>|&lt;\/div&gt;)?/gi, (_, l1, l2, l3) => {
    return `\n\n$$\n${cleanLatexString(l1 || l2 || l3 || "")}\n$$\n\n`;
  });

  result = result.replace(/(?:<span|&lt;span)[^>]*?data-latex=(?:"([^"]+)"|&quot;([^&]+)&quot;|'([^']+)')(?:[^>]*?>|.*?&gt;)(?:<\/span>|&lt;\/span&gt;)?/gi, (_, l1, l2, l3) => {
    return `$${cleanLatexString(l1 || l2 || l3 || "")}$`;
  });

  return result;
}

export const MathInline = Node.create({
  name: "mathInline",
  group: "inline",
  inline: true,
  selectable: true,
  atom: true,

  addAttributes() {
    return {
      latex: {
        default: "",
        parseHTML: (element: HTMLElement) => {
          const enc = element.getAttribute("data-latex");
          if (enc) return cleanLatexString(enc);
          const annotation = element.querySelector('annotation[encoding="application/x-tex"]');
          if (annotation) return cleanLatexString(annotation.textContent || "");
          return cleanLatexString(element.textContent || "");
        },
        renderHTML: (attributes) => ({
          "data-latex": attributes.latex || "",
        }),
      },
    };
  },

  addStorage() {
    return {
      markdown: {
        serialize(state: any, node: any) {
          const latex = cleanLatexString(node.attrs.latex || "");
          state.write(`$${latex}$`);
        },
        parse: {
          setup(markdownit: any) {
            markdownit.disable("code");
          },
        },
      },
    };
  },

  parseHTML() {
    return [
      { tag: 'span[data-type="math-inline"]' },
      { tag: "span.math-inline" },
      { tag: "span.katex-inline" },
      {
        tag: "span.katex",
        getAttrs: (element: any) => {
          if (typeof element === "string") return false;
          if (element.closest?.(".katex-display")) return false;
          return {};
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes, { "data-type": "math-inline", class: "math-inline" })];
  },

  addNodeView() {
    return ({ node, getPos, editor }) => {
      const dom = document.createElement("span");
      dom.className = "math-inline inline-block px-1 py-0.5 mx-0.5 rounded cursor-pointer transition-colors hover:bg-muted/50 select-none";

      const rawLatex = cleanLatexString(node.attrs.latex || "");

      const render = () => {
        try {
          katex.render(rawLatex || "\\text{math}", dom, {
            displayMode: false,
            throwOnError: false,
          });
        } catch {
          dom.textContent = rawLatex;
        }
      };
      render();

      dom.addEventListener("click", () => {
        const newLatex = window.prompt("Edit Inline LaTeX:", rawLatex);
        if (newLatex !== null && typeof getPos === "function") {
          const pos = getPos();
          if (typeof pos === "number") {
            editor.view.dispatch(
              editor.view.state.tr.setNodeMarkup(pos, undefined, { latex: newLatex })
            );
          }
        }
      });

      return {
        dom,
        update: (updatedNode) => {
          if (updatedNode.type !== node.type) return false;
          node = updatedNode;
          render();
          return true;
        },
      };
    };
  },
});

export const MathBlock = Node.create({
  name: "mathBlock",
  group: "block",
  inline: false,
  selectable: true,
  atom: true,

  addAttributes() {
    return {
      latex: {
        default: "",
        parseHTML: (element: HTMLElement) => {
          const enc = element.getAttribute("data-latex");
          if (enc) return cleanLatexString(enc);
          const annotation = element.querySelector('annotation[encoding="application/x-tex"]');
          if (annotation) return cleanLatexString(annotation.textContent || "");
          return cleanLatexString(element.textContent || "");
        },
        renderHTML: (attributes) => ({
          "data-latex": attributes.latex || "",
        }),
      },
    };
  },

  addStorage() {
    return {
      markdown: {
        serialize(state: any, node: any) {
          const latex = cleanLatexString(node.attrs.latex || "");
          state.write(`\n\n$$\n${latex}\n$$\n\n`);
        },
        parse: {
          setup(markdownit: any) {
            markdownit.disable("code");
          },
        },
      },
    };
  },

  parseHTML() {
    return [
      { tag: 'div[data-type="math-block"]' },
      { tag: "div.math-block" },
      { tag: "div.katex-display" },
      {
        tag: "span.katex-display",
        getAttrs: (element: any) => {
          if (typeof element === "string") return false;
          return {};
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "math-block", class: "math-block" })];
  },

  addNodeView() {
    return ({ node, getPos, editor }) => {
      const dom = document.createElement("div");
      dom.className = "math-block my-2.5 py-2 px-3 text-center overflow-x-auto cursor-pointer rounded-lg transition-colors hover:bg-muted/40 select-none";

      const rawLatex = cleanLatexString(node.attrs.latex || "");

      const render = () => {
        try {
          katex.render(rawLatex || "\\text{Display Equation}", dom, {
            displayMode: true,
            throwOnError: false,
          });
        } catch {
          dom.textContent = rawLatex;
        }
      };
      render();

      dom.addEventListener("click", () => {
        const newLatex = window.prompt("Edit Display Block LaTeX:", rawLatex);
        if (newLatex !== null && typeof getPos === "function") {
          const pos = getPos();
          if (typeof pos === "number") {
            editor.view.dispatch(
              editor.view.state.tr.setNodeMarkup(pos, undefined, { latex: newLatex })
            );
          }
        }
      });

      return {
        dom,
        update: (updatedNode) => {
          if (updatedNode.type !== node.type) return false;
          node = updatedNode;
          render();
          return true;
        },
      };
    };
  },
});
