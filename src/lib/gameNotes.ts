function notesStorageKey(pageKey: string) {
  return `spin-examiner:notes:${pageKey}`
}

export type GameNoteEntry = {
  id: string
  message: string
  createdAt: string
  authorEmail: string
}

export function loadGameNotes(pageKey: string) {
  const raw = window.localStorage.getItem(notesStorageKey(pageKey))
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw) as GameNoteEntry[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveGameNotes(pageKey: string, notes: GameNoteEntry[]) {
  window.localStorage.setItem(notesStorageKey(pageKey), JSON.stringify(notes))
}

export function appendGameNote(notes: GameNoteEntry[], note: Omit<GameNoteEntry, 'id' | 'createdAt'>): GameNoteEntry[] {
  const record: GameNoteEntry = {
    id: globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : String(Date.now()),
    createdAt: new Date().toISOString(),
    ...note,
  }

  return [...notes, record]
}

export function updateGameNote(notes: GameNoteEntry[], noteId: string, patch: Partial<Pick<GameNoteEntry, 'message'>>): GameNoteEntry[] {
  return notes.map((note) => (note.id === noteId ? { ...note, ...patch } : note))
}
