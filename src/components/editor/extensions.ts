import StarterKit from "@tiptap/starter-kit";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { all, createLowlight } from "lowlight";
import ResizeImage from "tiptap-extension-resize-image";
import { Link } from "@tiptap/extension-link";
import { Placeholder } from "@tiptap/extension-placeholder";
import { Markdown } from "tiptap-markdown";
import { TaskList } from "@tiptap/extension-task-list";
import { TaskItem } from "@tiptap/extension-task-item";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { Highlight } from "@tiptap/extension-highlight";
import { Underline } from "@tiptap/extension-underline";
import { CharacterCount } from "@tiptap/extension-character-count";
import { MathInline, MathBlock } from "./MathExtension";
import { ImagePlaceholderNode } from "./ImagePlaceholderNode";

import { ReactNodeViewRenderer } from "@tiptap/react";
import { CodeBlockView } from "./CodeBlockView";
import { NetheriteTableView } from "./NetheriteTableView";

const lowlight = createLowlight(all);

export function buildExtensions() {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3, 4, 5, 6] },
      codeBlock: false,
    }),
    CodeBlockLowlight.extend({
      addAttributes() {
        return {
          ...this.parent?.(),
          mermaidTheme: {
            default: "auto",
            parseHTML: (element) => element.getAttribute("data-mermaid-theme") || "auto",
            renderHTML: (attributes) => ({ "data-mermaid-theme": attributes.mermaidTheme }),
          },
          mermaidBg: {
            default: "card",
            parseHTML: (element) => element.getAttribute("data-mermaid-bg") || "card",
            renderHTML: (attributes) => ({ "data-mermaid-bg": attributes.mermaidBg }),
          },
          mermaidHeight: {
            default: null,
            parseHTML: (element) => {
              const h = element.getAttribute("data-mermaid-height");
              return h ? parseInt(h, 10) : null;
            },
            renderHTML: (attributes) => {
              if (!attributes.mermaidHeight) return {};
              return { "data-mermaid-height": attributes.mermaidHeight };
            },
          },
        };
      },
      addNodeView() {
        return ReactNodeViewRenderer(CodeBlockView);
      },
      addKeyboardShortcuts() {
        return {
          ...this.parent?.(),
          Tab: () => {
            if (this.editor.isActive("codeBlock")) {
              return this.editor.commands.insertContent("    ");
            }
            return false;
          },
        };
      },
    }).configure({
      lowlight,
      defaultLanguage: "plaintext",
    }),
    Markdown.configure({
      html: true,
      tightLists: true,
      bulletListMarker: "-",
      transformCopiedText: true,
    }),
    ResizeImage.extend({
      addStorage() {
        return {
          markdown: {
            serialize(state: any, node: any) {
              const src = node.attrs?.src ?? "";
              const alt = node.attrs?.alt ?? "";
              const title = node.attrs?.title ? ` "${node.attrs.title}"` : "";
              const width = node.attrs?.width;
              const height = node.attrs?.height;
              if (width || height) {
                const widthAttr = width ? ` width="${width}"` : "";
                const heightAttr = height ? ` height="${height}"` : "";
                const altAttr = alt ? ` alt="${alt}"` : "";
                state.write(`<img src="${src}"${altAttr}${widthAttr}${heightAttr} />`);
              } else {
                state.write(`![${alt}](${src}${title})`);
              }
            },
            parse: {
              // handled by markdown-it
            },
          },
        };
      },
    }).configure({
      inline: true,
      allowBase64: true,
    }),
    Link.configure({
      openOnClick: false,
      autolink: true,
      linkOnPaste: true,
    }),
    TaskList,
    TaskItem.configure({
      nested: true,
    }),
    Table.extend({
      addNodeView() {
        return ({ node, view, HTMLAttributes }) => {
          return new NetheriteTableView(node, this.options.cellMinWidth, view, HTMLAttributes);
        };
      },
    }).configure({
      resizable: true,
      View: NetheriteTableView,
    }),
    TableRow,
    TableCell,
    TableHeader,
    Highlight.configure({ multicolor: true }),
    Underline,
    CharacterCount,
    Placeholder.configure({
      placeholder: ({ node }) => {
        if (node.type.name === "heading") {
          return `Heading ${(node.attrs as { level: number }).level}...`;
        }
        return "Type '/' for block commands or start typing...";
      },
      showOnlyCurrent: true,
    }),
    MathInline,
    MathBlock,
    ImagePlaceholderNode,
  ];
}
