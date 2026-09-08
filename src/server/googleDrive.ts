import { google } from "googleapis";
import { Readable } from "stream";

export async function getDriveClient(session: any) {
  const accessToken = session?.accessToken;
  const refreshToken = session?.refreshToken;

  if (!accessToken && !refreshToken) {
    throw new Error("No Google account linked or missing access token in session");
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.AUTH_GOOGLE_ID,
    process.env.AUTH_GOOGLE_SECRET
  );

  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  });

  // Proactively ensure access token is fresh before invoking Drive API
  if (refreshToken) {
    try {
      const tokenRes = await oauth2Client.getAccessToken();
      if (tokenRes.token && tokenRes.token !== accessToken) {
        oauth2Client.setCredentials({
          access_token: tokenRes.token,
          refresh_token: refreshToken,
        });
        if (session) {
          session.accessToken = tokenRes.token;
        }
      }
    } catch (refreshErr) {
      console.warn("Proactive OAuth token refresh check:", refreshErr);
    }
  }

  return google.drive({ version: "v3", auth: oauth2Client });
}

export async function ensureNetheriteFolder(session: any) {
  const drive = await getDriveClient(session);

  // Check if Netherite folder exists
  const res = await drive.files.list({
    q: "mimeType='application/vnd.google-apps.folder' and name='Netherite' and trashed=false",
    fields: "files(id, name)",
    spaces: "drive",
  });

  if (res.data.files && res.data.files.length > 0 && res.data.files[0]?.id) {
    return res.data.files[0].id;
  }

  // Create folder
  const folderRes = await drive.files.create({
    requestBody: {
      name: "Netherite",
      mimeType: "application/vnd.google-apps.folder",
    },
    fields: "id",
  });

  return folderRes.data.id!;
}

export async function ensureAssetsFolder(session: any) {
  const drive = await getDriveClient(session);
  const rootFolderId = await ensureNetheriteFolder(session);

  const res = await drive.files.list({
    q: `'${rootFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and name='assets' and trashed=false`,
    fields: "files(id, name)",
    spaces: "drive",
  });

  if (res.data.files && res.data.files.length > 0 && res.data.files[0]?.id) {
    return res.data.files[0].id;
  }

  const folderRes = await drive.files.create({
    requestBody: {
      name: "assets",
      parents: [rootFolderId],
      mimeType: "application/vnd.google-apps.folder",
    },
    fields: "id",
  });

  return folderRes.data.id!;
}

async function withRetry<T>(fn: () => Promise<T>, retries = 2, delayMs = 1000): Promise<T> {
  let attempt = 0;
  while (attempt <= retries) {
    try {
      return await fn();
    } catch (err: any) {
      attempt++;
      if (attempt > retries) throw err;
      console.warn(`Drive API call transient error (attempt ${attempt}/${retries}):`, err?.message || err);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw new Error("Retry failed");
}

export interface FileMetadata {
  id: string;
  name: string;
  mimeType?: string;
  type: "note" | "drawing" | "folder" | "image";
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

export async function listNotes(session: any) {
  return withRetry(async () => {
    const drive = await getDriveClient(session);
    const rootFolderId = await ensureNetheriteFolder(session);

    // 1. Fetch all folders in Drive to resolve descendants of Netherite folder ONLY
    const foldersRes = await drive.files.list({
      q: "trashed=false and mimeType='application/vnd.google-apps.folder'",
      fields: "files(id, name, mimeType, modifiedTime, parents)",
      pageSize: 1000,
      spaces: "drive",
    });

    const allFolders = foldersRes.data.files ?? [];
    const netheriteFolderIds = new Set<string>([rootFolderId]);

    // Recursively collect all descendant folders strictly inside Netherite
    let addedNew = true;
    while (addedNew) {
      addedNew = false;
      for (const folder of allFolders) {
        if (!folder.id || netheriteFolderIds.has(folder.id)) continue;
        if (folder.name?.toLowerCase() === "assets") continue;
        const isChild = folder.parents?.some((p) => netheriteFolderIds.has(p));
        if (isChild) {
          netheriteFolderIds.add(folder.id);
          addedNew = true;
        }
      }
    }

    // 2. Query files inside Drive
    const filesRes = await drive.files.list({
      q: "trashed=false and (mimeType='text/markdown' or mimeType='text/plain' or mimeType='application/vnd.google-apps.folder' or mimeType='application/vnd.google-apps.document' or mimeType='application/vnd.excalidraw+json' or mimeType='application/json' or mimeType='application/octet-stream' or mimeType contains 'image/' or name contains '.excalidraw' or name contains '.md' or name contains '.png' or name contains '.jpg' or name contains '.jpeg' or name contains '.webp' or name contains '.svg' or name contains '.gif' or name contains '.txt' or name contains '.markdown' or name contains 'Copy of')",
      fields: "files(id, name, mimeType, modifiedTime, createdTime, parents, properties)",
      orderBy: "folder, modifiedTime desc",
      pageSize: 1000,
      spaces: "drive",
    });

    const rawFiles = filesRes.data.files ?? [];

    // 3. Load workspace metadata (.netherite.json)
    const existingMeta = await getWorkspaceMetadata(session);
    const updatedFilesMeta: Record<string, FileMetadata> = { ...(existingMeta.files ?? {}) };
    let metadataNeedsSave = false;

    // 4. Filter, normalize manually added items, and generate metadata
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
      if (f.id === rootFolderId || f.name === "Netherite") continue;
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

      // STRICT CHECK: Only include files that are inside Netherite or its subfolders
      const isInsideNetherite = f.parents?.some((p) => netheriteFolderIds.has(p));
      if (!isInsideNetherite) continue;

      const isImage =
        f.mimeType?.startsWith("image/") ||
        /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(f.name);

      const isDrawing =
        !isImage &&
        (f.name.endsWith(".excalidraw") ||
          f.mimeType === "application/vnd.excalidraw+json" ||
          f.properties?.netheriteType === "drawing");

      let displayName = f.name;

      if (isImage) {
        displayName = f.name;
      } else if (!isDrawing && !displayName.endsWith(".md")) {
        const cleanBase = displayName.replace(/\.(txt|markdown|text)$/i, "");
        const normalizedName = `${cleanBase}.md`;
        try {
          await drive.files.update({
            fileId: f.id,
            requestBody: {
              name: normalizedName,
              properties: {
                netheriteType: "note",
                netheriteManaged: "true",
              },
            },
          });
          displayName = normalizedName;
        } catch {
          displayName = normalizedName;
        }
      } else if (!f.properties?.netheriteManaged) {
        try {
          await drive.files.update({
            fileId: f.id,
            requestBody: {
              properties: {
                netheriteType: isDrawing ? "drawing" : isImage ? "image" : "note",
                netheriteManaged: "true",
              },
            },
          });
        } catch {
          // Non-fatal
        }
      }

      const effectiveMimeType = isImage
        ? f.mimeType ?? "image/png"
        : isDrawing
        ? "application/vnd.excalidraw+json"
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
          type: isImage ? "image" : isDrawing ? "drawing" : "note",
          parentId: f.parents?.[0] ?? rootFolderId,
          createdAt: f.createdTime ?? f.modifiedTime ?? new Date().toISOString(),
          updatedAt: f.modifiedTime ?? new Date().toISOString(),
        };
        metadataNeedsSave = true;
      }
    }

    if (metadataNeedsSave) {
      try {
        await saveWorkspaceMetadata(session, { files: updatedFilesMeta });
      } catch (saveMetaErr) {
        console.warn("Failed to persist auto-generated workspace metadata:", saveMetaErr);
      }
    }

    return itemsToReturn;
  });
}

export async function createSubfolder(session: any, name: string, parentId?: string) {
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
      const meta = await drive.files.get({ fileId, fields: "id, mimeType" });
      if (
        meta.data.mimeType === "application/vnd.google-apps.folder" ||
        meta.data.mimeType?.startsWith("image/")
      ) {
        return "";
      }
      if (meta.data.mimeType === "application/vnd.google-apps.document") {
        const exportRes = await drive.files.export(
          { fileId, mimeType: "text/plain" },
          { responseType: "text" }
        );
        return (exportRes.data as string) ?? "";
      }
      const res = await drive.files.get(
        { fileId, alt: "media" },
        { responseType: "text" }
      );
      if (typeof res.data === "object" && res.data !== null) {
        return JSON.stringify(res.data);
      }
      return (res.data as string) ?? "";
    } catch (error) {
      console.error(`Error in getNoteContent for ${fileId}:`, error);
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
    const mimeType = isDrawing ? "application/vnd.excalidraw+json" : "text/markdown";

    await drive.files.update({
      fileId,
      media: {
        mimeType,
        body: content,
      },
    });
  });
}

export async function createNote(
  session: any,
  name: string,
  content: string = "",
  parentId?: string,
  type: "note" | "drawing" = "note"
) {
  const drive = await getDriveClient(session);
  const folderId = parentId || (await ensureNetheriteFolder(session));

  const isDrawing = type === "drawing" || name.endsWith(".excalidraw");
  const cleanName = isDrawing
    ? name.replace(/\.excalidraw$/i, "")
    : name.replace(/\.md$/i, "");
  const finalName = isDrawing ? `${cleanName}.excalidraw` : `${cleanName}.md`;
  const mimeType = isDrawing ? "application/vnd.excalidraw+json" : "text/markdown";

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

  let finalName = newName;
  if (isFolder) {
    finalName = newName;
  } else if (isDrawing) {
    const cleanName = newName.replace(/\.excalidraw$/i, "");
    finalName = `${cleanName}.excalidraw`;
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
    const meta = await drive.files.get({ fileId, fields: "id, name, mimeType" });
    const res = await drive.files.get(
      { fileId, alt: "media" },
      { responseType: "arraybuffer" }
    );
    const buffer = Buffer.from(res.data as ArrayBuffer);
    const mimeType = meta.data.mimeType ?? "image/png";
    const base64 = buffer.toString("base64");
    return {
      id: fileId,
      name: meta.data.name ?? "image",
      mimeType,
      dataUrl: `data:${mimeType};base64,${base64}`,
    };
  });
}
