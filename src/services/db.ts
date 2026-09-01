/**
 * Screenshots live in the extension's own IndexedDB, not `storage.local`:
 * blobs blow past the 10MB quota fast, and IndexedDB is reachable from the
 * service worker, the side panel, and the options page alike.
 */

const DB_NAME = 'vibecheck'
const DB_VERSION = 1
const STORE = 'shots'

/** Blobs are stored with the time they were taken, so the collector can tell
 * a genuinely orphaned screenshot from one whose comment is still being typed. */
interface ShotRecord {
  blob: Blob
  at: number
}

let cached: Promise<IDBDatabase> | null = null

function openDatabase(): Promise<IDBDatabase> {
  cached ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) {
        request.result.createObjectStore(STORE)
      }
    }
    request.onsuccess = () => {
      // The browser can force a connection closed under storage pressure; a
      // cached dead handle would break every capture until the worker restarts.
      request.result.onclose = () => {
        cached = null
      }
      resolve(request.result)
    }
    request.onerror = () => reject(request.error)
  }).catch((error) => {
    cached = null
    throw error
  })
  return cached
}

function read<T>(fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDatabase().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const request = fn(db.transaction(STORE, 'readonly').objectStore(STORE))
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      }),
  )
}

/**
 * Writes resolve on `oncomplete`, not `onsuccess`: a quota failure surfaces
 * when the transaction commits, so resolving earlier would report a save that
 * never happened.
 */
function write(fn: (store: IDBObjectStore) => void): Promise<void> {
  return openDatabase().then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite')
        fn(tx.objectStore(STORE))
        tx.oncomplete = () => resolve()
        tx.onabort = () => reject(tx.error ?? new Error('The screenshot could not be stored'))
        tx.onerror = () => reject(tx.error ?? new Error('The screenshot could not be stored'))
      }),
  )
}

export function putShot(key: string, blob: Blob): Promise<void> {
  const record: ShotRecord = { blob, at: Date.now() }
  return write((store) => store.put(record, key))
}

function blobOf(value: unknown): Blob | undefined {
  if (value instanceof Blob) return value
  const record = value as ShotRecord | undefined
  return record?.blob instanceof Blob ? record.blob : undefined
}

export async function getShot(key: string): Promise<Blob | undefined> {
  return blobOf(await read<unknown>((store) => store.get(key)))
}

export async function deleteShots(keys: string[]): Promise<void> {
  if (keys.length === 0) return
  await write((store) => {
    for (const key of keys) store.delete(key)
  })
}

/**
 * A screenshot is taken before its comment is written, so it sits unreferenced
 * while the reviewer types. Recent blobs are therefore off limits to the
 * collector — otherwise deleting an item mid-compose silently eats the shot
 * that is about to be attached.
 */
const GRACE_MS = 30 * 60 * 1000

/** Drop orphaned blobs left behind by deleted items or sessions. */
export async function pruneShots(keep: Set<string>, now = Date.now()): Promise<number> {
  const keys = (await read<IDBValidKey[]>((store) => store.getAllKeys())).map(String)
  const orphans: string[] = []

  for (const key of keys) {
    if (keep.has(key)) continue
    const record = await read<unknown>((store) => store.get(key))
    const at = record instanceof Blob ? 0 : ((record as ShotRecord | undefined)?.at ?? 0)
    if (now - at > GRACE_MS) orphans.push(key)
  }

  await deleteShots(orphans)
  return orphans.length
}
