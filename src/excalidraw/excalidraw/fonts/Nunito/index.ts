import { GOOGLE_FONTS_RANGES } from "@excalidraw/common";

import { type ExcalidrawFontFaceDescriptor } from "../Fonts";

const Cyrilic = new URL("./Nunito-Regular-XRXI3I6Li01BKofiOc5wtlZ2di8HDIkhdTA3j6zbXWjgevT5.woff2", import.meta.url).href;
const Latin = new URL("./Nunito-Regular-XRXI3I6Li01BKofiOc5wtlZ2di8HDIkhdTQ3j6zbXWjgeg.woff2", import.meta.url).href;
const CyrilicExt = new URL("./Nunito-Regular-XRXI3I6Li01BKofiOc5wtlZ2di8HDIkhdTk3j6zbXWjgevT5.woff2", import.meta.url).href;
const LatinExt = new URL("./Nunito-Regular-XRXI3I6Li01BKofiOc5wtlZ2di8HDIkhdTo3j6zbXWjgevT5.woff2", import.meta.url).href;
const Vietnamese = new URL("./Nunito-Regular-XRXI3I6Li01BKofiOc5wtlZ2di8HDIkhdTs3j6zbXWjgevT5.woff2", import.meta.url).href;

export const NunitoFontFaces: ExcalidrawFontFaceDescriptor[] = [
  {
    uri: CyrilicExt,
    descriptors: {
      unicodeRange: GOOGLE_FONTS_RANGES.CYRILIC_EXT,
      weight: "500",
    },
  },
  {
    uri: Cyrilic,
    descriptors: { unicodeRange: GOOGLE_FONTS_RANGES.CYRILIC, weight: "500" },
  },
  {
    uri: Vietnamese,
    descriptors: {
      unicodeRange: GOOGLE_FONTS_RANGES.VIETNAMESE,
      weight: "500",
    },
  },
  {
    uri: LatinExt,
    descriptors: { unicodeRange: GOOGLE_FONTS_RANGES.LATIN_EXT, weight: "500" },
  },
  {
    uri: Latin,
    descriptors: { unicodeRange: GOOGLE_FONTS_RANGES.LATIN, weight: "500" },
  },
];
