const DB_NAME = 'nurseryflow';
const STORE = 'blobs';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(STORE);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  return dbPromise;
}

async function run<T>(
  mode: IDBTransactionMode,
  work: (store: IDBObjectStore) => IDBRequest<T> | void,
): Promise<T | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const request = work(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(request ? request.result : undefined);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export const blobs = {
  async put(key: string, blob: Blob): Promise<void> {
    await run('readwrite', (store) => store.put(blob, key));
  },
  get(key: string): Promise<Blob | undefined> {
    return run<Blob>('readonly', (store) => store.get(key));
  },
  async remove(list: string[]): Promise<void> {
    await run('readwrite', (store) => {
      list.forEach((key) => store.delete(key));
    });
  },
  async clear(): Promise<void> {
    await run('readwrite', (store) => {
      store.clear();
    });
  },
};

export const keys = {
  avatar: (nurseryId: string) => `avatar:${nurseryId}`,
  frame: (nurseryId: string) => `frame:${nurseryId}`,
  original: (photoId: string) => `orig:${photoId}`,
  thumb: (photoId: string) => `thumb:${photoId}`,
  out: (processedId: string) => `out:${processedId}`,
};
