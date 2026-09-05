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
import { ImageUploadExtension } from "./ImageUploadExtension";

const lowlight = createLowlight(all);

export function buildExtensions(uploadFn?: (file: File) => void) {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3, 4, 5, 6] },
      codeBlock: false,
    }),
    CodeBlockLowlight.extend({
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
    ResizeImage.configure({
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
    Table.configure({
      resizable: true,
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
    ImageUploadExtension.configure({
      uploadFn,
    }),
  ];
}
