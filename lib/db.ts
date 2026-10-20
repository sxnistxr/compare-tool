// Keeps images in IndexedDB so a refresh doesn't empty the sheet.
import type { SheetImage } from "./sheet"

type Stored = Omit<SheetImage, "url"> & { order: number }

const DB = "compare"
const STORE = "images"

function open() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: "id" })
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T> | void) {
  const db = await open()
  return new Promise<T | undefined>((resolve, reject) => {
    const t = db.transaction(STORE, mode)
    const req = fn(t.objectStore(STORE))
    t.oncomplete = () => resolve(req ? req.result : undefined)
    t.onerror = () => reject(t.error)
  })
}

export async function loadImages(): Promise<SheetImage[]> {
  try {
    const rows = ((await tx<Stored[]>("readonly", (s) => s.getAll())) ?? []).sort((a, b) => a.order - b.order)
    return rows.map((r) => ({ ...r, url: URL.createObjectURL(r.blob) }))
  } catch {
    return []
  }
}

export async function saveImages(images: SheetImage[]) {
  try {
    await tx("readwrite", (s) => {
      s.clear()
      images.forEach((img, order) => s.put({ ...img, url: undefined, order }))
    })
  } catch {
    // Storage full or blocked: the sheet still works, it just won't survive a reload.
  }
}
