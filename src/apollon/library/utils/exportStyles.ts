/**
 * Layout CSS the off-screen export mount needs to be self-contained.
 */
export const EXPORT_LAYOUT_CSS = `
.react-flow__node { position: absolute; }
.react-flow__viewport, .react-flow__edges { position: absolute; }
.apollon-canvas { flex: 1; display: flex; width: 100%; height: 100%; }
`;
