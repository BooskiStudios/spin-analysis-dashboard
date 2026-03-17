import { useEffect, useMemo, useState } from 'react'
import { appendHistory } from '../lib/history'
import { appendGameNote, loadGameNotes, updateGameNote, type GameNoteEntry } from '../lib/gameNotes'

type GameNotesCardProps = {
  pageKey: string
  userEmail: string | null
  isEditMode: boolean
  title?: string
  value?: GameNoteEntry[] | null
  onChange?: (next: GameNoteEntry[]) => void
}

export function GameNotesCard({ pageKey, userEmail, isEditMode, title = 'Notes', value, onChange }: GameNotesCardProps) {
  const [notes, setNotes] = useState<GameNoteEntry[]>(() => value ?? [])
  const [draft, setDraft] = useState('')
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState('')

  useEffect(() => {
    setNotes(value ?? loadGameNotes(pageKey))
    setDraft('')
    setEditingNoteId(null)
    setEditDraft('')
  }, [pageKey, value])

  const canEdit = isEditMode && Boolean(userEmail)
  const helper = useMemo(() => {
    if (!isEditMode) return 'Enable edit mode to update notes.'
    if (!userEmail) return 'Sign in to update notes.'
    return 'Capture observations about mechanics, math, and features.'
  }, [isEditMode, userEmail])

  function handleSubmit() {
    if (!canEdit) return
    const message = draft.trim()
    if (!message) return

    const createdBy = userEmail ?? 'unknown'
    const next = appendGameNote(notes, { authorEmail: createdBy, message })
    setNotes(next)
  onChange?.(next)
    setDraft('')

    appendHistory(pageKey, {
      action: 'Added note',
      userEmail: createdBy,
      meta: { message },
    })
  }

  function beginEdit(noteId: string, message: string) {
    if (!canEdit) return
    setEditingNoteId(noteId)
    setEditDraft(message)
  }

  function cancelEdit() {
    setEditingNoteId(null)
    setEditDraft('')
  }

  function submitEdit() {
    if (!canEdit || !editingNoteId) return
    const message = editDraft.trim()
    if (!message) return

    const next = updateGameNote(notes, editingNoteId, { message })
    setNotes(next)
  onChange?.(next)

    appendHistory(pageKey, {
      action: 'Edited note',
      userEmail: userEmail ?? 'unknown',
    })

    cancelEdit()
  }

  return (
    <section className="rounded-[2rem] border border-spruce/15 bg-surface/92 p-5 shadow-panel backdrop-blur xl:sticky xl:top-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-spruce">Game notes</p>
          <h2 className="mt-2 font-display text-2xl text-ink">{title}</h2>
          <p className="mt-2 text-sm text-ink/70">{helper}</p>
        </div>
      </div>

      {notes.length ? (
        <div className="space-y-3">
          {notes
            .slice()
            .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
            .map((note) => {
              const isMine = Boolean(userEmail) && note.authorEmail === userEmail
              const isEditing = editingNoteId === note.id

              return (
                <div key={note.id} className="rounded-3xl border border-spruce/12 bg-white/70 px-4 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="text-xs uppercase tracking-[0.18em] text-spruce">{note.authorEmail}</p>
                    {canEdit && isMine ? (
                      <button
                        type="button"
                        onClick={() => beginEdit(note.id, note.message)}
                        className="rounded-full border border-spruce/15 bg-white px-3 py-1 text-xs font-semibold text-ink transition hover:border-spruce/35"
                      >
                        Edit
                      </button>
                    ) : null}
                  </div>

                  {!isEditing ? (
                    <p className="mt-2 whitespace-pre-wrap text-sm text-ink/80">{note.message}</p>
                  ) : (
                    <div className="mt-3 space-y-2">
                      <textarea
                        value={editDraft}
                        onChange={(event) => setEditDraft(event.target.value)}
                        className="min-h-24 w-full resize-none rounded-3xl border border-spruce/15 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-spruce/40"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="rounded-full border border-spruce/15 bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:border-spruce/35"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={submitEdit}
                          className="rounded-full bg-night px-4 py-2 text-sm font-semibold text-mist transition hover:bg-spruce"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
        </div>
      ) : (
        <div className="rounded-3xl border border-spruce/12 bg-white/60 px-4 py-4 text-sm text-ink/70">No notes yet.</div>
      )}

      <div className="mt-4 rounded-3xl border border-spruce/12 bg-white/70 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-spruce">Add a note</p>
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          disabled={!canEdit}
          placeholder={canEdit ? 'Write your note...' : 'Enable edit mode to add notes'}
          className="mt-2 min-h-24 w-full resize-none rounded-3xl border border-spruce/15 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-spruce/40 disabled:bg-white/50"
        />
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canEdit || !draft.trim()}
            className="rounded-full bg-night px-4 py-2 text-sm font-semibold text-mist transition hover:bg-spruce disabled:cursor-not-allowed disabled:bg-night/45 disabled:text-mist/55"
          >
            Submit
          </button>
        </div>
      </div>
    </section>
  )
}
