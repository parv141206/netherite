/**
 * Table serialization utilities for converting table data into
 * GitHub-flavored Markdown or formatted ASCII tables.
 */

/**
 * Converts a 2D matrix of strings into a standard GitHub-flavored Markdown table.
 */
export function formatTableAsMarkdown(matrix: string[][]): string {
  if (!matrix || matrix.length === 0) return "";
  const colCount = Math.max(...matrix.map((r) => r.length));
  if (colCount === 0) return "";

  // Normalize rows to equal colCount and escape pipes/newlines
  const normalized = matrix.map((row) => {
    const r = [...row];
    while (r.length < colCount) r.push("");
    return r.map((c) =>
      (c || "")
        .replace(/\r?\n/g, " ")
        .replace(/\|/g, "\\|")
        .trim()
    );
  });

  const lines: string[] = [];

  // Header row
  lines.push("| " + normalized[0]!.join(" | ") + " |");

  // Delimiter row
  lines.push("| " + normalized[0]!.map(() => "---").join(" | ") + " |");

  // Data rows
  for (let i = 1; i < normalized.length; i++) {
    lines.push("| " + normalized[i]!.join(" | ") + " |");
  }

  return lines.join("\n");
}

/**
 * Converts a 2D matrix of strings into a clean ASCII table with aligned columns.
 */
export function formatTableAsAscii(matrix: string[][]): string {
  if (!matrix || matrix.length === 0) return "";
  const colCount = Math.max(...matrix.map((r) => r.length));
  if (colCount === 0) return "";

  // Normalize rows to equal colCount
  const normalized = matrix.map((row) => {
    const r = [...row];
    while (r.length < colCount) r.push("");
    return r.map((c) => (c || "").replace(/\r?\n/g, " ").trim());
  });

  // Calculate max display width for each column (minimum 3 chars)
  const colWidths = Array(colCount).fill(3);
  for (const row of normalized) {
    row.forEach((cell, cIdx) => {
      colWidths[cIdx] = Math.max(colWidths[cIdx]!, cell.length);
    });
  }

  const separator =
    "+" + colWidths.map((w) => "-".repeat(w + 2)).join("+") + "+";

  const lines: string[] = [];

  // Top border
  lines.push(separator);

  // Header row
  lines.push(
    "| " +
      normalized[0]!
        .map((cell, idx) => cell.padEnd(colWidths[idx]!))
        .join(" | ") +
      " |"
  );

  // Header/Body separator
  lines.push(separator);

  // Body rows
  for (let i = 1; i < normalized.length; i++) {
    lines.push(
      "| " +
        normalized[i]!
          .map((cell, idx) => cell.padEnd(colWidths[idx]!))
          .join(" | ") +
        " |"
    );
  }

  // Bottom border (for multi-row or single-row tables)
  if (normalized.length > 1) {
    lines.push(separator);
  }

  return lines.join("\n");
}

/**
 * Extracts a 2D matrix of text values from a live HTMLTableElement.
 */
export function extractTableMatrixFromDom(tableEl: HTMLTableElement): string[][] {
  if (!tableEl) return [];
  const trElements = Array.from(tableEl.querySelectorAll("tr"));
  if (trElements.length === 0) return [];

  return trElements.map((tr) => {
    const cells = Array.from(tr.querySelectorAll("th, td"));
    return cells.map((cell) => {
      const text = (cell as HTMLElement).innerText ?? cell.textContent ?? "";
      return text.trim();
    });
  });
}

/**
 * Extracts a 2D matrix of text values from a ProseMirror table node.
 */
export function extractTableMatrixFromNode(tableNode: any): string[][] {
  if (!tableNode || !tableNode.content) return [];
  const matrix: string[][] = [];

  tableNode.forEach((rowNode: any) => {
    if (rowNode.type.name === "tableRow") {
      const row: string[] = [];
      rowNode.forEach((cellNode: any) => {
        row.push(cellNode.textContent?.trim() || "");
      });
      matrix.push(row);
    }
  });

  return matrix;
}
