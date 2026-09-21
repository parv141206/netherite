import FS from "@isomorphic-git/lightning-fs";
import git from "isomorphic-git";
import http from "isomorphic-git/http/web";

export const GIT_FS_DB_NAME = "netherite-git-fs";
export const GIT_WORKSPACE_DIR = "/workspace";

export const GIT_ENABLED_KEY = "netherite_git_enabled";
export const GIT_AUTHOR_NAME_KEY = "netherite_git_author_name";
export const GIT_AUTHOR_EMAIL_KEY = "netherite_git_author_email";
export const GIT_AUTO_COMMIT_CADENCE_KEY = "netherite_git_auto_commit_cadence";
export const GIT_GITHUB_REMOTE_URL_KEY = "netherite_git_github_remote_url";
export const GIT_GITHUB_PAT_KEY = "netherite_git_github_pat";
export const GIT_GITHUB_BRANCH_KEY = "netherite_git_github_branch";
export const GIT_CORS_PROXY_KEY = "netherite_git_cors_proxy";

export const DRIVE_REVISIONS_ENABLED_KEY = "netherite_drive_revisions_enabled";
export const DRIVE_KEEP_MILESTONES_FOREVER_KEY =
  "netherite_drive_keep_milestones_forever";

export const GIT_SETTINGS_CHANGED_EVENT = "netherite:git-settings-changed";

export type GitCadence = "on-save" | "periodic" | "on-tab-close" | "manual";

export interface GitCommitItem {
  oid: string;
  shortOid: string;
  message: string;
  author: {
    name: string;
    email: string;
    timestamp: number; // in ms
    dateStr: string;
  };
  isMilestone: boolean;
}

export interface GitRepoStats {
  commitCount: number;
  branch: string;
  isInitialized: boolean;
  lastCommitDate?: string;
}

let fsInstance: FS | null = null;

function getFS(): FS {
  if (typeof window === "undefined") {
    throw new Error("Git engine cannot run in server-side context");
  }
  fsInstance ??= new FS(GIT_FS_DB_NAME);
  return fsInstance;
}

type PromisifiedFS = InstanceType<typeof FS>["promises"];

async function ensureDir(pfs: PromisifiedFS, dirPath: string): Promise<void> {
  const parts = dirPath.split("/").filter(Boolean);
  let current = "";
  for (const part of parts) {
    current += "/" + part;
    try {
      await pfs.mkdir(current);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code !== "EEXIST") {
        // Ignore already existing directory
      }
    }
  }
}

/**
 * Returns safe path inside /workspace for storing note content.
 */
export function getGitFilePath(fileId: string, fileName?: string): string {
  const safeId = encodeURIComponent(fileId).replace(/[%*+~.()'!]/g, "_");
  let ext = ".md";
  if (fileName?.endsWith(".excalidraw")) ext = ".excalidraw";
  else if (fileName?.endsWith(".apollon")) ext = ".apollon";
  else if (fileName?.endsWith(".mermaid")) ext = ".mermaid";
  else if (fileName?.endsWith(".json")) ext = ".json";
  else if (fileName && fileName.lastIndexOf(".") > 0) {
    ext = fileName.slice(fileName.lastIndexOf("."));
  }
  return `notes/${safeId}${ext}`;
}

export function isGitEnabled(): boolean {
  if (typeof window === "undefined") return true;
  const val = localStorage.getItem(GIT_ENABLED_KEY);
  return val === null ? true : val === "true";
}

export function getGitAuthorInfo(): { name: string; email: string } {
  if (typeof window === "undefined") {
    return { name: "Netherite User", email: "user@netherite.local" };
  }
  const name = localStorage.getItem(GIT_AUTHOR_NAME_KEY) ?? "Netherite User";
  const email =
    localStorage.getItem(GIT_AUTHOR_EMAIL_KEY) ?? "user@netherite.local";
  return { name, email };
}

export function getGitCadence(): GitCadence {
  if (typeof window === "undefined") return "on-save";
  const val = localStorage.getItem(GIT_AUTO_COMMIT_CADENCE_KEY);
  if (val === "periodic" || val === "on-tab-close" || val === "manual") {
    return val;
  }
  return "on-save";
}

export function isDriveRevisionsEnabled(): boolean {
  if (typeof window === "undefined") return true;
  const val = localStorage.getItem(DRIVE_REVISIONS_ENABLED_KEY);
  return val === null ? true : val === "true";
}

export function isDriveKeepMilestonesForever(): boolean {
  if (typeof window === "undefined") return true;
  const val = localStorage.getItem(DRIVE_KEEP_MILESTONES_FOREVER_KEY);
  return val === null ? true : val === "true";
}

/**
 * Initializes Git repository in LightningFS IndexedDB if not already present.
 */
export async function initGitRepo(): Promise<void> {
  if (typeof window === "undefined") return;
  const fs = getFS();
  const pfs = fs.promises;

  await ensureDir(pfs, GIT_WORKSPACE_DIR);
  await ensureDir(pfs, `${GIT_WORKSPACE_DIR}/notes`);

  try {
    await git.init({
      fs,
      dir: GIT_WORKSPACE_DIR,
      defaultBranch: "main",
    });
  } catch {
    // If already initialized, ignore
  }
}

/**
 * Commits a note into the local Git repository.
 */
export async function commitNote({
  fileId,
  fileName,
  content,
  message,
  author,
  isMilestone = false,
}: {
  fileId: string;
  fileName?: string;
  content: string;
  message?: string;
  author?: { name: string; email: string };
  isMilestone?: boolean;
}): Promise<{
  success: boolean;
  oid?: string;
  skipped?: boolean;
  error?: string;
}> {
  if (typeof window === "undefined")
    return { success: false, error: "Window undefined" };
  if (!fileId) return { success: false, error: "No fileId provided" };

  if (!isMilestone && !isGitEnabled()) {
    return { success: false, skipped: true };
  }

  try {
    const fs = getFS();
    const pfs = fs.promises;
    await initGitRepo();

    const filepath = getGitFilePath(fileId, fileName);
    const fullPath = `${GIT_WORKSPACE_DIR}/${filepath}`;

    // Read previous file if exists to verify if content changed
    let previousContent: string | null = null;
    try {
      previousContent = await pfs.readFile(fullPath, "utf8");
    } catch {
      previousContent = null;
    }

    if (previousContent === content && !isMilestone) {
      return { success: true, skipped: true };
    }

    // Write new content to disk
    await pfs.writeFile(fullPath, content, "utf8");

    // Stage the file
    await git.add({
      fs,
      dir: GIT_WORKSPACE_DIR,
      filepath,
    });

    const defaultAuthor = getGitAuthorInfo();
    const commitAuthor = {
      name: author?.name ?? defaultAuthor.name,
      email: author?.email ?? defaultAuthor.email,
    };

    const commitMessage =
      message ??
      (isMilestone
        ? `[Milestone] ${fileName ?? "Note snapshot"}`
        : `Update ${fileName ?? "note"}`);

    const oid = await git.commit({
      fs,
      dir: GIT_WORKSPACE_DIR,
      message: commitMessage,
      author: commitAuthor,
    });

    return { success: true, oid };
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.warn("Git commit error:", errMsg);
    return { success: false, error: errMsg };
  }
}

/**
 * Retrieves the commit history, optionally filtered for a specific file.
 */
export async function getGitLog({
  fileId,
  fileName,
  depth = 60,
}: {
  fileId?: string;
  fileName?: string;
  depth?: number;
} = {}): Promise<GitCommitItem[]> {
  if (typeof window === "undefined") return [];

  try {
    const fs = getFS();
    await initGitRepo();

    const filepath = fileId ? getGitFilePath(fileId, fileName) : undefined;

    let commits;
    try {
      commits = await git.log({
        fs,
        dir: GIT_WORKSPACE_DIR,
        filepath,
        depth,
      });
    } catch (err: unknown) {
      const errCode = (err as { code?: string; name?: string })?.code;
      const errName = (err as { code?: string; name?: string })?.name;
      const errMsg = String(err);

      // If repository is empty or branch not found, return empty array
      if (
        errCode === "NotFoundError" ||
        errName === "NotFoundError" ||
        errMsg.includes("refs/heads")
      ) {
        return [];
      }
      throw err;
    }

    return commits.map((c) => {
      const timestampMs = c.commit.author.timestamp * 1000;
      const date = new Date(timestampMs);
      const isMilestone =
        c.commit.message.startsWith("[Milestone]") ||
        c.commit.message.toLowerCase().includes("milestone");

      return {
        oid: c.oid,
        shortOid: c.oid.slice(0, 7),
        message: c.commit.message.trim(),
        author: {
          name: c.commit.author.name,
          email: c.commit.author.email,
          timestamp: timestampMs,
          dateStr: date.toLocaleString(),
        },
        isMilestone,
      };
    });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.warn("Error getting git log:", errMsg);
    return [];
  }
}

/**
 * Retrieves the exact content of a note at a historical commit OID.
 */
export async function getFileAtCommit({
  fileId,
  fileName,
  oid,
}: {
  fileId: string;
  fileName?: string;
  oid: string;
}): Promise<string | null> {
  if (typeof window === "undefined" || !fileId || !oid) return null;

  try {
    const fs = getFS();
    const filepath = getGitFilePath(fileId, fileName);

    try {
      const { blob } = await git.readBlob({
        fs,
        dir: GIT_WORKSPACE_DIR,
        oid,
        filepath,
      });
      return new TextDecoder().decode(blob);
    } catch {
      // Fallback: search tree if file extension changed
      const safeId = encodeURIComponent(fileId).replace(/[%*+~.()'!]/g, "_");
      const tree = await git.readTree({
        fs,
        dir: GIT_WORKSPACE_DIR,
        oid,
        filepath: "notes",
      });

      const matchingEntry = tree.tree.find((entry) =>
        entry.path.startsWith(safeId),
      );

      if (matchingEntry) {
        const { blob } = await git.readBlob({
          fs,
          dir: GIT_WORKSPACE_DIR,
          oid: matchingEntry.oid,
        });
        return new TextDecoder().decode(blob);
      }

      return null;
    }
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.warn(`Failed to read file at commit ${oid}:`, errMsg);
    return null;
  }
}

/**
 * Creates a milestone commit with a custom user message.
 */
export async function createMilestoneCommit({
  fileId,
  fileName,
  content,
  message,
}: {
  fileId: string;
  fileName?: string;
  content: string;
  message: string;
}): Promise<{ success: boolean; oid?: string; error?: string }> {
  return await commitNote({
    fileId,
    fileName,
    content,
    message: `[Milestone] ${message}`,
    isMilestone: true,
  });
}

/**
 * Returns repository overview statistics.
 */
export async function getGitRepoStats(): Promise<GitRepoStats> {
  if (typeof window === "undefined") {
    return { commitCount: 0, branch: "main", isInitialized: false };
  }

  try {
    const logs = await getGitLog({ depth: 500 });
    return {
      commitCount: logs.length,
      branch: "main",
      isInitialized: logs.length > 0,
      lastCommitDate: logs[0]?.author.dateStr,
    };
  } catch {
    return { commitCount: 0, branch: "main", isInitialized: false };
  }
}

/**
 * Pushes local Git commits to a remote GitHub repository.
 */
export async function pushToGitHub({
  url,
  token,
  branch = "main",
  corsProxy = "https://cors.isomorphic-git.org",
  onProgress,
}: {
  url: string;
  token: string;
  branch?: string;
  corsProxy?: string;
  onProgress?: (progress: {
    phase: string;
    loaded: number;
    total: number;
  }) => void;
}): Promise<{ success: boolean; message: string }> {
  if (typeof window === "undefined") {
    return { success: false, message: "Client-side only" };
  }
  if (!url) {
    return { success: false, message: "Repository URL is required" };
  }
  if (!token) {
    return { success: false, message: "Personal Access Token is required" };
  }

  try {
    const fs = getFS();
    await initGitRepo();

    const pushResult = await git.push({
      fs,
      http,
      dir: GIT_WORKSPACE_DIR,
      url,
      ref: branch,
      remoteRef: `refs/heads/${branch}`,
      corsProxy: corsProxy ?? undefined,
      onAuth: () => ({
        username: token,
        password: "",
      }),
      onProgress: (p) => {
        if (onProgress) onProgress(p);
      },
    });

    if (pushResult.ok) {
      return {
        success: true,
        message: "Successfully pushed to remote GitHub repository.",
      };
    } else {
      return {
        success: false,
        message: `Push failed: ${JSON.stringify(pushResult.error ?? "Unknown error")}`,
      };
    }
  } catch (err: unknown) {
    return {
      success: false,
      message: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Resets local Git repository if user requests a fresh start.
 */
export async function resetGitRepository(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    if (window.indexedDB) {
      await new Promise<void>((resolve, reject) => {
        const req = window.indexedDB.deleteDatabase(GIT_FS_DB_NAME);
        req.onsuccess = () => resolve();
        req.onerror = () =>
          reject(
            new Error(String(req.error?.message ?? "IndexedDB delete error")),
          );
        req.onblocked = () => resolve();
      });
      fsInstance = null;
      return true;
    }
    return false;
  } catch (err) {
    console.warn("Error deleting git indexedDB:", err);
    return false;
  }
}
