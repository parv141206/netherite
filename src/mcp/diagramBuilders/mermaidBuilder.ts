export const MERMAID_DIAGRAM_KEYWORDS = [
  "flowchart",
  "graph",
  "sequenceDiagram",
  "classDiagram",
  "stateDiagram",
  "stateDiagram-v2",
  "erDiagram",
  "journey",
  "gantt",
  "pie",
  "quadrantChart",
  "requirementDiagram",
  "gitGraph",
  "c4Context",
  "mindmap",
  "timeline",
  "zenuml",
  "sankey-beta",
  "xychart-beta",
  "block-beta",
];

export function validateAndFormatMermaid(code: string): { isValid: boolean; formattedCode: string; error?: string } {
  const trimmed = code.trim();
  if (!trimmed) {
    return {
      isValid: false,
      formattedCode: "flowchart TD\n    A[Start] --> B[End]",
      error: "Mermaid code is empty.",
    };
  }

  const firstLine = trimmed.split("\n")[0]?.trim() || "";
  const hasKeyword = MERMAID_DIAGRAM_KEYWORDS.some((kw) =>
    firstLine.startsWith(kw) || trimmed.startsWith(kw)
  );

  if (!hasKeyword) {
    // If user forgot the diagram header, default to flowchart TD
    const formattedCode = `flowchart TD\n${trimmed
      .split("\n")
      .map((l) => `    ${l}`)
      .join("\n")}`;
    return {
      isValid: true,
      formattedCode,
    };
  }

  return {
    isValid: true,
    formattedCode: trimmed,
  };
}
