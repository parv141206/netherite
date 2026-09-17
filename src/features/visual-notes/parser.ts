import type {
  BoxBorderStyle,
  CardinalSlot,
  DiagramBlock,
  NoteItem,
  SubtopicNode,
  TopicCluster,
  TopicColor,
  VisualNoteDoc,
} from "./types";

let counter = 0;
function uniqueId(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter}`;
}

interface ParsedTags {
  cleanedText: string;
  color?: TopicColor;
  positionHint?: CardinalSlot;
  style?: BoxBorderStyle;
  isFlow?: boolean;
}

/**
 * Extracts inline directives like [color: green], [pos: top-left], [flow], [style: dashed]
 */
function extractDirectives(raw: string): ParsedTags {
  let cleaned = raw;
  let color: TopicColor | undefined;
  let positionHint: CardinalSlot | undefined;
  let style: BoxBorderStyle | undefined;
  let isFlow = false;

  // [color: green] or {color: green} or [green]
  const colorMatch = cleaned.match(/\[color:\s*([a-zA-Z0-9#_-]+)\]|\{color:\s*([a-zA-Z0-9#_-]+)\}/i);
  if (colorMatch) {
    color = (colorMatch[1] || colorMatch[2])?.toLowerCase();
    cleaned = cleaned.replace(colorMatch[0], "");
  }

  // [pos: top-left] or [position: right] or [top-left]
  const posMatch = cleaned.match(/\[(?:pos|position):\s*([a-zA-Z-]+)\]/i);
  if (posMatch) {
    const p = posMatch[1]?.toLowerCase() as CardinalSlot;
    if (isValidSlot(p)) {
      positionHint = p;
    }
    cleaned = cleaned.replace(posMatch[0], "");
  }

  // [style: dashed | dotted | solid]
  const styleMatch = cleaned.match(/\[style:\s*(dashed|dotted|solid)\]/i);
  if (styleMatch) {
    style = styleMatch[1]?.toLowerCase() as BoxBorderStyle;
    cleaned = cleaned.replace(styleMatch[0], "");
  }

  // [flow] or [step]
  if (/\[(?:flow|step)\]/i.test(cleaned)) {
    isFlow = true;
    style = style || "dashed";
    cleaned = cleaned.replace(/\[(?:flow|step)\]/gi, "");
  }

  // [sub] or [subtopic]
  if (/\[(?:sub|subtopic)\]/i.test(cleaned)) {
    cleaned = cleaned.replace(/\[(?:sub|subtopic)\]/gi, "");
  }

  // Strip prefixes like "Topic:", "Subtopic:", etc.
  cleaned = cleaned
    .replace(/^(?:Topic|Main Topic)\s*:\s*/i, "")
    .replace(/^(?:Subtopic|Sub topic)\s*:\s*/i, "")
    .trim();

  return {
    cleanedText: cleaned,
    color,
    positionHint,
    style,
    isFlow,
  };
}

function isValidSlot(slot: string): slot is CardinalSlot {
  return [
    "top",
    "top-left",
    "top-right",
    "bottom",
    "bottom-left",
    "bottom-right",
    "left",
    "right",
  ].includes(slot);
}

/**
 * Parses Markdown notes into a VisualNoteDoc AST.
 */
export function parseMarkdownNotes(markdown: string): VisualNoteDoc {
  counter = 0;
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");

  const topics: TopicCluster[] = [];
  let currentTopic: TopicCluster | null = null;
  let currentSubtopic: SubtopicNode | null = null;
  let currentChild: SubtopicNode | null = null; // sub-subtopic or flow step

  let inCodeBlock = false;
  let codeBuffer: string[] = [];
  let codeLanguage = "";
  let codeLabel = "";

  // Helper to ensure an active topic exists
  const ensureTopic = (title = "Main Topic"): TopicCluster => {
    if (!currentTopic) {
      currentTopic = {
        id: uniqueId("topic"),
        title,
        centerNotes: [],
        subtopics: [],
      };
      topics.push(currentTopic);
    }
    return currentTopic;
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i]!;
    const line = rawLine.trim();

    // Check for code fence start / end
    if (line.startsWith("```")) {
      if (inCodeBlock) {
        // End of code block
        const codeContent = codeBuffer.join("\n").trimEnd();
        const diagram: DiagramBlock = {
          id: uniqueId("diagram"),
          code: codeContent,
          language: codeLanguage,
          label: codeLabel || undefined,
        };

        if (currentChild) {
          currentChild.diagrams.push(diagram);
        } else if (currentSubtopic) {
          currentSubtopic.diagrams.push(diagram);
        } else {
          ensureTopic().subtopics.push({
            id: uniqueId("sub"),
            title: "Diagram",
            notes: [],
            children: [],
            diagrams: [diagram],
          });
        }

        inCodeBlock = false;
        codeBuffer = [];
        codeLanguage = "";
        codeLabel = "";
        continue;
      } else {
        // Start of code block
        inCodeBlock = true;
        codeBuffer = [];
        const meta = line.slice(3).trim();
        // e.g. ```ascii: diagram for it  or  ```text: IPv4 Header
        const colonIdx = meta.indexOf(":");
        if (colonIdx !== -1) {
          codeLanguage = meta.slice(0, colonIdx).trim();
          codeLabel = meta.slice(colonIdx + 1).trim();
        } else {
          codeLanguage = meta;
          codeLabel = meta ? `Diagram (${meta})` : "diagram for it";
        }
        continue;
      }
    }

    if (inCodeBlock) {
      codeBuffer.push(rawLine);
      continue;
    }

    // Skip blank lines
    if (!line) {
      continue;
    }

    // Level 1 Heading: Main Topic
    if (line.startsWith("# ") && !line.startsWith("##")) {
      const headingText = line.slice(2).trim();
      const tags = extractDirectives(headingText);

      currentTopic = {
        id: uniqueId("topic"),
        title: tags.cleanedText || "Main Topic",
        color: tags.color,
        centerNotes: [],
        subtopics: [],
      };
      topics.push(currentTopic);
      currentSubtopic = null;
      currentChild = null;
      continue;
    }

    // Level 2 Heading: Subtopic
    if (line.startsWith("## ") && !line.startsWith("###")) {
      const headingText = line.slice(3).trim();
      const tags = extractDirectives(headingText);
      const topic = ensureTopic();

      currentSubtopic = {
        id: uniqueId("sub"),
        title: tags.cleanedText || "Sub Topic",
        style: tags.style || "solid",
        color: tags.color,
        positionHint: tags.positionHint,
        notes: [],
        children: [],
        diagrams: [],
      };
      topic.subtopics.push(currentSubtopic);
      currentChild = null;
      continue;
    }

    // Level 3 Heading: Sub-subtopic or Flow step
    if (line.startsWith("### ") && !line.startsWith("####")) {
      const headingText = line.slice(4).trim();
      const tags = extractDirectives(headingText);

      if (!currentSubtopic) {
        const topic = ensureTopic();
        currentSubtopic = {
          id: uniqueId("sub"),
          title: "Sub Topic",
          style: "solid",
          notes: [],
          children: [],
          diagrams: [],
        };
        topic.subtopics.push(currentSubtopic);
      }

      currentChild = {
        id: uniqueId("flow"),
        title: tags.cleanedText || "Flow Step",
        style: tags.style || "dashed", // default to dashed rounded box matching user sketch
        color: tags.color,
        positionHint: tags.positionHint,
        isFlowStep: tags.isFlow,
        notes: [],
        children: [],
        diagrams: [],
      };
      currentSubtopic.children.push(currentChild);
      continue;
    }

    // Level 4 Heading: Deep Concept / Sub-branch
    if (line.startsWith("#### ")) {
      const headingText = line.slice(5).trim();
      const tags = extractDirectives(headingText);

      if (!currentSubtopic) {
        const topic = ensureTopic();
        currentSubtopic = {
          id: uniqueId("sub"),
          title: "Sub Topic",
          style: "solid",
          notes: [],
          children: [],
          diagrams: [],
        };
        topic.subtopics.push(currentSubtopic);
      }

      currentChild = {
        id: uniqueId("flow"),
        title: tags.cleanedText || "Concept",
        style: tags.style || "dashed",
        color: tags.color,
        positionHint: tags.positionHint,
        isFlowStep: tags.isFlow,
        notes: [],
        children: [],
        diagrams: [],
      };
      currentSubtopic.children.push(currentChild);
      continue;
    }

    // Bullet points: - Note or * Note (with indentation tracking)
    const bulletMatch = rawLine.match(/^(\s*)[-*]\s+(.*)$/);
    if (bulletMatch) {
      const indentSpaces = bulletMatch[1]!.replace(/\t/g, "  ").length;
      const indentLevel = Math.floor(indentSpaces / 2);
      const bulletContent = bulletMatch[2]!.trim();

      // Extract bold title if formatted as **Bold Title**: Description or **Bold Title**
      let boldTitle: string | undefined;
      let description: string | undefined;
      const boldMatch = bulletContent.match(/^\*\*([^*]+)\*\*(?:[:\s–—-]*(.*))?$/);
      if (boldMatch) {
        boldTitle = boldMatch[1]!.trim();
        description = (boldMatch[2] || "").trim();
      }

      const noteItem: NoteItem = {
        id: uniqueId("note"),
        text: bulletContent,
        isBullet: true,
        boldTitle,
        description,
        indentLevel,
        children: [],
      };

      if (currentChild) {
        currentChild.notes.push(noteItem);
      } else if (currentSubtopic) {
        currentSubtopic.notes.push(noteItem);
      } else if (currentTopic) {
        currentTopic.centerNotes.push(noteItem);
      } else {
        ensureTopic().centerNotes.push(noteItem);
      }
      continue;
    }

    // Plain paragraph text
    const noteItem: NoteItem = {
      id: uniqueId("note"),
      text: line,
      isBullet: false,
      children: [],
    };

    if (currentChild) {
      currentChild.notes.push(noteItem);
    } else if (currentSubtopic) {
      currentSubtopic.notes.push(noteItem);
    } else if (currentTopic) {
      currentTopic.centerNotes.push(noteItem);
    } else {
      ensureTopic().centerNotes.push(noteItem);
    }
  }

  // Ensure at least one topic if document had content
  if (topics.length === 0) {
    topics.push({
      id: uniqueId("topic"),
      title: "Main Topic",
      centerNotes: [],
      subtopics: [],
    });
  }

  return { topics };
}
