import { type ExcalidrawFontFaceDescriptor } from "../Fonts";

const LiberationSansRegular = new URL("./LiberationSans-Regular.woff2", import.meta.url).href;

export const LiberationFontFaces: ExcalidrawFontFaceDescriptor[] = [
  {
    uri: LiberationSansRegular,
  },
];
