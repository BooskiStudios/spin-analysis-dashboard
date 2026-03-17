import {
  loadBaseGameBreakdown,
  saveBaseGameBreakdown,
  saveBaseGameBreakdownToServer,
  type BaseGameBreakdown,
} from './baseGameBreakdown'
import {
  loadBonusRoundsBreakdown,
  saveBonusRoundsBreakdown,
  saveBonusRoundsBreakdownToServer,
  type BonusRoundsBreakdown,
} from './bonusRoundsBreakdown'
import { loadGameNotes, saveGameNotes, type GameNoteEntry } from './gameNotes'
import { loadGalleryAsync, saveGallery, type GalleryItem } from './gallery'

export type EditDraftState = {
  base: BaseGameBreakdown
  bonus: BonusRoundsBreakdown
  notes: GameNoteEntry[]
  gallery: GalleryItem[]
}

type DraftEntry = {
  gameId: number
  initial: EditDraftState
  draft: EditDraftState
}

const drafts = new Map<number, DraftEntry>()
const listeners = new Set<() => void>()

function notify() {
  for (const listener of listeners) {
    listener()
  }
}

export function subscribeDrafts(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function ensureDraft(gameId: number) {
  if (drafts.has(gameId)) {
    return
  }

  const pageKey = `game:${gameId}`

  // Notes are small, so localStorage read is fine.
  // Gallery is async/IndexedDB-backed; initialize with empty and hydrate shortly.
  const initial: EditDraftState = {
    base: loadBaseGameBreakdown(gameId),
    bonus: loadBonusRoundsBreakdown(gameId),
    notes: loadGameNotes(pageKey),
    gallery: [],
  }

  drafts.set(gameId, {
    gameId,
    initial,
    draft: structuredClone(initial),
  })
  notify()

  // Hydrate gallery async.
  loadGalleryAsync(pageKey)
    .then((items) => {
      const entry = drafts.get(gameId)
      if (!entry) return

      entry.initial = { ...entry.initial, gallery: items }
      entry.draft = { ...entry.draft, gallery: items }
      drafts.set(gameId, entry)
      notify()
    })
    .catch(() => {
      // ignore
    })
}

export function clearDraft(gameId: number) {
  drafts.delete(gameId)
  notify()
}

export function getDraft(gameId: number): EditDraftState | null {
  return drafts.get(gameId)?.draft ?? null
}

export function getInitial(gameId: number): EditDraftState | null {
  return drafts.get(gameId)?.initial ?? null
}

export function updateDraft(gameId: number, patch: Partial<EditDraftState>) {
  const entry = drafts.get(gameId)
  if (!entry) return

  entry.draft = {
    ...entry.draft,
    ...patch,
  }

  drafts.set(gameId, entry)
  notify()
}

export function resetDraft(gameId: number) {
  const entry = drafts.get(gameId)
  if (!entry) return

  entry.draft = structuredClone(entry.initial)
  drafts.set(gameId, entry)
  notify()
}

export function isDirtyDraft(gameId: number) {
  const entry = drafts.get(gameId)
  if (!entry) return false
  return JSON.stringify(entry.draft) !== JSON.stringify(entry.initial)
}

export function commitDraft(gameId: number, userEmail?: string | null) {
  const entry = drafts.get(gameId)
  if (!entry) return

  const pageKey = `game:${gameId}`

  saveBaseGameBreakdown(gameId, entry.draft.base)
  saveBonusRoundsBreakdown(gameId, entry.draft.bonus)
  saveGameNotes(pageKey, entry.draft.notes)
  void saveGallery(pageKey, entry.draft.gallery)

  // Best-effort remote persistence for shared editing.
  void saveBaseGameBreakdownToServer(gameId, entry.draft.base, userEmail).catch(() => {
    // ignore
  })
  void saveBonusRoundsBreakdownToServer(gameId, entry.draft.bonus, userEmail).catch(() => {
    // ignore
  })

  entry.initial = structuredClone(entry.draft)
  drafts.set(gameId, entry)
  notify()
}
