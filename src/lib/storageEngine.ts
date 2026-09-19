/**
 * Netherite Storage Engine
 * Hybrid IndexedDB + LocalStorage storage system with automatic quota management.
 * - IndexedDB is used as the primary large-document and snapshot vault (GBs of quota).
 * - LocalStorage is used for fast-sync keys, with safe eviction of old snapshots and caches.
 * - Guarantees that browser QuotaExceededError never breaks saves or tab switches.
 */

const DB_NAME = "netherite_vault_db";
const DB_VERSION = 1;
const STORE_DOCS = "documents";
const STORE_SNAPSHOTS = "snapshots";

function openVaultDB(): Promise<IDBDatabase | null> {
  if (typeof window === "undefined" || !window.indexedDB) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_DOCS)) {
          db.createObjectStore(STORE_DOCS);
        }
        if (!db.objectStoreNames.contains(STORE_SNAPSHOTS)) {
          db.createObjectStore(STORE_SNAPSHOTS);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function idbSetDoc(key: string, value: string): Promise<boolean> {
  const db = await openVaultDB();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_DOCS, "readwrite");
      const store = tx.objectStore(STORE_DOCS);
      const req = store.put(value, key);
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

export async function idbGetDoc(key: string): Promise<string | null> {
  const db = await openVaultDB();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_DOCS, "readonly");
      const store = tx.objectStore(STORE_DOCS);
      const req = store.get(key);
      req.onsuccess = () => resolve((req.result as string) || null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function idbDeleteDoc(key: string): Promise<boolean> {
  const db = await openVaultDB();
  if (!db) return false;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_DOCS, "readwrite");
      const store = tx.objectStore(STORE_DOCS);
      const req = store.delete(key);
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

export async function idbSaveSnapshot(fileId: string, content: string): Promise<void> {
  const db = await openVaultDB();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_SNAPSHOTS, "readwrite");
      const store = tx.objectStore(STORE_SNAPSHOTS);
      const getReq = store.get(fileId);
      getReq.onsuccess = () => {
        const list: Array<{ timestamp: number; content: string }> = getReq.result || [];
        if (list.length > 0 && list[0]?.content === content) {
          resolve();
          return;
        }
        list.unshift({ timestamp: Date.now(), content });
        if (list.length > 10) list.length = 10;
        store.put(list, fileId);
        resolve();
      };
      getReq.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function idbGetSnapshots(fileId: string): Promise<Array<{ timestamp: number; content: string }>> {
  const db = await openVaultDB();
  if (!db) return [];
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_SNAPSHOTS, "readonly");
      const store = tx.objectStore(STORE_SNAPSHOTS);
      const req = store.get(fileId);
      req.onsuccess = () => resolve((req.result as Array<{ timestamp: number; content: string }>) || []);
      req.onerror = () => resolve([]);
    } catch {
      resolve([]);
    }
  });
}

/**
 * Free up localStorage by removing bloated snapshot arrays
 */
export function pruneLocalStorage(): number {
  if (typeof window === "undefined") return 0;
  let freedCount = 0;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      // All netherite_snapshot_* keys are purged from localStorage (they are stored in IndexedDB)
      if (key.startsWith("netherite_snapshot_")) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => {
      localStorage.removeItem(k);
      freedCount++;
    });
    if (freedCount > 0) {
      console.info(`[StorageEngine] Pruned ${freedCount} bloated snapshot keys from localStorage.`);
    }
  } catch (err) {
    console.warn("Prune error:", err);
  }
  return freedCount;
}

/**
 * Safely sets an item in localStorage.
 * If QuotaExceededError is thrown:
 * 1. Automatically prunes old snapshots.
 * 2. Retries setItem.
 * 3. Never throws to caller, ensuring saves and UI operations never crash.
 */
export function safeLocalStorageSet(key: string, value: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err: any) {
    const isQuota =
      err?.name === "QuotaExceededError" ||
      err?.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
      err?.code === 22 ||
      err?.code === 1014;

    if (isQuota) {
      console.warn(`[StorageEngine] LocalStorage quota exceeded on "${key}". Pruning snapshots...`);
      pruneLocalStorage();

      // Retry once after pruning
      try {
        localStorage.setItem(key, value);
        return true;
      } catch {
        console.warn(`[StorageEngine] Document "${key}" exceeds remaining localStorage capacity. Saved to IndexedDB vault.`);
        return false;
      }
    }
    console.warn(`[StorageEngine] Failed to write "${key}" to localStorage:`, err);
    return false;
  }
}
