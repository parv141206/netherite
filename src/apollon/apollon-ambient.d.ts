declare module "*?inline" {
  const content: string;
  export default content;
}

declare module "*?url" {
  const content: string;
  export default content;
}

declare module "jspdf" {
  export type jsPDF = any;
  export const jsPDF: any;
}

declare module "svg2pdf.js" {
  export const svg2pdf: any;
}

declare module "@resvg/resvg-wasm" {
  export const initWasm: any;
  export const Resvg: any;
}
