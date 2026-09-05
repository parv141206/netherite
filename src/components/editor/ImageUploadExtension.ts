import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";

export const ImageUploadExtension = Extension.create({
  name: "imageUpload",

  addProseMirrorPlugins() {
    const uploadFn = this.options.uploadFn;
    return [
      new Plugin({
        key: new PluginKey("imageUpload"),
        props: {
          handlePaste(view, event) {
            const items = event.clipboardData?.items;
            if (!items) return false;

            for (const item of Array.from(items)) {
              if (item.type.startsWith("image/")) {
                const file = item.getAsFile();
                if (!file) continue;

                event.preventDefault();
                
                // Read as data URL immediately for instant feedback
                const reader = new FileReader();
                reader.onload = () => {
                  const src = reader.result as string;
                  const { schema } = view.state;
                  const imageType = schema.nodes.image;
                  if (imageType) {
                    const node = imageType.create({ src });
                    const tr = view.state.tr.replaceSelectionWith(node);
                    view.dispatch(tr);
                  }
                  
                  // Call external upload function to handle saving to Google Drive
                  // (In a real implementation, you'd replace the src after upload)
                  if (uploadFn) uploadFn(file);
                };
                reader.readAsDataURL(file);
                return true;
              }
            }
            return false;
          },
        },
      }),
    ];
  },
});
