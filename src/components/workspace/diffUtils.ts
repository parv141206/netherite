export interface DiffLine {
  type: "added" | "removed" | "unchanged";
  content: string;
  lineNumBefore?: number;
  lineNumAfter?: number;
}

export interface DiffResult {
  hasChanges: boolean;
  additions: number;
  deletions: number;
  totalChanges: number;
  summary: string;
  lines: DiffLine[];
}

export interface ChangelogEntry {
  id: string;
  noteId: string;
  noteTitle: string;
  timestamp: number;
  dateStr: string;
  additions: number;
  deletions: number;
  summary: string;
  syncedToDrive: boolean;
}

export interface SemanticChange {
  id: string;
  category: "class" | "attribute" | "method" | "edge" | "diagram";
  action: "added" | "removed" | "modified";
  title: string;
  description: string;
}

/**
 * Attempts to normalize JSON documents to canonical 2-space indented format
 * to prevent whitespace or key ordering differences from showing as false diffs.
 */
export function normalizeJsonIfPossible(content: string): string {
  if (!content || typeof content !== "string") return content;
  const trimmed = content.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return content;
  try {
    const parsed = JSON.parse(trimmed);
    return JSON.stringify(parsed, null, 2);
  } catch {
    return content;
  }
}

/**
 * Fast, lightweight LCS-based line diff algorithm with prefix/suffix trimming,
 * running entirely in the browser.
 */
export function computeLineDiff(baseline: string, current: string): DiffResult {
  // Normalize JSON formatting if both documents appear to be JSON
  let baseNorm = baseline;
  let currNorm = current;
  if (
    baseline.trim().startsWith("{") &&
    current.trim().startsWith("{")
  ) {
    try {
      baseNorm = JSON.stringify(JSON.parse(baseline), null, 2);
      currNorm = JSON.stringify(JSON.parse(current), null, 2);
    } catch {}
  }

  if (baseNorm === currNorm) {
    return {
      hasChanges: false,
      additions: 0,
      deletions: 0,
      totalChanges: 0,
      summary: "0 changes",
      lines: baseNorm.split("\n").map((line, idx) => ({
        type: "unchanged",
        content: line,
        lineNumBefore: idx + 1,
        lineNumAfter: idx + 1,
      })),
    };
  }

  const baseLines = baseNorm.length === 0 ? [] : baseNorm.split("\n");
  const currLines = currNorm.length === 0 ? [] : currNorm.split("\n");

  // Step 1: Trim common prefix
  let start = 0;
  while (
    start < baseLines.length &&
    start < currLines.length &&
    baseLines[start] === currLines[start]
  ) {
    start++;
  }

  // Step 2: Trim common suffix
  let endBase = baseLines.length - 1;
  let endCurr = currLines.length - 1;
  while (
    endBase >= start &&
    endCurr >= start &&
    baseLines[endBase] === currLines[endCurr]
  ) {
    endBase--;
    endCurr--;
  }

  // Common prefix lines
  const prefixLines: DiffLine[] = [];
  for (let i = 0; i < start; i++) {
    prefixLines.push({
      type: "unchanged",
      content: baseLines[i] ?? "",
      lineNumBefore: i + 1,
      lineNumAfter: i + 1,
    });
  }

  // Common suffix lines
  const suffixLines: DiffLine[] = [];
  const baseSuffixCount = baseLines.length - 1 - endBase;
  for (let k = 0; k < baseSuffixCount; k++) {
    const bIdx = endBase + 1 + k;
    const cIdx = endCurr + 1 + k;
    suffixLines.push({
      type: "unchanged",
      content: baseLines[bIdx] ?? "",
      lineNumBefore: bIdx + 1,
      lineNumAfter: cIdx + 1,
    });
  }

  // Step 3: Run LCS DP only on the middle modified window
  const midBase = baseLines.slice(start, endBase + 1);
  const midCurr = currLines.slice(start, endCurr + 1);
  const m = midBase.length;
  const n = midCurr.length;

  const midDiff: DiffLine[] = [];
  let additions = 0;
  let deletions = 0;

  // Safeguard: If middle modified matrix is excessively large (>250k cells), avoid main-thread freeze
  if (m * n > 250_000) {
    for (let k = 0; k < m; k++) {
      midDiff.push({
        type: "removed",
        content: midBase[k] ?? "",
        lineNumBefore: start + k + 1,
      });
      deletions++;
    }
    for (let k = 0; k < n; k++) {
      midDiff.push({
        type: "added",
        content: midCurr[k] ?? "",
        lineNumAfter: start + k + 1,
      });
      additions++;
    }
  } else {
    const dp: number[][] = Array.from({ length: m + 1 }, () =>
      new Array<number>(n + 1).fill(0)
    );

    for (let i = 0; i < m; i++) {
      for (let j = 0; j < n; j++) {
        if (midBase[i] === midCurr[j]) {
          dp[i + 1]![j + 1] = dp[i]![j]! + 1;
        } else {
          dp[i + 1]![j + 1] = Math.max(dp[i + 1]![j]!, dp[i]![j + 1]!);
        }
      }
    }

    let i = m;
    let j = n;

    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && midBase[i - 1] === midCurr[j - 1]) {
        midDiff.unshift({
          type: "unchanged",
          content: midBase[i - 1] ?? "",
          lineNumBefore: start + i,
          lineNumAfter: start + j,
        });
        i--;
        j--;
      } else if (j > 0 && (i === 0 || dp[i]![j - 1]! >= dp[i - 1]![j]!)) {
        midDiff.unshift({
          type: "added",
          content: midCurr[j - 1] ?? "",
          lineNumAfter: start + j,
        });
        additions++;
        j--;
      } else if (i > 0) {
        midDiff.unshift({
          type: "removed",
          content: midBase[i - 1] ?? "",
          lineNumBefore: start + i,
        });
        deletions++;
        i--;
      }
    }
  }

  const allLines = [...prefixLines, ...midDiff, ...suffixLines];

  const summary =
    additions > 0 && deletions > 0
      ? `+${additions} -${deletions}`
      : additions > 0
      ? `+${additions}`
      : deletions > 0
      ? `-${deletions}`
      : "0 changes";

  return {
    hasChanges: additions > 0 || deletions > 0,
    additions,
    deletions,
    totalChanges: additions + deletions,
    summary,
    lines: allLines,
  };
}

/**
 * Computes high-level semantic changes between two Apollon UML diagrams.
 * Detects attribute changes, method changes, class additions/removals, renames, and relationships.
 */
export function computeApollonSemanticDiff(
  baselineStr: string,
  currentStr: string
): SemanticChange[] {
  try {
    const base = JSON.parse(baselineStr);
    const curr = JSON.parse(currentStr);
    const baseModel = base?.model || base;
    const currModel = curr?.model || curr;

    if (
      !baseModel ||
      !currModel ||
      !Array.isArray(baseModel.nodes) ||
      !Array.isArray(currModel.nodes)
    ) {
      return [];
    }

    const changes: SemanticChange[] = [];

    // 1. Diagram Title
    if (baseModel.title && currModel.title && baseModel.title !== currModel.title) {
      changes.push({
        id: "title-change",
        category: "diagram",
        action: "modified",
        title: "Diagram Title Changed",
        description: `Renamed from "${baseModel.title}" to "${currModel.title}"`,
      });
    }

    // 2. Nodes (Classes, Packages, Interfaces, etc.)
    const baseNodes = new Map<string, any>(baseModel.nodes.map((n: any) => [n.id, n]));
    const currNodes = new Map<string, any>(currModel.nodes.map((n: any) => [n.id, n]));

    // Added nodes
    for (const [id, currNode] of currNodes) {
      if (!baseNodes.has(id)) {
        const name = currNode.data?.name || "Unnamed";
        changes.push({
          id: `add-node-${id}`,
          category: "class",
          action: "added",
          title: `Added ${currNode.type || "Element"} "${name}"`,
          description: `Created new ${currNode.type || "diagram element"}`,
        });
      }
    }

    // Removed nodes
    for (const [id, baseNode] of baseNodes) {
      if (!currNodes.has(id)) {
        const name = baseNode.data?.name || "Unnamed";
        changes.push({
          id: `del-node-${id}`,
          category: "class",
          action: "removed",
          title: `Removed ${baseNode.type || "Element"} "${name}"`,
          description: `Deleted ${baseNode.type || "diagram element"}`,
        });
      }
    }

    // Modified nodes
    for (const [id, currNode] of currNodes) {
      const baseNode = baseNodes.get(id);
      if (!baseNode) continue;

      const nodeName = currNode.data?.name || baseNode.data?.name || "Unnamed";

      // Class rename
      if (
        baseNode.data?.name &&
        currNode.data?.name &&
        baseNode.data.name !== currNode.data.name
      ) {
        changes.push({
          id: `rename-node-${id}`,
          category: "class",
          action: "modified",
          title: `Renamed ${currNode.type || "Class"}`,
          description: `"${baseNode.data.name}" → "${currNode.data.name}"`,
        });
      }

      // Attributes
      const baseAttrs = new Map<string, any>(
        (baseNode.data?.attributes || []).map((a: any) => [a.id, a])
      );
      const currAttrs = new Map<string, any>(
        (currNode.data?.attributes || []).map((a: any) => [a.id, a])
      );

      for (const [aId, currAttr] of currAttrs) {
        if (!baseAttrs.has(aId)) {
          changes.push({
            id: `add-attr-${aId}`,
            category: "attribute",
            action: "added",
            title: `Added attribute in ${nodeName}`,
            description: currAttr.name || "Unnamed attribute",
          });
        } else {
          const oldAttr = baseAttrs.get(aId);
          if (oldAttr?.name !== currAttr?.name) {
            changes.push({
              id: `mod-attr-${aId}`,
              category: "attribute",
              action: "modified",
              title: `Modified attribute in ${nodeName}`,
              description: `"${oldAttr?.name || ""}" → "${currAttr?.name || ""}"`,
            });
          }
        }
      }

      for (const [aId, oldAttr] of baseAttrs) {
        if (!currAttrs.has(aId)) {
          changes.push({
            id: `del-attr-${aId}`,
            category: "attribute",
            action: "removed",
            title: `Removed attribute from ${nodeName}`,
            description: oldAttr?.name || "Unnamed attribute",
          });
        }
      }

      // Methods
      const baseMethods = new Map<string, any>(
        (baseNode.data?.methods || []).map((m: any) => [m.id, m])
      );
      const currMethods = new Map<string, any>(
        (currNode.data?.methods || []).map((m: any) => [m.id, m])
      );

      for (const [mId, currMethod] of currMethods) {
        if (!baseMethods.has(mId)) {
          changes.push({
            id: `add-method-${mId}`,
            category: "method",
            action: "added",
            title: `Added method in ${nodeName}`,
            description: currMethod.name || "Unnamed method",
          });
        } else {
          const oldMethod = baseMethods.get(mId);
          if (oldMethod?.name !== currMethod?.name) {
            changes.push({
              id: `mod-method-${mId}`,
              category: "method",
              action: "modified",
              title: `Modified method in ${nodeName}`,
              description: `"${oldMethod?.name || ""}" → "${currMethod?.name || ""}"`,
            });
          }
        }
      }

      for (const [mId, oldMethod] of baseMethods) {
        if (!currMethods.has(mId)) {
          changes.push({
            id: `del-method-${mId}`,
            category: "method",
            action: "removed",
            title: `Removed method from ${nodeName}`,
            description: oldMethod?.name || "Unnamed method",
          });
        }
      }
    }

    // 3. Edges (Relationships)
    const baseEdges = new Map<string, any>(
      (baseModel.edges || []).map((e: any) => [e.id, e])
    );
    const currEdges = new Map<string, any>(
      (currModel.edges || []).map((e: any) => [e.id, e])
    );

    for (const [id, currEdge] of currEdges) {
      if (!baseEdges.has(id)) {
        changes.push({
          id: `add-edge-${id}`,
          category: "edge",
          action: "added",
          title: `Added ${currEdge.type || "relationship"}`,
          description: "Connected elements in diagram",
        });
      }
    }

    for (const [id, oldEdge] of baseEdges) {
      if (!currEdges.has(id)) {
        changes.push({
          id: `del-edge-${id}`,
          category: "edge",
          action: "removed",
          title: `Removed ${oldEdge.type || "relationship"}`,
          description: "Disconnected elements in diagram",
        });
      }
    }

    return changes;
  } catch {
    return [];
  }
}

const CHANGELOG_KEY_PREFIX = "netherite_changelog_";

export function loadChangelog(noteId: string): ChangelogEntry[] {
  if (typeof window === "undefined" || !noteId) return [];
  try {
    const raw = localStorage.getItem(`${CHANGELOG_KEY_PREFIX}${noteId}`);
    return raw ? (JSON.parse(raw) as ChangelogEntry[]) : [];
  } catch {
    return [];
  }
}

export function saveChangelogEntry(entry: ChangelogEntry): void {
  if (typeof window === "undefined" || !entry.noteId) return;
  try {
    const existing = loadChangelog(entry.noteId);
    // Keep last 50 entries
    const updated = [entry, ...existing.filter((e) => e.id !== entry.id)].slice(0, 50);
    localStorage.setItem(`${CHANGELOG_KEY_PREFIX}${entry.noteId}`, JSON.stringify(updated));
  } catch (err) {
    console.warn("Failed to persist changelog entry in localStorage:", err);
  }
}

export function clearChangelog(noteId: string): void {
  if (typeof window === "undefined" || !noteId) return;
  try {
    localStorage.removeItem(`${CHANGELOG_KEY_PREFIX}${noteId}`);
  } catch {}
}
