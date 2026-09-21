import { Node } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { ImagePlaceholderView } from "./ImagePlaceholderView";

export interface ImagePlaceholderOptions {
  HTMLAttributes: Record<string, any>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    imagePlaceholder: {
      insertImagePlaceholder: (options: {
        uploadId: string;
        tempSrc?: string;
        fileName?: string;
        fileSize?: number;
      }) => ReturnType;
    };
  }
}

export const ImagePlaceholderNode = Node.create<ImagePlaceholderOptions>({
  name: "imagePlaceholder",

  group: "block",

  atom: true,

  draggable: false,

  selectable: false,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      uploadId: {
        default: null,
      },
      tempSrc: {
        default: null,
      },
      fileName: {
        default: null,
      },
      fileSize: {
        default: 0,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="image-placeholder"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", { ...HTMLAttributes, "data-type": "image-placeholder" }];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImagePlaceholderView);
  },

  addStorage() {
    return {
      markdown: {
        serialize(state: any) {
          // Don't leak temporary in-progress upload state to saved Markdown
          state.ensureNewLine();
        },
        parse: {},
      },
    };
  },

  addCommands() {
    return {
      insertImagePlaceholder:
        (attrs) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs,
          });
        },
    };
  },
});
