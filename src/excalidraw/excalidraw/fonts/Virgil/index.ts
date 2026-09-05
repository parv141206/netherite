import { type ExcalidrawFontFaceDescriptor } from "../Fonts";

const Virgil = new URL("./Virgil-Regular.woff2", import.meta.url).href;

export const VirgilFontFaces: ExcalidrawFontFaceDescriptor[] = [
  {
    uri: Virgil,
  },
];
