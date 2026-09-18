/**
 * Local Device Storage Sync Engine
 * Uses the standard File System Access API (window.showDirectoryPicker) to mirror
 * Netherite workspace files directly to the user's local disk drive.
 * Handles are stored across sessions in IndexedDB.
 */

export interface SyncProgressCallback {
  (current: number, total: number, fileName: string): void;
}

const DB_NAME = "netherite_device_sync_db";
const STORE_NAME = "handles";
const KEY_NAME = "root_dir";

export const LOCAL_DEVICE_SYNC_ENABLED_KEY = "netherite_device_sync_enabled";
export const LOCAL_DEVICE_FOLDER_NAME_KEY = "netherite_device_sync_folder_name";
export const CLOUD_AUTOSAVE_CADENCE_KEY = "netherite_cloud_autosave_cadence";

export type CloudCadence = "10s" | "30s" | "1m" | "manual";

/**
 * Returns true if the browser supports the File System Access API (Chromium-based browsers, desktop, etc.)
 */
export const isFileSystemAccessSupported = (): boolean => {
  return typeof window !== "undefined" && "showDirectoryPicker" in window;
};

/**
 * Internal IndexedDB connection helper
 */
function openSyncDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      return reject(new Error("IndexedDB is not available in this environment."));
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Persist the selected FileSystemDirectoryHandle into IndexedDB
 */
export async function storeDeviceDirectoryHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  const db = await openSyncDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(handle, KEY_NAME);
    req.onsuccess = () => {
      if (typeof window !== "undefined") {
        localStorage.setItem(LOCAL_DEVICE_SYNC_ENABLED_KEY, "true");
        localStorage.setItem(LOCAL_DEVICE_FOLDER_NAME_KEY, handle.name);
        window.dispatchEvent(new CustomEvent("netherite_device_sync_changed"));
      }
      resolve();
    };
    req.onerror = () => reject(req.error);
  });
}

/**
 * Retrieve the persisted FileSystemDirectoryHandle from IndexedDB
 */
export async function getStoredDeviceDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await openSyncDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(KEY_NAME);
      req.onsuccess = () => resolve((req.result as FileSystemDirectoryHandle) || null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("Failed to retrieve directory handle from IndexedDB:", err);
    return null;
  }
}

/**
 * Remove the stored directory handle from IndexedDB and disable sync
 */
export async function removeStoredDeviceDirectoryHandle(): Promise<void> {
  try {
    const db = await openSyncDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(KEY_NAME);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("Failed to delete directory handle:", err);
  } finally {
    if (typeof window !== "undefined") {
      localStorage.removeItem(LOCAL_DEVICE_SYNC_ENABLED_KEY);
      localStorage.removeItem(LOCAL_DEVICE_FOLDER_NAME_KEY);
      window.dispatchEvent(new CustomEvent("netherite_device_sync_changed"));
    }
  }
}

/**
 * Check or request readwrite permission on a directory handle
 */
export async function verifyHandlePermission(
  handle: FileSystemDirectoryHandle,
  readWrite = true
): Promise<boolean> {
  try {
    const opts = { mode: readWrite ? "readwrite" : "read" } as const;
    const query = await (handle as any).queryPermission(opts);
    if (query === "granted") return true;

    const request = await (handle as any).requestPermission(opts);
    return request === "granted";
  } catch (err) {
    console.warn("Permission query/request error:", err);
    return false;
  }
}

/**
 * Compute the full relative path of a file in the workspace
 */
export function computeRelativePath(file: any, filesMap: Map<string, any>): string {
  const parts: string[] = [file.name];
  let currentParentId = file.parents?.[0];
  let depth = 0;
  while (currentParentId && depth < 10) {
    const parent = filesMap.get(currentParentId);
    if (!parent || parent.mimeType !== "application/vnd.google-apps.folder") break;
    parts.unshift(parent.name);
    currentParentId = parent.parents?.[0];
    depth++;
  }
  return parts.join("/");
}

/**
 * Write a file directly to the local device folder handle, creating parent directories as needed
 */
export async function writeDocumentToDevice(
  dirHandle: FileSystemDirectoryHandle,
  relativePath: string,
  content: string
): Promise<boolean> {
  try {
    const segments = relativePath.split("/").filter(Boolean);
    if (segments.length === 0) return false;

    let currentDir: any = dirHandle;
    for (let i = 0; i < segments.length - 1; i++) {
      const folderName = segments[i]!;
      currentDir = await currentDir.getDirectoryHandle(folderName, { create: true });
    }

    const fileName = segments[segments.length - 1]!;
    const fileHandle = await currentDir.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(content);
    await writable.close();
    return true;
  } catch (err) {
    console.error(`Failed to write "${relativePath}" to local device:`, err);
    return false;
  }
}

/**
 * Perform a full sync of all documents in the workspace directly into the local device folder
 */
export async function performFullWorkspaceSyncToDevice(
  dirHandle: FileSystemDirectoryHandle,
  files: Array<{ id: string; name: string; parents?: string[] | null; mimeType?: string }>,
  fetchContent: (fileId: string) => Promise<string>,
  onProgress?: SyncProgressCallback
): Promise<{ successCount: number; errorCount: number }> {
  const filesMap = new Map<string, any>();
  files.forEach((f) => filesMap.set(f.id, f));

  const nonFolders = files.filter(
    (f) => f.mimeType !== "application/vnd.google-apps.folder"
  );

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < nonFolders.length; i++) {
    const file = nonFolders[i]!;
    const relativePath = computeRelativePath(file, filesMap);
    if (onProgress) {
      onProgress(i + 1, nonFolders.length, file.name);
    }

    try {
      const content = await fetchContent(file.id);
      const ok = await writeDocumentToDevice(dirHandle, relativePath, content ?? "");
      if (ok) {
        successCount++;
      } else {
        errorCount++;
      }
    } catch (err) {
      console.warn(`Sync failed for file ${file.name}:`, err);
      errorCount++;
    }
  }

  return { successCount, errorCount };
}

/**
 * Synchronize a single note/drawing to the local device folder if device sync is active
 */
export async function syncSingleNoteToDevice(
  fileId: string,
  content: string,
  allFiles: Array<{ id: string; name: string; parents?: string[] | null; mimeType?: string }>
): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const isEnabled = localStorage.getItem(LOCAL_DEVICE_SYNC_ENABLED_KEY) === "true";
  if (!isEnabled) return false;

  const dirHandle = await getStoredDeviceDirectoryHandle();
  if (!dirHandle) return false;

  const hasPerm = await verifyHandlePermission(dirHandle, true);
  if (!hasPerm) return false;

  const filesMap = new Map<string, any>();
  allFiles.forEach((f) => filesMap.set(f.id, f));
  const file = filesMap.get(fileId);
  if (!file) return false;

  const relativePath = computeRelativePath(file, filesMap);
  return await writeDocumentToDevice(dirHandle, relativePath, content);
}

