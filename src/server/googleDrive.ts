import { google } from "googleapis";
import { Readable } from "stream";

// In-memory cache for folder IDs to eliminate redundant Drive queries (5 min TTL)
const folderIdCache = new Map<string, { folderId: string; expiresAt: number }>();
// In-memory cache for resolved Netherite folder tree IDs (3 min TTL)
const folderTreeCache = new Map<string, { folderIds: string[]; expiresAt: number }>();

function getCachedFolderId(key: string): string | null {
  const entry = folderIdCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    folderIdCache.delete(key);
    return null;
  }
  return entry.folderId;
}

function setCachedFolderId(key: string, folderId: string) {
  folderIdCache.set(key, {
    folderId,
    expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
  });
}

function getCachedFolderTree(key: string): string[] | null {
  const entry = folderTreeCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    folderTreeCache.delete(key);
    return null;
  }
  return entry.folderIds;
}

function setCachedFolderTree(key: string, folderIds: string[]) {
  folderTreeCache.set(key, {
    folderIds,
    expiresAt: Date.now() + 3 * 60 * 1000, // 3 minutes
  });
}

interface SessionLike {
  user?: { id?: string };
  accessToken?: string;
  refreshToken?: string;
}

function getUserKey(session: unknown): string {
  const s = session as SessionLike | null | undefined;
  return s?.user?.id ?? s?.accessToken?.slice(-16) ?? "default";
}

function cleanEnv(val?: string): string | undefined {
  if (!val) return undefined;
  const trimmed = val.trim();
  return trimmed.replace(/^["']|["']$/g, "").trim();
}

const googleClientId =
  cleanEnv(process.env.AUTH_GOOGLE_ID) ||
  cleanEnv(process.env.GOOGLE_CLIENT_ID);

const googleClientSecret =
  cleanEnv(process.env.AUTH_GOOGLE_SECRET) ||
  cleanEnv(process.env.GOOGLE_CLIENT_SECRET);

export async function getDriveClient(session: any) {
  const accessToken = session?.accessToken;
  const refreshToken = session?.refreshToken;

  if (!accessToken && !refreshToken) {
    throw new Error("No Google account linked or missing access token in session");
  }

  const oauth2Client = new google.auth.OAuth2(
    googleClientId,
    googleClientSecret
  );

  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  return google.drive({ version: "v3", auth: oauth2Client });
}

export async function ensureNetheriteFolder(session: any): Promise<string> {
  const cacheKey = `netherite-root-${getUserKey(session)}`;
  const cached = getCachedFolderId(cacheKey);
  if (cached) return cached;

  const drive = await getDriveClient(session);

  // Check if Netherite folder exists
  const res = await drive.files.list({
    q: "mimeType='application/vnd.google-apps.folder' and name='Netherite' and trashed=false",
    fields: "files(id, name)",
    spaces: "drive",
  });

  if (res.data.files && res.data.files.length > 0 && res.data.files[0]?.id) {
    const id = res.data.files[0].id;
    setCachedFolderId(cacheKey, id);
    return id;
  }

  // Create folder
  const folderRes = await drive.files.create({
    requestBody: {
      name: "Netherite",
      mimeType: "application/vnd.google-apps.folder",
    },
    fields: "id",
  });

  const newId = folderRes.data.id!;
  setCachedFolderId(cacheKey, newId);
  return newId;
}

export async function ensureAssetsFolder(session: any): Promise<string> {
  const cacheKey = `netherite-assets-${getUserKey(session)}`;
  const cached = getCachedFolderId(cacheKey);
  if (cached) return cached;

  const drive = await getDriveClient(session);
  const rootFolderId = await ensureNetheriteFolder(session);

  const res = await drive.files.list({
    q: `'${rootFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and name='assets' and trashed=false`,
    fields: "files(id, name)",
    spaces: "drive",
  });

  if (res.data.files && res.data.files.length > 0 && res.data.files[0]?.id) {
    const id = res.data.files[0].id;
    setCachedFolderId(cacheKey, id);
    return id;
  }

  const folderRes = await drive.files.create({
    requestBody: {
      name: "assets",
      parents: [rootFolderId],
      mimeType: "application/vnd.google-apps.folder",
    },
    fields: "id",
  });

  const newId = folderRes.data.id!;
  setCachedFolderId(cacheKey, newId);
  return newId;
}

async function withRetry<T>(fn: () => Promise<T>, retries = 2, delayMs = 600): Promise<T> {
  let attempt = 0;
  while (attempt <= retries) {
    try {
      return await fn();
    } catch (err: any) {
      const errMsg = String(err?.message || err || "");
      if (errMsg.includes("invalid_grant")) {
        throw new Error("Google authorization expired or revoked. Please sign out and sign in again.");
      }
      attempt++;
      if (attempt > retries) throw err;
      console.warn(`Drive API call transient error (attempt ${attempt}/${retries}):`, errMsg);
      await new Promise((resolve) => setTimeout(resolve, delayMs * attempt));
    }
  }
  throw new Error("Retry failed");
}

export interface FileMetadata {
  id: string;
  name: string;
  mimeType?: string;
  type: "note" | "drawing" | "folder" | "image" | "uml" | "mermaid";
  parentId?: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

export interface WorkspaceMetadata {
  version: number;
  folderColors: Record<string, string>;
  files?: Record<string, FileMetadata>;
  [key: string]: any;
}

export async function getWorkspaceMetadata(session: any): Promise<WorkspaceMetadata> {
  return withRetry(async () => {
    const drive = await getDriveClient(session);
    const rootFolderId = await ensureNetheriteFolder(session);

    const res = await drive.files.list({
      q: `'${rootFolderId}' in parents and (name='.netherite.json' or name='netherite_workspace_metadata.json') and trashed=false`,
      fields: "files(id, name)",
      spaces: "drive",
    });

    if (!res.data.files || res.data.files.length === 0 || !res.data.files[0]?.id) {
      return { version: 1, folderColors: {}, files: {} };
    }

    const fileId = res.data.files[0].id;
    try {
      const fileRes = await drive.files.get(
        { fileId, alt: "media" },
        { responseType: "text" }
      );
      const data = typeof fileRes.data === "string" ? JSON.parse(fileRes.data) : fileRes.data;
      return { version: 1, folderColors: {}, files: {}, ...data };
    } catch (err) {
      console.warn("Failed to parse .netherite.json:", err);
      return { version: 1, folderColors: {}, files: {} };
    }
  });
}

export async function saveWorkspaceMetadata(
  session: any,
  metadata: Partial<WorkspaceMetadata>
): Promise<{ success: boolean; id?: string }> {
  return withRetry(async () => {
    const drive = await getDriveClient(session);
    const rootFolderId = await ensureNetheriteFolder(session);

    // Fetch existing metadata to merge cleanly
    const existing = await getWorkspaceMetadata(session);
    const merged = {
      ...existing,
      ...metadata,
      folderColors: { ...(existing.folderColors ?? {}), ...(metadata.folderColors ?? {}) },
      files: { ...(existing.files ?? {}), ...(metadata.files ?? {}) },
      updatedAt: new Date().toISOString(),
    };
    const jsonString = JSON.stringify(merged, null, 2);

    const res = await drive.files.list({
      q: `'${rootFolderId}' in parents and (name='.netherite.json' or name='netherite_workspace_metadata.json') and trashed=false`,
      fields: "files(id, name)",
      spaces: "drive",
    });

    if (res.data.files && res.data.files.length > 0 && res.data.files[0]?.id) {
      const fileId = res.data.files[0].id;
      await drive.files.update({
        fileId,
        media: {
          mimeType: "application/json",
          body: jsonString,
        },
      });
      return { success: true, id: fileId };
    } else {
      const createRes = await drive.files.create({
        requestBody: {
          name: ".netherite.json",
          parents: [rootFolderId],
          mimeType: "application/json",
        },
        media: {
          mimeType: "application/json",
          body: jsonString,
        },
        fields: "id",
      });
      return { success: true, id: createRes.data.id ?? undefined };
    }
  });
}


export async function checkDriveScope(session: any): Promise<{ hasFullDriveScope: boolean; scopes: string[] }> {
  try {
    const token = session?.accessToken;
    if (!token) return { hasFullDriveScope: false, scopes: [] };
    const oauth2Client = new google.auth.OAuth2(
      process.env.AUTH_GOOGLE_ID,
      process.env.AUTH_GOOGLE_SECRET
    );
    oauth2Client.setCredentials({ access_token: token });
    const tokenInfo = await oauth2Client.getTokenInfo(token);
    const scopes: string[] = tokenInfo.scopes ?? [];
    const hasFullDriveScope = scopes.some(
      (s) => s.includes("auth/drive") && !s.endsWith("drive.file") && !s.endsWith("drive.appdata")
    );
    return { hasFullDriveScope, scopes };
  } catch (err) {
    console.warn("Error checking drive scope:", err);
    return { hasFullDriveScope: true, scopes: [] };
  }
}

/**
 * Robust paginated file fetcher across Google Drive API
 */
async function fetchAllDriveFiles(
  drive: any,
  query: string,
  fields = "nextPageToken, files(id, name, mimeType, modifiedTime, createdTime, parents, properties)"
): Promise<any[]> {
  const all: any[] = [];
  let pageToken: string | undefined = undefined;
  do {
    const res: any = await drive.files.list({
      q: query,
      fields,
      pageSize: 1000,
      spaces: "drive",
      pageToken,
    });
    if (res.data.files && res.data.files.length > 0) {
      all.push(...res.data.files);
    }
    pageToken = res.data.nextPageToken || undefined;
  } while (pageToken);
  return all;
}

export async function listNotes(session: any) {
  return withRetry(async () => {
    const drive = await getDriveClient(session);
    const rootFolderId = await ensureNetheriteFolder(session);

    // 1. Fetch all folders with complete pagination so no subfolder is ever missed
    const [allFolders, existingMeta] = await Promise.all([
      fetchAllDriveFiles(
        drive,
        "trashed=false and mimeType='application/vnd.google-apps.folder'",
        "nextPageToken, files(id, name, mimeType, modifiedTime, parents)"
      ),
      getWorkspaceMetadata(session).catch(() => ({ version: 1, folderColors: {}, files: {} })),
    ]);

    // Discover all Netherite root folders (handles multiple user-created roots seamlessly)
    const netheriteFolderIds = new Set<string>([rootFolderId]);
    for (const f of allFolders) {
      if (f.name?.toLowerCase() === "netherite" && f.id) {
        netheriteFolderIds.add(f.id);
      }
    }

    // Recursively collect all descendant folders strictly inside Netherite
    let addedNew = true;
    while (addedNew) {
      addedNew = false;
      for (const folder of allFolders) {
        if (!folder.id || netheriteFolderIds.has(folder.id)) continue;
        if (folder.name?.toLowerCase() === "assets") continue;
        const isChild = folder.parents?.some((p: string) => netheriteFolderIds.has(p));
        if (isChild) {
          netheriteFolderIds.add(folder.id);
          addedNew = true;
        }
      }
    }

    // 2. Fetch all files inside all Netherite folders with chunked parent queries + pagination
    const parentIds = Array.from(netheriteFolderIds);
    const rawFiles: any[] = [];
    const CHUNK_SIZE = 30;

    for (let i = 0; i < parentIds.length; i += CHUNK_SIZE) {
      const chunk = parentIds.slice(i, i + CHUNK_SIZE);
      const parentClause = chunk.map((id) => `'${id}' in parents`).join(" or ");
      // Unconstrained file query: NEVER drop a file based on mimeType/extension!
      const chunkFiles = await fetchAllDriveFiles(
        drive,
        `trashed=false and (${parentClause}) and mimeType!='application/vnd.google-apps.folder'`,
        "nextPageToken, files(id, name, mimeType, modifiedTime, createdTime, parents, properties)"
      );
      rawFiles.push(...chunkFiles);
    }

    const updatedFilesMeta: Record<string, FileMetadata> = { ...(existingMeta.files ?? {}) };
    let metadataNeedsSave = false;
    const backgroundUpdates: Array<Promise<any>> = [];

    // Filter, normalize manually added items, and generate metadata
    const itemsToReturn: Array<{
      id: string;
      name: string;
      mimeType: string;
      modifiedTime: string;
      parents: string[];
    }> = [];

    // Include only folders belonging to Netherite
    for (const f of allFolders) {
      if (!f.id || !f.name) continue;
      if (f.name.startsWith(".") || f.name.toLowerCase() === "assets") continue;
      if (f.id === rootFolderId || f.name.toLowerCase() === "netherite") continue;
      if (!netheriteFolderIds.has(f.id)) continue;

      const folderMime = f.mimeType ?? "application/vnd.google-apps.folder";

      itemsToReturn.push({
        id: f.id,
        name: f.name,
        mimeType: folderMime,
        modifiedTime: f.modifiedTime ?? new Date().toISOString(),
        parents: f.parents ?? [rootFolderId],
      });

      if (!updatedFilesMeta[f.id]) {
        updatedFilesMeta[f.id] = {
          id: f.id,
          name: f.name,
          mimeType: folderMime,
          type: "folder",
          parentId: f.parents?.[0] ?? rootFolderId,
          updatedAt: f.modifiedTime ?? new Date().toISOString(),
        };
        metadataNeedsSave = true;
      }
    }

    // Process files strictly belonging to Netherite folders
    for (const f of rawFiles) {
      if (!f.id || !f.name) continue;
      if (f.mimeType === "application/vnd.google-apps.folder") continue;
      if (f.name.startsWith(".") || f.name.toLowerCase() === "assets") continue;

      // Ensure file parent belongs to Netherite
      const isInsideNetherite = f.parents?.some((p: string) => netheriteFolderIds.has(p));
      if (!isInsideNetherite) continue;

      const isImage =
        f.mimeType?.startsWith("image/") ||
        /\.(png|jpg|jpeg|gif|webp|svg|bmp|ico)$/i.test(f.name);

      const isDrawing =
        !isImage &&
        (f.name.endsWith(".excalidraw") ||
          f.mimeType === "application/vnd.excalidraw+json" ||
          f.properties?.netheriteType === "drawing");

      const isUml =
        !isImage &&
        !isDrawing &&
        (f.name.endsWith(".apollon") ||
          f.name.endsWith(".uml") ||
          f.mimeType === "application/vnd.apollon+json" ||
          f.properties?.netheriteType === "uml");

      const isMermaid =
        !isImage &&
        !isDrawing &&
        !isUml &&
        (f.name.endsWith(".mmd") ||
          f.name.endsWith(".mermaid") ||
          f.mimeType === "text/vnd.mermaid" ||
          f.properties?.netheriteType === "mermaid");

      let displayName = f.name;

      if (isImage) {
        displayName = f.name;
      } else if (!isDrawing && !isUml && !isMermaid && !displayName.endsWith(".md")) {
        // Auto-normalize text documents while preserving other code formats
        if (/\.(txt|markdown|text)$/i.test(displayName)) {
          const cleanBase = displayName.replace(/\.(txt|markdown|text)$/i, "");
          const normalizedName = `${cleanBase}.md`;
          displayName = normalizedName;
          backgroundUpdates.push(
            drive.files.update({
              fileId: f.id,
              requestBody: {
                name: normalizedName,
                properties: {
                  netheriteType: "note",
                  netheriteManaged: "true",
                },
              },
            }).catch(() => {})
          );
        } else if (!displayName.includes(".")) {
          // If no extension was provided in Drive, treat as .md note
          displayName = `${displayName}.md`;
        }
      } else if (!f.properties?.netheriteManaged) {
        backgroundUpdates.push(
          drive.files.update({
            fileId: f.id,
            requestBody: {
              properties: {
                netheriteType: isDrawing ? "drawing" : isUml ? "uml" : isMermaid ? "mermaid" : isImage ? "image" : "note",
                netheriteManaged: "true",
              },
            },
          }).catch(() => {})
        );
      }

      const effectiveMimeType = isImage
        ? f.mimeType ?? "image/png"
        : isDrawing
        ? "application/vnd.excalidraw+json"
        : isUml
        ? "application/vnd.apollon+json"
        : isMermaid
        ? "text/vnd.mermaid"
        : "text/markdown";

      itemsToReturn.push({
        id: f.id,
        name: displayName,
        mimeType: effectiveMimeType,
        modifiedTime: f.modifiedTime ?? new Date().toISOString(),
        parents: f.parents ?? [rootFolderId],
      });

      if (!updatedFilesMeta[f.id]) {
        updatedFilesMeta[f.id] = {
          id: f.id,
          name: displayName,
          mimeType: effectiveMimeType,
          type: isImage ? "image" : isDrawing ? "drawing" : isUml ? "uml" : isMermaid ? "mermaid" : "note",
          parentId: f.parents?.[0] ?? rootFolderId,
          createdAt: f.createdTime ?? f.modifiedTime ?? new Date().toISOString(),
          updatedAt: f.modifiedTime ?? new Date().toISOString(),
        };
        metadataNeedsSave = true;
      }
    }

    if (metadataNeedsSave) {
      saveWorkspaceMetadata(session, { files: updatedFilesMeta }).catch((saveMetaErr) => {
        console.warn("Failed to persist auto-generated workspace metadata:", saveMetaErr);
      });
    }

    // Fire off non-critical property updates without delaying user response
    if (backgroundUpdates.length > 0) {
      void Promise.allSettled(backgroundUpdates);
    }

    return itemsToReturn;
  });
}

/**
 * Deep scan and repair Google Drive workspace:
 * Clears caches, discovers all folders/files, fixes metadata tags, and repairs missing files
 */
export async function deepSyncAndRepairWorkspace(session: any) {
  folderIdCache.clear();
  const rootFolderId = await ensureNetheriteFolder(session);
  await ensureAssetsFolder(session);
  const notes = await listNotes(session);
  const totalFolders = notes.filter((n) => n.mimeType === "application/vnd.google-apps.folder").length;
  const totalFiles = notes.length - totalFolders;

  return {
    success: true,
    rootFolderId,
    totalFolders,
    totalFiles,
    totalItems: notes.length,
    message: `Deep sync complete: Reconciled ${totalFolders} folders and ${totalFiles} files across Google Drive.`,
  };
}

export async function createSubfolder(session: any, name: string, parentId?: string) {
  folderTreeCache.delete(getUserKey(session));

  const drive = await getDriveClient(session);
  const rootId = parentId || (await ensureNetheriteFolder(session));

  const res = await drive.files.create({
    requestBody: {
      name,
      parents: [rootId],
      mimeType: "application/vnd.google-apps.folder",
    },
    fields: "id, name, mimeType, modifiedTime, parents",
  });

  return res.data;
}

export async function moveItem(session: any, fileId: string, targetFolderId: string) {
  const drive = await getDriveClient(session);
  
  const file = await drive.files.get({
    fileId,
    fields: "parents",
  });
  const previousParents = file.data.parents?.join(",") || "";

  await drive.files.update({
    fileId,
    addParents: targetFolderId,
    removeParents: previousParents,
    fields: "id, parents",
  });
}

export async function getNoteContent(session: any, fileId: string) {
  if (!fileId || fileId.startsWith("temp-")) return "";
  return withRetry(async () => {
    const drive = await getDriveClient(session);
    try {
      // Direct media get is 2x faster than querying metadata first
      const res = await drive.files.get(
        { fileId, alt: "media" },
        { responseType: "text" }
      );
      if (typeof res.data === "object" && res.data !== null) {
        return JSON.stringify(res.data);
      }
      return (res.data as string) ?? "";
    } catch (error: any) {
      // Fallback for Google Docs formats that require export
      if (error?.message?.includes("export") || error?.code === 403 || error?.code === 400) {
        try {
          const exportRes = await drive.files.export(
            { fileId, mimeType: "text/plain" },
            { responseType: "text" }
          );
          return (exportRes.data as string) ?? "";
        } catch {
          return "";
        }
      }
      console.error(`Error in getNoteContent for ${fileId}:`, error?.message || error);
      return "";
    }
  });
}

export async function saveNote(session: any, fileId: string, content: string) {
  return withRetry(async () => {
    const drive = await getDriveClient(session);
    const meta = await drive.files.get({ fileId, fields: "id, name, mimeType" });
    const isDrawing =
      meta.data.name?.endsWith(".excalidraw") ||
      meta.data.mimeType === "application/vnd.excalidraw+json";
    const isUml =
      meta.data.name?.endsWith(".apollon") ||
      meta.data.name?.endsWith(".uml") ||
      meta.data.mimeType === "application/vnd.apollon+json";

    const mimeType = isDrawing
      ? "application/vnd.excalidraw+json"
      : isUml
      ? "application/vnd.apollon+json"
      : "text/markdown";

    await drive.files.update({
      fileId,
      media: {
        mimeType,
        body: content,
      },
    });
  });
}

export async function getResumableUploadSession(session: any, fileId: string) {
  const drive = await getDriveClient(session);
  const meta = await drive.files.get({ fileId, fields: "id, name, mimeType" });
  const isDrawing =
    meta.data.name?.endsWith(".excalidraw") ||
    meta.data.mimeType === "application/vnd.excalidraw+json";
  const isUml =
    meta.data.name?.endsWith(".apollon") ||
    meta.data.name?.endsWith(".uml") ||
    meta.data.mimeType === "application/vnd.apollon+json";

  const mimeType = isDrawing
    ? "application/vnd.excalidraw+json"
    : isUml
    ? "application/vnd.apollon+json"
    : "text/markdown";

  const s = session as SessionLike | null | undefined;
  const accessToken = s?.accessToken;
  const refreshToken = s?.refreshToken;

  const oauth2Client = new google.auth.OAuth2(
    process.env.AUTH_GOOGLE_ID,
    process.env.AUTH_GOOGLE_SECRET
  );
  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  const tokenRes = await oauth2Client.getAccessToken();
  const validToken = tokenRes.token ?? accessToken;

  if (!validToken) {
    throw new Error("Missing access token for Google Drive upload");
  }

  const res = await fetch(
    `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=resumable`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${validToken}`,
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Type": mimeType,
      },
      body: JSON.stringify({
        mimeType,
      }),
    }
  );

  const uploadUrl = res.headers.get("location");
  if (!uploadUrl) {
    const errText = await res.text();
    throw new Error(`Failed to initiate Google Drive upload session: ${res.status} ${errText}`);
  }

  return { uploadUrl, mimeType };
}

export async function createNote(
  session: any,
  name: string,
  content: string = "",
  parentId?: string,
  type: "note" | "drawing" | "uml" | "mermaid" | "tikz" = "note"
) {
  const drive = await getDriveClient(session);
  const folderId = parentId || (await ensureNetheriteFolder(session));

  const isDrawing = type === "drawing" || name.endsWith(".excalidraw");
  const isUml = type === "uml" || name.endsWith(".apollon") || name.endsWith(".uml");
  const isMermaid = type === "mermaid" || name.endsWith(".mmd") || name.endsWith(".mermaid");
  const isTikz = type === "tikz" || name.endsWith(".tikz") || name.endsWith(".tex");

  let cleanName = name;
  let finalName = name;
  let mimeType = "text/markdown";

  if (isDrawing) {
    cleanName = name.replace(/\.excalidraw$/i, "");
    finalName = `${cleanName}.excalidraw`;
    mimeType = "application/vnd.excalidraw+json";
  } else if (isUml) {
    cleanName = name.replace(/\.(apollon|uml)$/i, "");
    finalName = `${cleanName}.apollon`;
    mimeType = "application/vnd.apollon+json";
  } else if (isMermaid) {
    cleanName = name.replace(/\.(mmd|mermaid)$/i, "");
    finalName = `${cleanName}.mmd`;
    mimeType = "text/vnd.mermaid";
  } else if (isTikz) {
    cleanName = name.replace(/\.(tikz|tex)$/i, "");
    finalName = `${cleanName}.tikz`;
    mimeType = "text/vnd.tikz";
  } else {
    cleanName = name.replace(/\.md$/i, "");
    finalName = `${cleanName}.md`;
    mimeType = "text/markdown";
  }

  const initialBody =
    isDrawing && !content
      ? JSON.stringify({
          type: "excalidraw",
          version: 2,
          source: "netherite",
          elements: [],
          appState: { viewBackgroundColor: "#ffffff", currentItemFontFamily: 1 },
          files: {},
        })
      : isUml && !content
      ? JSON.stringify(
          {
            version: "4.2.0",
            id: `uml-${Date.now()}`,
            title: cleanName,
            type: "ClassDiagram",
            nodes: [],
            edges: [],
            assessments: {},
          },
          null,
          2
        )
      : isMermaid && !content
      ? `flowchart TD\n  Start([Start]) --> Process[Process Request]\n  Process --> Decision{Is Valid?}\n  Decision -- Yes --> Success[Operation Complete]\n  Decision -- No --> Error[Handle Error]\n  Success --> End([Finish])\n  Error --> End`
      : isTikz && !content
      ? `\\begin{tikzpicture}[node distance=2cm, auto, >=stealth]\n  \\node [circle, draw=blue!80, fill=blue!10, thick] (A) {Input};\n  \\node [rectangle, draw=purple!80, fill=purple!10, thick, right of=A, node distance=3cm] (B) {Processing};\n  \\node [circle, draw=green!80, fill=green!10, thick, right of=B, node distance=3cm] (C) {Output};\n  \\path [->, thick] (A) edge node {x} (B);\n  \\path [->, thick] (B) edge node {f(x)} (C);\n\\end{tikzpicture}`
      : content;

  const res = await drive.files.create({
    requestBody: {
      name: finalName,
      parents: [folderId],
      mimeType,
    },
    media: {
      mimeType,
      body: initialBody,
    },
    fields: "id, name, mimeType, modifiedTime, parents",
  });

  return res.data;
}

export async function renameNote(session: any, fileId: string, newName: string) {
  const drive = await getDriveClient(session);
  const fileMeta = await drive.files.get({ fileId, fields: "id, name, mimeType" });
  const isFolder = fileMeta.data.mimeType === "application/vnd.google-apps.folder";
  const isDrawing =
    fileMeta.data.name?.endsWith(".excalidraw") ||
    fileMeta.data.mimeType === "application/vnd.excalidraw+json";
  const isUml =
    fileMeta.data.name?.endsWith(".apollon") ||
    fileMeta.data.name?.endsWith(".uml") ||
    fileMeta.data.mimeType === "application/vnd.apollon+json";
  const isMermaid =
    fileMeta.data.name?.endsWith(".mmd") ||
    fileMeta.data.name?.endsWith(".mermaid") ||
    fileMeta.data.mimeType === "text/vnd.mermaid";

  let finalName = newName;
  if (isFolder) {
    finalName = newName;
  } else if (isDrawing) {
    const cleanName = newName.replace(/\.excalidraw$/i, "");
    finalName = `${cleanName}.excalidraw`;
  } else if (isUml) {
    const cleanName = newName.replace(/\.(apollon|uml)$/i, "");
    finalName = `${cleanName}.apollon`;
  } else if (isMermaid) {
    const cleanName = newName.replace(/\.(mmd|mermaid)$/i, "");
    finalName = `${cleanName}.mmd`;
  } else {
    const cleanName = newName.replace(/\.md$/i, "");
    finalName = `${cleanName}.md`;
  }

  await drive.files.update({
    fileId,
    requestBody: {
      name: finalName,
    },
  });
}

export async function deleteNote(session: any, fileId: string) {
  folderTreeCache.delete(getUserKey(session));

  const drive = await getDriveClient(session);
  await drive.files.update({
    fileId,
    requestBody: {
      trashed: true,
    },
  });
}

export async function uploadAsset(
  session: any,
  fileName: string,
  mimeType: string,
  buffer: Buffer
) {
  const drive = await getDriveClient(session);
  const assetsFolderId = await ensureAssetsFolder(session);

  const res = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [assetsFolderId],
    },
    media: {
      mimeType,
      body: Readable.from(buffer),
    },
    fields: "id, name, mimeType, parents",
  });

  const fileId = res.data.id;
  if (!fileId) throw new Error("Failed to upload image asset to Drive");

  // Make file publicly viewable so thumbnail preview renders in markdown
  try {
    await drive.permissions.create({
      fileId,
      requestBody: {
        role: "reader",
        type: "anyone",
      },
    });
  } catch (err) {
    console.warn("Drive permission create warning:", err);
  }

  return {
    id: fileId,
    name: fileName,
    mimeType,
    parents: [assetsFolderId],
    url: `https://lh3.googleusercontent.com/d/${fileId}`,
  };
}

export async function getImageAsset(session: any, fileId: string) {
  return withRetry(async () => {
    const drive = await getDriveClient(session);
    const meta = await drive.files.get({
      fileId,
      fields: "id, name, mimeType",
    });

    const res = await drive.files.get(
      { fileId, alt: "media" },
      { responseType: "arraybuffer" }
    );

    const buffer = Buffer.from(res.data as ArrayBuffer);
    const base64 = buffer.toString("base64");
    const mimeType = meta.data.mimeType ?? "image/png";

    return {
      id: fileId,
      name: meta.data.name ?? "image",
      mimeType,
      dataUrl: `data:${mimeType};base64,${base64}`,
    };
  });
}

export async function searchNotesContent(session: any, query: string) {
  return withRetry(async () => {
    const drive = await getDriveClient(session);
    const rootFolderId = await ensureNetheriteFolder(session);

    const userKey = getUserKey(session);
    let parentIds = getCachedFolderTree(userKey);

    if (!parentIds) {
      // 1. Fetch folders belonging to Netherite
      const foldersRes = await drive.files.list({
        q: "trashed=false and mimeType='application/vnd.google-apps.folder'",
        fields: "files(id, name, parents)",
        pageSize: 1000,
        spaces: "drive",
      });

      const allFolders = foldersRes.data.files ?? [];
      const netheriteFolderIds = new Set<string>([rootFolderId]);

      let added = true;
      while (added) {
        added = false;
        for (const f of allFolders) {
          if (!f.id || netheriteFolderIds.has(f.id)) continue;
          if (f.parents?.some((p: string) => netheriteFolderIds.has(p))) {
            netheriteFolderIds.add(f.id);
            added = true;
          }
        }
      }

      parentIds = Array.from(netheriteFolderIds);
      setCachedFolderTree(userKey, parentIds);
    }

    const parentClause = parentIds.slice(0, 30).map((id) => `'${id}' in parents`).join(" or ");
    const sanitized = query.replace(/'/g, "\\'");

    // Search full-text content in files within Netherite
    const searchRes = await drive.files.list({
      q: `trashed=false and (${parentClause}) and mimeType!='application/vnd.google-apps.folder' and (name contains '${sanitized}' or fullText contains '${sanitized}')`,
      fields: "files(id, name, mimeType, modifiedTime, parents)",
      pageSize: 30,
      spaces: "drive",
    });

    return (searchRes.data.files ?? []).map((f) => ({
      id: f.id ?? "",
      name: f.name ?? "",
      mimeType: f.mimeType ?? "text/markdown",
      modifiedTime: f.modifiedTime ?? new Date().toISOString(),
      parents: f.parents ?? [],
    }));
  });
}
