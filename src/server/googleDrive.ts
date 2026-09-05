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

export async function listNotes(session: any) {
  return withRetry(async () => {
    const drive = await getDriveClient(session);

    const res = await drive.files.list({
      q: "trashed=false and (mimeType='text/markdown' or mimeType='application/vnd.google-apps.folder' or mimeType='application/vnd.excalidraw+json' or mimeType='application/json' or name contains '.excalidraw' or name contains '.md')",
      fields: "files(id, name, mimeType, modifiedTime, parents)",
      orderBy: "folder, modifiedTime desc",
      pageSize: 300,
    });

    return (res.data.files ?? []).filter((f) => {
      if (!f.name || f.name.startsWith(".") || f.name.toLowerCase() === "assets") return false;
      if (f.mimeType === "application/vnd.google-apps.folder") return true;
      if (
        f.name.endsWith(".md") ||
        f.name.endsWith(".excalidraw") ||
        f.mimeType === "text/markdown" ||
        f.mimeType === "application/vnd.excalidraw+json"
      ) {
        return true;
      }
      return false;
    });
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
      const res = await drive.files.get(
        { fileId, alt: "media" },
        { responseType: "text" }
      );
      return res.data as string;
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

export interface WorkspaceMetadata {
  version: number;
  folderColors: Record<string, string>;
  [key: string]: any;
}

export async function getWorkspaceMetadata(session: any): Promise<WorkspaceMetadata> {
  return withRetry(async () => {
    const drive = await getDriveClient(session);
    const rootFolderId = await ensureNetheriteFolder(session);

    const res = await drive.files.list({
      q: `'${rootFolderId}' in parents and name='.netherite.json' and trashed=false`,
      fields: "files(id, name)",
      spaces: "drive",
    });

    if (!res.data.files || res.data.files.length === 0 || !res.data.files[0]?.id) {
      return { version: 1, folderColors: {} };
    }

    const fileId = res.data.files[0].id;
    try {
      const fileRes = await drive.files.get(
        { fileId, alt: "media" },
        { responseType: "text" }
      );
      const data = typeof fileRes.data === "string" ? JSON.parse(fileRes.data) : fileRes.data;
      return { version: 1, folderColors: {}, ...data };
    } catch (err) {
      console.warn("Failed to parse .netherite.json:", err);
      return { version: 1, folderColors: {} };
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
    const merged = { ...existing, ...metadata, updatedAt: new Date().toISOString() };
    const jsonString = JSON.stringify(merged, null, 2);

    const res = await drive.files.list({
      q: `'${rootFolderId}' in parents and name='.netherite.json' and trashed=false`,
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
