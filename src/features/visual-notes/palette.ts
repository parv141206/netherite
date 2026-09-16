import type { TopicPalette } from "./types";

/**
 * Curated color palettes matching the artisanal Excalidraw aesthetic.
 * Main topic #1 in user's image is a pleasant pastel green (#bbf7d0 / #c7f9cc).
 * Main topic #2 is soft blue (#bae6fd / #bfdbfe).
 */
export const LIGHT_PALETTES: Record<string, TopicPalette> = {
  green: {
    name: "green",
    fill: "#c7f9cc", // Soft pastel green
    stroke: "#2b8a3e",
    text: "#1e1e1e",
    accent: "#51cf66",
    subtopicBg: "#ffffff",
    noteText: "#212529",
  },
  blue: {
    name: "blue",
    fill: "#d0ebff", // Soft sky blue
    stroke: "#1c7ed6",
    text: "#1e1e1e",
    accent: "#339af0",
    subtopicBg: "#ffffff",
    noteText: "#212529",
  },
  lavender: {
    name: "lavender",
    fill: "#e5dbff", // Soft purple / violet
    stroke: "#7048e8",
    text: "#1e1e1e",
    accent: "#845ef7",
    subtopicBg: "#ffffff",
    noteText: "#212529",
  },
  peach: {
    name: "peach",
    fill: "#ffe8cc", // Soft peach / orange
    stroke: "#e8590c",
    text: "#1e1e1e",
    accent: "#ff922b",
    subtopicBg: "#ffffff",
    noteText: "#212529",
  },
  amber: {
    name: "amber",
    fill: "#ffec99", // Soft yellow / amber
    stroke: "#f59f00",
    text: "#1e1e1e",
    accent: "#fcc419",
    subtopicBg: "#ffffff",
    noteText: "#212529",
  },
  rose: {
    name: "rose",
    fill: "#fcc2d7", // Soft pink / rose
    stroke: "#d6336c",
    text: "#1e1e1e",
    accent: "#f06595",
    subtopicBg: "#ffffff",
    noteText: "#212529",
  },
  cyan: {
    name: "cyan",
    fill: "#c5f6fa", // Soft cyan
    stroke: "#1098ad",
    text: "#1e1e1e",
    accent: "#22b8cf",
    subtopicBg: "#ffffff",
    noteText: "#212529",
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
