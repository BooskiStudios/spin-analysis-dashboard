export type GalleryItem = {
  id: string
  imageDataUrl: string
  note: string
  createdAt: string
}

function galleryStorageKey(pageKey: string) {
  return `spin-examiner:gallery:${pageKey}`
}

const dbName = 'spin-examiner'
const dbVersion = 1
const storeName = 'gallery'

type GalleryRecord = {
  pageKey: string
  items: GalleryItem[]
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, dbVersion)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName, { keyPath: 'pageKey' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB'))
  })
}

async function idbGet(pageKey: string): Promise<GalleryRecord | null> {
  const db = await openDb()
  return await new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly')
    const store = tx.objectStore(storeName)
    const req = store.get(pageKey)
    req.onsuccess = () => resolve((req.result as GalleryRecord | undefined) ?? null)
    req.onerror = () => reject(req.error ?? new Error('Failed to read gallery'))
  })
}

async function idbPut(record: GalleryRecord): Promise<void> {
  const db = await openDb()
  return await new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    const req = store.put(record)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error ?? new Error('Failed to write gallery'))
  })
}

async function idbDelete(pageKey: string): Promise<void> {
  const db = await openDb()
  return await new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    const req = store.delete(pageKey)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error ?? new Error('Failed to delete gallery'))
  })
}

export function loadGallery(pageKey: string): GalleryItem[] {
  // Backwards-compatible synchronous fallback (may be empty if we have migrated to IndexedDB).
  const raw = window.localStorage.getItem(galleryStorageKey(pageKey))
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as GalleryItem[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export async function loadGalleryAsync(pageKey: string): Promise<GalleryItem[]> {
  try {
    const record = await idbGet(pageKey)
    if (record?.items) {
      return record.items
    }
  } catch {
    // Ignore and fallback.
  }

  return loadGallery(pageKey)
}

export async function saveGallery(pageKey: string, items: GalleryItem[]) {
  // Prefer IndexedDB for images to avoid localStorage quota.
  try {
    await idbPut({ pageKey, items })
    // Keep a tiny marker in localStorage so older code paths don't break.
    window.localStorage.setItem(galleryStorageKey(pageKey), JSON.stringify([]))
    return
  } catch {
    // Fallback (may still fail with quota if images are large)
    window.localStorage.setItem(galleryStorageKey(pageKey), JSON.stringify(items))
  }
}

export async function removeGallery(pageKey: string) {
  try {
    await idbDelete(pageKey)
  } catch {
    // Ignore and still clear the localStorage fallback.
  }

  window.localStorage.removeItem(galleryStorageKey(pageKey))
}

export async function fileToDataUrl(file: File) {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Failed to read image'))
    reader.onload = () => resolve(String(reader.result))
    reader.readAsDataURL(file)
  })
}

export function createGalleryItem(values: { imageDataUrl: string; note: string; createdBy: string }): GalleryItem {
  return {
    id: globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : String(Date.now()),
    imageDataUrl: values.imageDataUrl,
    note: values.note,
    createdAt: new Date().toISOString(),
  }
}

export function updateGalleryItem(items: GalleryItem[], id: string, patch: Partial<Pick<GalleryItem, 'note'>>): GalleryItem[] {
  return items.map((item) => (item.id === id ? { ...item, ...patch } : item))
}
