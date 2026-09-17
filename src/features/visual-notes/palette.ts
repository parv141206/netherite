import type { TopicPalette } from "./types";

/**
 * Curated color palettes matching the artisanal Excalidraw aesthetic.
 * Main topic #1 in user's image is a pleasant pastel green (#bbf7d0 / #c7f9cc).
 * Main topic #2 is soft blue (#bae6fd / #bfdbfe).
 */
export const LIGHT_PALETTES: Record<string, TopicPalette> = {
  blue: {
    name: "blue",
    fill: "#a5d8ff", // Excalidraw pastel blue
    stroke: "#1e1e1e",
    text: "#1e1e1e",
    accent: "#1971c2",
    subtopicBg: "#ffffff",
    noteText: "#1e1e1e",
  },
  green: {
    name: "green",
    fill: "#b2f2bb", // Excalidraw pastel green
    stroke: "#1e1e1e",
    text: "#1e1e1e",
    accent: "#2f9e44",
    subtopicBg: "#ffffff",
    noteText: "#1e1e1e",
  },
  lavender: {
    name: "lavender",
    fill: "#d0bfff", // Excalidraw pastel violet / lavender
    stroke: "#1e1e1e",
    text: "#1e1e1e",
    accent: "#7048e8",
    subtopicBg: "#ffffff",
    noteText: "#1e1e1e",
  },
  rose: {
    name: "rose",
    fill: "#ffc9c9", // Excalidraw pastel red / coral
    stroke: "#1e1e1e",
    text: "#1e1e1e",
    accent: "#e03131",
    subtopicBg: "#ffffff",
    noteText: "#1e1e1e",
  },
  peach: {
    name: "peach",
    fill: "#fff4e6", // Excalidraw warm cream / peach
    stroke: "#1e1e1e",
    text: "#1e1e1e",
    accent: "#f76707",
    subtopicBg: "#ffffff",
    noteText: "#1e1e1e",
  },
  amber: {
    name: "amber",
    fill: "#ffec99", // Excalidraw pastel yellow
    stroke: "#1e1e1e",
    text: "#1e1e1e",
    accent: "#f59f00",
    subtopicBg: "#ffffff",
    noteText: "#1e1e1e",
  },
  cyan: {
    name: "cyan",
    fill: "#c5f6fa", // Excalidraw pastel cyan
    stroke: "#1e1e1e",
    text: "#1e1e1e",
    accent: "#0c8599",
    subtopicBg: "#ffffff",
    noteText: "#1e1e1e",
  },
  violet: {
    name: "violet",
    fill: "#f3f0ff", // Excalidraw soft lavender
    stroke: "#1e1e1e",
    text: "#1e1e1e",
    accent: "#845ef7",
    subtopicBg: "#ffffff",
    noteText: "#1e1e1e",
  },
};

export const DARK_PALETTES: Record<string, TopicPalette> = {
  green: {
    name: "green",
    fill: "#1b3a24",
    stroke: "#69db7c",
    text: "#f8f9fa",
    accent: "#8ce99a",
    subtopicBg: "#1e1e24",
    noteText: "#e9ecef",
  },
  blue: {
    name: "blue",
    fill: "#18324f",
    stroke: "#4dabf7",
    text: "#f8f9fa",
    accent: "#74c0fc",
    subtopicBg: "#1e1e24",
    noteText: "#e9ecef",
  },
  lavender: {
    name: "lavender",
    fill: "#2b2149",
    stroke: "#9775fa",
    text: "#f8f9fa",
    accent: "#b197fc",
    subtopicBg: "#1e1e24",
    noteText: "#e9ecef",
  },
  peach: {
    name: "peach",
    fill: "#402617",
    stroke: "#ff922b",
    text: "#f8f9fa",
    accent: "#ffa94d",
    subtopicBg: "#1e1e24",
    noteText: "#e9ecef",
  },
  amber: {
    name: "amber",
    fill: "#403417",
    stroke: "#fcc419",
    text: "#f8f9fa",
    accent: "#ffe066",
    subtopicBg: "#1e1e24",
    noteText: "#e9ecef",
  },
  rose: {
    name: "rose",
    fill: "#3d1b28",
    stroke: "#f783ac",
    text: "#f8f9fa",
    accent: "#faa2c1",
    subtopicBg: "#1e1e24",
    noteText: "#e9ecef",
  },
  cyan: {
    name: "cyan",
    fill: "#14373b",
    stroke: "#3bc9db",
    text: "#f8f9fa",
    accent: "#66d9e8",
    subtopicBg: "#1e1e24",
    noteText: "#e9ecef",
  },
};

export const PALETTE_CYCLE: string[] = [
  "green",
  "blue",
  "lavender",
  "peach",
  "amber",
  "rose",
  "cyan",
];

export function getPaletteForTopic(
  index: number,
  colorName?: string,
  theme: "light" | "dark" = "light",
): TopicPalette {
  const map = theme === "dark" ? DARK_PALETTES : LIGHT_PALETTES;
  const key = (colorName || "").toLowerCase().trim();

  if (key && map[key]) {
    return map[key]!;
  }

  const cycleKey = PALETTE_CYCLE[index % PALETTE_CYCLE.length] ?? "green";
  return map[cycleKey] ?? map.green!;
}
