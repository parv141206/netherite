/**
 * Netherite IndexedDB PDF Cache
 * Stores downloaded PDF ArrayBuffers locally for instant (<100ms) reloads,
 * eliminating repeated 60MB+ network downloads and Range-request flakiness.
 */

const DB_NAME = "netherite_pdf_cache_db";
const DB_VERSION = 1;
const STORE_NAME = "pdf_blobs";

interface CachedPdfEntry {
  fileId: string;
  data: ArrayBuffer;
  size: number;
  cachedAt: number;
}

function openPdfCacheDB(): Promise<IDBDatabase | null> {
  if (typeof window === "undefined" || !window.indexedDB) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION);

      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "fileId" });
        }
      };

      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/**
 * Retrieve a cached PDF ArrayBuffer from IndexedDB.
 */
export async function getCachedPdf(fileId: string): Promise<ArrayBuffer | null> {
  if (!fileId) return null;
  const db = await openPdfCacheDB();
  if (!db) return null;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(fileId);

      req.onsuccess = () => {
        const entry = req.result as CachedPdfEntry | undefined;
        if (entry && entry.data instanceof ArrayBuffer && entry.data.byteLength > 0) {
          resolve(entry.data);
        } else {
          resolve(null);
        }
      };

      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/**
 * Save a PDF ArrayBuffer to IndexedDB.
 */
export async function setCachedPdf(fileId: string, data: ArrayBuffer): Promise<boolean> {
  if (!fileId || !data || data.byteLength === 0) return false;
  const db = await openPdfCacheDB();
  if (!db) return false;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const entry: CachedPdfEntry = {
        fileId,
        data,
        size: data.byteLength,
        cachedAt: Date.now(),
      };
      const req = store.put(entry);

      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

/**
 * Delete a cached PDF from IndexedDB.
 */
export async function deleteCachedPdf(fileId: string): Promise<boolean> {
  if (!fileId) return false;
  const db = await openPdfCacheDB();
  if (!db) return false;

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(fileId);

      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}
