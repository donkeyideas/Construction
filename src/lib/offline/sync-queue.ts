/**
 * Offline Sync Queue using IndexedDB
 *
 * Stores form submissions when offline, syncs when back online.
 */

const DB_NAME = "buildwrk_offline";
const DB_VERSION = 1;
const STORE_NAME = "sync_queue";

interface SyncEntry {
  id?: number;
  url: string;
  method: string;
  body: string;
  created_at: string;
  retries: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
      }
    };
  });
}

/**
 * Add a request to the offline queue
 */
export async function enqueue(url: string, method: string, body: unknown): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);

  const entry: SyncEntry = {
    url,
    method,
    body: JSON.stringify(body),
    created_at: new Date().toISOString(),
    retries: 0,
  };

  store.add(entry);
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Get all queued entries
 */
export async function getQueue(): Promise<SyncEntry[]> {
  const db = await openDb();
  const tx = db.transaction(STORE_NAME, "readonly");
  const store = tx.objectStore(STORE_NAME);

  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Remove an entry from the queue
 */
export async function dequeue(id: number): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  store.delete(id);
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Process the entire queue - attempt to send all pending requests
 */
export async function processQueue(): Promise<{ synced: number; failed: number }> {
  const entries = await getQueue();
  let synced = 0;
  let failed = 0;

  for (const entry of entries) {
    try {
      const res = await fetch(entry.url, {
        method: entry.method,
        headers: { "Content-Type": "application/json" },
        body: entry.body,
      });

      if (res.ok) {
        await dequeue(entry.id!);
        synced++;
      } else {
        failed++;
      }
    } catch {
      failed++;
    }
  }

  return { synced, failed };
}

/**
 * Smart fetch that queues on failure (offline mode)
 */
export async function offlineFetch(
  url: string,
  init?: RequestInit
): Promise<Response | null> {
  try {
    const res = await fetch(url, init);
    return res;
  } catch {
    // Network error - queue the request
    if (init?.method && init.method !== "GET" && init?.body) {
      await enqueue(url, init.method, JSON.parse(init.body as string));
    }
    return null;
  }
}
