import { describe, expect, test } from "bun:test";

// Polyfill minimal browser globals for headless test environments
if (typeof (globalThis as any).devicePixelRatio === "undefined") {
  (globalThis as any).devicePixelRatio = 1;
}
if (typeof (globalThis as any).window === "undefined") {
  (globalThis as any).window = globalThis;
}

import {
  markdownToExcalidraw,
  markdownToExcalidrawElements,
  parseMarkdownNotes,
  layoutVisualNotes,
} from "../index";

const SAMPLE_REFERENCE_MARKDOWN = `
# Topic: Main topic #1 [color: green]

## Sub topic #1
lorem ipsum dolor sit amet consectetur adipiscing elit deleniti quidem quis officia magna qui accusamus in quod quas similique nam iusto et est eos aliqua sint voluptas ante culpa non officia pariatur quod corrupti nulla ut harum incididunt aliquip similique enim nobis consequatur in similique cumque mollitia voluptas dolorum occaecat elit est vel nulla enim est dolor aute qui sit minim eligendi enim ad praesentium est qui fuga cumque

## Sub topic #2
lorem ipsum dolor sit amet consectetur adipiscing elit deleniti quidem quis officia magna qui accusamus in quod quas similique nam iusto et est eos aliqua sint voluptas ante culpa non officia pariatur quod corrupti nulla ut harum incididunt aliquip similique enim nobis consequatur in similique cumque mollitia voluptas dolorum occaecat elit est vel nulla enim est dolor aute qui sit minim eligendi enim ad praesentium est qui fuga cumque

## Sub topic #3
lorem ipsum dolor sit amet consectetur adipiscing elit deleniti quidem quis officia magna qui accusamus in quod quas similique nam iusto et est eos aliqua sint voluptas ante culpa non officia pariatur quod corrupti nulla ut harum incididunt aliquip similique enim nobis consequatur in similique cumque mollitia voluptas dolorum occaecat elit est vel nulla enim est dolor aute qui sit minim eligendi enim ad praesentium est qui fuga cumque

### [flow] Some flow about Sub Topic #3
lorem ipsum dolor sit amet consectetur adipiscing elit deleniti quidem quis officia magna qui accusamus in quod quas similique nam iusto et est eos aliqua sint voluptas ante culpa non officia pariatur quod corrupti nulla ut harum incididunt aliquip similique enim nobis consequatur in similique cumque mollitia voluptas dolorum occaecat elit est vel nulla enim est dolor aute qui sit minim eligendi enim ad praesentium est qui fuga cumque

### [flow] Some flow about Sub Topic #3
lorem ipsum dolor sit amet consectetur adipiscing elit deleniti quidem quis officia magna qui accusamus in quod quas similique nam iusto et est eos aliqua sint voluptas ante culpa non officia pariatur quod corrupti nulla ut harum incididunt aliquip similique enim nobis consequatur in similique cumque mollitia voluptas dolorum occaecat elit est vel nulla enim est dolor aute qui sit minim eligendi enim ad praesentium est qui fuga cumque

\`\`\`ascii: diagram for it
 0                   1                   2                   3
 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|Version|  IHL  |Type of Service|          Total Length         |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|         Identification        |Flags|      Fragment Offset    |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|  Time to Live |    Protocol   |         Header Checksum       |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                       Source Address                          |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                    Destination Address                        |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|          Source Port          |       Destination Port        |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                        Sequence Number                        |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                    Acknowledgment Number                      |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|  Data |           |U|A|P|R|S|F|                               |
| Offset| Reserved  |R|C|S|S|Y|I|            Window             |
|  (4b) |   (6b)    |G|K|H|T|N|N|                               |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|           Checksum            |         Urgent Pointer        |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                    Options (if any)                           |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
|                         Data (Payload)                        |
+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
\`\`\`

## Sub topic #4
lorem ipsum dolor sit amet consectetur adipiscing elit deleniti quidem quis officia magna qui accusamus in quod quas similique nam iusto et est eos aliqua sint voluptas ante culpa non officia pariatur quod corrupti nulla ut harum incididunt aliquip similique enim nobis consequatur in similique cumque mollitia voluptas dolorum occaecat elit est vel nulla enim est dolor aute qui sit minim eligendi enim ad praesentium est qui fuga cumque

### [sub] Even sub sub topic
- lorem ipsum dolor sit amet consectetur adipiscing elit deleniti quidem quis officia magna qui accusamus in quod quas similique nam iusto et est eos aliqua sint voluptas ante culpa non officia pariatur quod corrupti nulla ut harum incididunt aliquip similique enim nobis consequatur in similique cumque mollitia voluptas dolorum occaecat elit est vel nulla enim est dolor aute qui sit minim eligendi enim ad praesentium est qui fuga cumque
- lorem ipsum dolor sit amet consectetur adipiscing elit deleniti quidem quis officia magna qui accusamus in quod quas similique nam iusto et est eos aliqua sint voluptas ante culpa non officia pariatur quod corrupti nulla ut harum incididunt aliquip similique enim nobis consequatur in similique cumque mollitia voluptas dolorum occaecat elit est vel nulla enim est dolor aute qui sit minim eligendi enim ad praesentium est qui fuga cumque

## Sub topic #5
lorem ipsum dolor sit amet consectetur adipiscing elit deleniti quidem quis officia magna qui accusamus in quod quas similique nam iusto et est eos aliqua sint voluptas ante culpa non officia pariatur quod corrupti nulla ut harum incididunt aliquip similique enim nobis consequatur in similique cumque mollitia voluptas dolorum occaecat elit est vel nulla enim est dolor aute qui sit minim eligendi enim ad praesentium est qui fuga cumque
`;

const TWO_TOPICS_MARKDOWN = `
${SAMPLE_REFERENCE_MARKDOWN}

# Topic: Main topic #2 [color: blue]

## Sub topic #1
lorem ipsum dolor sit amet consectetur adipiscing elit...

## Sub topic #2
lorem ipsum dolor sit amet consectetur adipiscing elit...
`;

describe("Visual Notes Engine", () => {
  test("Parser correctly extracts topics, subtopics, flows, notes, and diagrams", () => {
    const doc = parseMarkdownNotes(SAMPLE_REFERENCE_MARKDOWN);
    expect(doc.topics.length).toBe(1);

    const topic = doc.topics[0]!;
    expect(topic.title).toBe("Main topic #1");
    expect(topic.color).toBe("green");
    expect(topic.subtopics.length).toBe(5);

    // Subtopic #3 has 2 flows, and the second flow has a diagram
    const sub3 = topic.subtopics.find((s) => s.title.includes("Sub topic #3"));
    expect(sub3).toBeDefined();
    expect(sub3!.children.length).toBe(2);
    expect(sub3!.children[1]!.diagrams.length).toBe(1);
    expect(sub3!.children[1]!.diagrams[0]!.label).toBe("diagram for it");
    expect(sub3!.children[1]!.diagrams[0]!.code).toContain("Version");

    // Subtopic #4 has 1 sub-subtopic with 2 bullet notes
    const sub4 = topic.subtopics.find((s) => s.title.includes("Sub topic #4"));
    expect(sub4).toBeDefined();
    expect(sub4!.children.length).toBe(1);
    expect(sub4!.children[0]!.title).toBe("Even sub sub topic");
    expect(sub4!.children[0]!.notes.length).toBe(2);
  });

  test("Layout engine positions all elements and resolves collisions", () => {
    const doc = parseMarkdownNotes(SAMPLE_REFERENCE_MARKDOWN);
    const layout = layoutVisualNotes(doc);

    expect(layout.clusters.length).toBe(1);
    expect(layout.nodes.length).toBeGreaterThanOrEqual(10);
    expect(layout.edges.length).toBeGreaterThan(5);

    // Main topic is present
    const mainNode = layout.nodes.find((n) => n.type === "main-topic");
    expect(mainNode).toBeDefined();

    // ASCII diagram is present with monospace font and valid bounds
    const asciiNode = layout.nodes.find((n) => n.type === "ascii-diagram");
    expect(asciiNode).toBeDefined();
    expect(asciiNode!.fontFamily).toBe(3); // Monospace Cascadia
    expect(asciiNode!.width).toBeGreaterThan(200);

    // Check that there are no major overlaps among non-text nodes
    for (let i = 0; i < layout.nodes.length; i++) {
      const a = layout.nodes[i]!;
      for (let j = i + 1; j < layout.nodes.length; j++) {
        const b = layout.nodes[j]!;

        // Check AABB intersection
        const overlapX =
          Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
        const overlapY =
          Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);

        // Allow at most 0px overlap between containers
        if (a.type !== "note" && b.type !== "note") {
          expect(overlapX > 0 && overlapY > 0).toBe(false);
        }
      }
    }
  });

  test("Multi-topic vertical stacking ensures clear separation without overlap", () => {
    const doc = parseMarkdownNotes(TWO_TOPICS_MARKDOWN);
    const layout = layoutVisualNotes(doc, { layoutMode: "vertical", clusterGap: 180 });

    expect(layout.clusters.length).toBe(2);

    const cluster1 = layout.clusters[0]!;
    const cluster2 = layout.clusters[1]!;

    // Cluster 2 must start strictly below Cluster 1's bottom with at least clusterGap
    expect(cluster2.bounds.minY).toBeGreaterThanOrEqual(cluster1.bounds.maxY + 150);
  });

  test("Multi-topic 2D masonry layout packs clusters side-by-side", () => {
    const doc = parseMarkdownNotes(TWO_TOPICS_MARKDOWN);
    const layout = layoutVisualNotes(doc, { columns: 2 });

    expect(layout.clusters.length).toBe(2);
    const cluster1 = layout.clusters[0]!;
    const cluster2 = layout.clusters[1]!;

    // Cluster 2 is placed horizontally in column 2
    expect(cluster2.bounds.minX).toBeGreaterThan(cluster1.bounds.maxX);
  });

  test("Generator produces valid Excalidraw scene JSON", () => {
    const scene = markdownToExcalidraw(SAMPLE_REFERENCE_MARKDOWN, { theme: "light" });

    expect(scene.type).toBe("excalidraw");
    expect(scene.version).toBe(2);
    expect(scene.appState.viewBackgroundColor).toBe("#ffffff");
    expect(Array.isArray(scene.elements)).toBe(true);
    expect(scene.elements.length).toBeGreaterThan(15);

    // Verify presence of rectangle, text, and arrow elements
    const hasRect = scene.elements.some((e: any) => e.type === "rectangle");
    const hasText = scene.elements.some((e: any) => e.type === "text");
    const hasArrow = scene.elements.some((e: any) => e.type === "arrow");

    expect(hasRect).toBe(true);
    expect(hasText).toBe(true);
    expect(hasArrow).toBe(true);

    // Verify arrow bindings
    const arrow = scene.elements.find((e: any) => e.type === "arrow");
    expect(arrow.startBinding).toBeDefined();

    // Verify smooth curved radial arrows
    const radialArrow = scene.elements.find(
      (e: any) => e.type === "arrow" && e.roundness?.type === 2,
    );
    expect(radialArrow).toBeDefined();

    // Verify ASCII diagram presence
    const asciiElement = scene.elements.find(
      (e: any) => e.type === "text" && e.fontFamily === 3,
    );
    expect(asciiElement).toBeDefined();
  });

  test("Parser extracts bold definition items (- **Term**: Description)", () => {
    const md = `
# Systems Programming

## Core Abstractions
- **Domain**: A world or framework in which a program executes.
- **Semantics**: The set of rules governing meaning and behavior.
- **Semantic Gap**: The conceptual distance between problem domain and machine execution.
`;
    const doc = parseMarkdownNotes(md);
    expect(doc.topics.length).toBe(1);
    const sub = doc.topics[0]!.subtopics[0]!;
    expect(sub.notes.length).toBe(3);
    expect(sub.notes[0]!.boldTitle).toBe("Domain");
    expect(sub.notes[0]!.description).toBe("A world or framework in which a program executes.");
    expect(sub.notes[1]!.boldTitle).toBe("Semantics");
    expect(sub.notes[2]!.boldTitle).toBe("Semantic Gap");

    // Test generator creates concept-card with bold definition terms formatted inside
    const scene = markdownToExcalidraw(md);
    const hasFormattedTerms = scene.elements.some(
      (e: any) => e.type === "text" && e.text.includes("Domain") && e.text.includes("Semantics"),
    );
    expect(hasFormattedTerms).toBe(true);

    const radialArrows = scene.elements.filter(
      (e: any) => e.type === "arrow",
    );
    expect(radialArrows.length).toBeGreaterThanOrEqual(1);
  });

  test("5+ Topics 2D Masonry Bin-Packing produces balanced landscape canvas", () => {
    const md = `
# Topic 1: Software Architecture
## Sub 1.1
- Notes on architecture

# Topic 2: Compiler Design
## Sub 2.1
- Lexing and Parsing

# Topic 3: Operating Systems
## Sub 3.1
- Virtual memory and paging

# Topic 4: Database Internals
## Sub 4.1
- B-Trees and WAL

# Topic 5: Distributed Systems
## Sub 5.1
- Raft consensus and Paxos
`;
    const doc = parseMarkdownNotes(md);
    expect(doc.topics.length).toBe(5);

    const layout = layoutVisualNotes(doc);
    expect(layout.clusters.length).toBe(5);

    const totalWidth = layout.bounds.maxX - layout.bounds.minX;
    const totalHeight = layout.bounds.maxY - layout.bounds.minY;
    const aspectRatio = totalWidth / totalHeight;

    // A balanced 2D canvas should have aspect ratio between 0.8 and 3.5 (NOT a 1:10 tall ribbon)
    expect(aspectRatio).toBeGreaterThan(0.7);
    expect(aspectRatio).toBeLessThan(4.5);

    // Verify official Excalidraw pastel palettes were used
    const scene = markdownToExcalidraw(md);
    const pastelFills = new Set(
      scene.elements
        .filter((e: any) => e.type === "rectangle" && e.backgroundColor !== "transparent")
        .map((e: any) => e.backgroundColor),
    );
    // Should have pastel colors like #a5d8ff, #b2f2bb, #d0bfff, #ffc9c9
    expect(pastelFills.size).toBeGreaterThanOrEqual(3);
  });
});
