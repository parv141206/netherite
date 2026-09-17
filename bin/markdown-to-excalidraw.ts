#!/usr/bin/env bun
import { readFile, writeFile } from "fs/promises";
import { resolve } from "path";
import { markdownToExcalidraw } from "../src/features/visual-notes";

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    console.log(`
\x1b[36m\x1b[1mNetherite Visual Notes Engine (Markdown -> Excalidraw)\x1b[0m

Usage:
  bun run bin/markdown-to-excalidraw.ts <input.md> [output.excalidraw] [options]

Options:
  --theme <light|dark>    Canvas theme (default: light)
  --cols <number>         Whiteboard layout columns (0: auto, 1, 2, 3, default: auto)
  --layout <grid|radial>  Layout mode (default: grid)
  --gap <pixels>          Vertical gap between stacked topics (default: 240)
  --col-gap <pixels>      Horizontal gap between columns (default: 320)
  --roughness <0|1|2>     Excalidraw roughness (0: clean, 1: sketchy, default: 1)
  --help, -h              Show this help message

Example:
  bun run bin/markdown-to-excalidraw.ts notes.md diagram.excalidraw --cols 2 --theme light
`);
    process.exit(0);
  }

  const inputFile = args[0]!;
  let outputFile: string | undefined;
  let theme: "light" | "dark" = "light";
  let clusterGap = 240;
  let colGap = 320;
  let columns = 0;
  let layoutMode: "grid" | "radial" | "vertical" = "grid";
  let roughness = 1;

  for (let i = 1; i < args.length; i++) {
    const arg = args[i]!;
    if (arg === "--theme" && args[i + 1]) {
      theme = args[i + 1] === "dark" ? "dark" : "light";
      i++;
    } else if (arg === "--cols" && args[i + 1]) {
      columns = parseInt(args[i + 1]!, 10) || 0;
      i++;
    } else if (arg === "--layout" && args[i + 1]) {
      layoutMode = args[i + 1] as any;
      i++;
    } else if (arg === "--gap" && args[i + 1]) {
      clusterGap = parseInt(args[i + 1]!, 10) || 240;
      i++;
    } else if (arg === "--col-gap" && args[i + 1]) {
      colGap = parseInt(args[i + 1]!, 10) || 320;
      i++;
    } else if (arg === "--roughness" && args[i + 1]) {
      roughness = parseInt(args[i + 1]!, 10) || 1;
      i++;
    } else if (!arg.startsWith("--") && !outputFile) {
      outputFile = arg;
    }
  }

  if (!outputFile) {
    outputFile = inputFile.replace(/\.md$/i, "") + ".excalidraw";
  }

  const inputPath = resolve(process.cwd(), inputFile);
  const outputPath = resolve(process.cwd(), outputFile);

  console.log(`\x1b[34m[VisualNotes]\x1b[0m Reading markdown from: ${inputPath}`);
  const content = await readFile(inputPath, "utf-8");

  console.log(`\x1b[34m[VisualNotes]\x1b[0m Generating Excalidraw visual diagram (theme: ${theme}, cols: ${columns || "auto"}, mode: ${layoutMode})...`);
  const scene = markdownToExcalidraw(content, {
    theme,
    clusterGap,
    colGap,
    columns,
    layoutMode,
    roughness,
  });

  const jsonString = JSON.stringify(scene, null, 2);
  await writeFile(outputPath, jsonString, "utf-8");

  console.log(`\x1b[32m✔\x1b[0m Successfully generated Excalidraw drawing with ${scene.elements.length} elements!`);
  console.log(`\x1b[32m✔\x1b[0m Saved to: ${outputPath}`);
}

main().catch((err) => {
  console.error("\x1b[31mError generating Excalidraw note:\x1b[0m", err);
  process.exit(1);
});
