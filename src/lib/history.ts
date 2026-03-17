export type HistoryEntry<T = unknown> = {
  id: string
  pageKey: string
  action: string
  timestamp: string
  userEmail: string
  meta?: T
}

function historyStorageKey(pageKey: string) {
  return `spin-examiner:history:${pageKey}`
}

export function loadHistory<T = unknown>(pageKey: string): HistoryEntry<T>[] {
  const raw = window.localStorage.getItem(historyStorageKey(pageKey))
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw) as HistoryEntry<T>[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function appendHistory<T = unknown>(pageKey: string, entry: Omit<HistoryEntry<T>, 'id' | 'timestamp' | 'pageKey'>) {
  const existing = loadHistory<T>(pageKey)
  const record: HistoryEntry<T> = {
    id: globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : String(Date.now()),
    pageKey,
    timestamp: new Date().toISOString(),
    ...entry,
  }
  const next = [record, ...existing].slice(0, 200)
  window.localStorage.setItem(historyStorageKey(pageKey), JSON.stringify(next))

  // Trigger an in-tab refresh for subscribed panels (storage event doesn't fire in same document).
  window.dispatchEvent(new CustomEvent('spin-examiner:history-changed', { detail: { pageKey } }))

  return record
}
