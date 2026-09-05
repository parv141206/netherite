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

/**
 * Fast, lightweight LCS-based line diff algorithm running entirely in the browser.
 */
export function computeLineDiff(baseline: string, current: string): DiffResult {
  if (baseline === current) {
    return {
      hasChanges: false,
      additions: 0,
      deletions: 0,
      totalChanges: 0,
      summary: "0 changes",
      lines: baseline.split("\n").map((line, idx) => ({
        type: "unchanged",
        content: line,
        lineNumBefore: idx + 1,
        lineNumAfter: idx + 1,
      })),
    };
  }

  const baseLines = baseline.length === 0 ? [] : baseline.split("\n");
  const currLines = current.length === 0 ? [] : current.split("\n");

  const m = baseLines.length;
  const n = currLines.length;

  // For very large documents, optimize matrix space
  // Simple DP table for LCS
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));

  for (let i = 0; i < m; i++) {
    for (let j = 0; j < n; j++) {
      if (baseLines[i] === currLines[j]) {
        dp[i + 1]![j + 1] = dp[i]![j]! + 1;
      } else {
        dp[i + 1]![j + 1] = Math.max(dp[i + 1]![j]!, dp[i]![j + 1]!);
      }
    }
  }

  const resultLines: DiffLine[] = [];
  let i = m;
  let j = n;
  let additions = 0;
  let deletions = 0;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && baseLines[i - 1] === currLines[j - 1]) {
      resultLines.unshift({
        type: "unchanged",
        content: baseLines[i - 1] ?? "",
        lineNumBefore: i,
        lineNumAfter: j,
      });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i]![j - 1]! >= dp[i - 1]![j]!)) {
      resultLines.unshift({
        type: "added",
        content: currLines[j - 1] ?? "",
        lineNumAfter: j,
      });
      additions++;
      j--;
    } else if (i > 0) {
      resultLines.unshift({
        type: "removed",
        content: baseLines[i - 1] ?? "",
        lineNumBefore: i,
      });
      deletions++;
      i--;
    }
  }

  const summary = additions > 0 && deletions > 0
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
    lines: resultLines,
  };
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
