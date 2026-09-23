import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { NetheriteImageView } from "./NetheriteImageView";

export interface NetheriteImageOptions {
  inline: boolean;
  allowBase64: boolean;
  HTMLAttributes: Record<string, any>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    netheriteImage: {
      setImage: (options: {
        src: string;
        alt?: string;
        title?: string;
        width?: string;
        height?: string;
        layout?: "break" | "inline" | "left" | "right" | "center";
      }) => ReturnType;
    };
  }
}

export const NetheriteImageNode = Node.create<NetheriteImageOptions>({
  name: "image",

  addOptions() {
    return {
      inline: false,
      allowBase64: true,
      HTMLAttributes: {},
    };
  },

  inline() {
    return this.options.inline;
  },

  group() {
    return this.options.inline ? "inline" : "block";
  },

  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      src: {
        default: null,
      },
      alt: {
        default: null,
      },
      title: {
        default: null,
      },
      width: {
        default: "100%",
        parseHTML: (element) => element.getAttribute("width") || element.style.width || "100%",
        renderHTML: (attributes) => {
          if (!attributes.width) return {};
          return { width: attributes.width };
        },
      },
      height: {
        default: "auto",
        parseHTML: (element) => element.getAttribute("height") || element.style.height || "auto",
        renderHTML: (attributes) => {
          if (!attributes.height || attributes.height === "auto") return {};
          return { height: attributes.height };
        },
      },
      layout: {
        default: "break",
        parseHTML: (element) =>
          element.getAttribute("data-layout") ||
          (element.style.float === "left"
            ? "left"
            : element.style.float === "right"
              ? "right"
              : "break"),
        renderHTML: (attributes) => {
          if (!attributes.layout) return {};
          return { "data-layout": attributes.layout };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "img[src]",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["img", mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(NetheriteImageView);
  },

  addCommands() {
    return {
      setImage:
        (options) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              width: "100%",
              layout: "break",
              ...options,
            },
          });
        },
    };
  },

  addStorage() {
    return {
      markdown: {
        serialize(state: any, node: any) {
          const src = node.attrs?.src ?? "";
          const alt = node.attrs?.alt ?? "";
          const title = node.attrs?.title ? ` "${node.attrs.title}"` : "";
          const width = node.attrs?.width;
          const height = node.attrs?.height;
          const layout = node.attrs?.layout;

          if ((width && width !== "100%") || height !== "auto" || (layout && layout !== "break")) {
            const widthAttr = width ? ` width="${width}"` : "";
            const heightAttr = height && height !== "auto" ? ` height="${height}"` : "";
            const altAttr = alt ? ` alt="${alt}"` : "";
            const layoutAttr = layout ? ` data-layout="${layout}"` : "";
            state.write(`<img src="${src}"${altAttr}${widthAttr}${heightAttr}${layoutAttr} />`);
          } else {
            state.write(`![${alt}](${src}${title})`);
          }
        },
        parse: {
          // Handled by markdown-it image token parser
        },
      },
    };
  },
});
