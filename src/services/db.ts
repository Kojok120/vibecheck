/**
 * Screenshots live in the extension's own IndexedDB, not `storage.local`:
 * blobs blow past the 10MB quota fast, and IndexedDB is reachable from the
 * service worker, the side panel, and the options page alike.
 */

const DB_NAME = 'vibecheck'
const DB_VERSION = 1
const STORE = 'shots'

let cached: Promise<IDBDatabase> | null = null

function openDatabase(): Promise<IDBDatabase> {
  cached ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) {
        request.result.createObjectStore(STORE)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  }).catch((error) => {
    cached = null
    throw error
  })
  return cached
}

function run<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDatabase().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode)
        const request = fn(tx.objectStore(STORE))
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      }),
  )
}

export function putShot(key: string, blob: Blob): Promise<IDBValidKey> {
  return run('readwrite', (store) => store.put(blob, key))
}

export async function getShot(key: string): Promise<Blob | undefined> {
  const value = await run<Blob | undefined>('readonly', (store) => store.get(key))
  return value instanceof Blob ? value : undefined
}

export async function deleteShots(keys: string[]): Promise<void> {
  for (const key of keys) {
    await run('readwrite', (store) => store.delete(key))
  }
}

/** Drop orphaned blobs left behind by deleted items or sessions. */
export async function pruneShots(keep: Set<string>): Promise<number> {
  const keys = await run<IDBValidKey[]>('readonly', (store) => store.getAllKeys())
  const orphans = keys.map(String).filter((key) => !keep.has(key))
  await deleteShots(orphans)
  return orphans.length
}
