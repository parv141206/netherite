import { type ExcalidrawFontFaceDescriptor } from "../Fonts";

const CascadiaCodeRegular = new URL("./CascadiaCode-Regular.woff2", import.meta.url).href;

export const CascadiaFontFaces: ExcalidrawFontFaceDescriptor[] = [
  {
    uri: CascadiaCodeRegular,
  },
];
