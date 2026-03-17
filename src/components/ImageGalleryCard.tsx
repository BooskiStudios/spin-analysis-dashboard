import { useEffect, useId, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { appendHistory } from '../lib/history'
import {
  createGalleryItem,
  fileToDataUrl,
  loadGallery,
  loadGalleryAsync,
  updateGalleryItem,
  type GalleryItem,
} from '../lib/gallery'

type ImageGalleryCardProps = {
  pageKey: string
  userEmail: string | null
  isEditMode: boolean
  value?: GalleryItem[] | null
  onChange?: (next: GalleryItem[]) => void
}

const acceptedImageTypes = 'image/*'

export function ImageGalleryCard({ pageKey, userEmail, isEditMode, value, onChange }: ImageGalleryCardProps) {
  const inputId = useId()
  const [items, setItems] = useState<GalleryItem[]>(() => value ?? (typeof window === 'undefined' ? [] : loadGallery(pageKey)))
  const [isAdding, setIsAdding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeItemId, setActiveItemId] = useState<string | null>(null)

  useEffect(() => {
    let isCancelled = false
    if (value) {
      setItems(value)
      return
    }

    loadGalleryAsync(pageKey)
      .then((result) => {
        if (!isCancelled) {
          setItems(result)
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setItems(loadGallery(pageKey))
        }
      })

    return () => {
      isCancelled = true
    }
  }, [pageKey, value])

  const canAdd = isEditMode && Boolean(userEmail)
  const subtitle = useMemo(() => {
    if (!isEditMode) return 'Enable edit mode to add images.'
    if (!userEmail) return 'Sign in to add images.'
    return 'Upload reference screenshots, then add notes afterwards.'
  }, [isEditMode, userEmail])

  const activeItem = activeItemId ? items.find((item) => item.id === activeItemId) : undefined

  useEffect(() => {
    if (!activeItemId) {
      return
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setActiveItemId(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeItemId])

  async function handleFileSelection(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    try {
      setError(null)
      setIsAdding(true)
      const imageDataUrl = await fileToDataUrl(file)
    const newItem = createGalleryItem({ imageDataUrl, note: '', createdBy: userEmail ?? 'unknown' })
      const nextItems = [newItem, ...items].slice(0, 50)

      setItems(nextItems)
      onChange?.(nextItems)

      appendHistory(pageKey, {
        action: 'Added gallery image',
        userEmail: userEmail ?? 'unknown',
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add image')
    } finally {
      setIsAdding(false)
      event.target.value = ''
    }
  }

  function handleRemove(id: string) {
    if (!canAdd) return

    const nextItems = items.filter((item) => item.id !== id)
    setItems(nextItems)
  onChange?.(nextItems)

    appendHistory(pageKey, {
      action: 'Removed gallery image',
      userEmail: userEmail ?? 'unknown',
    })
  }

  function handleUpdateNote(id: string, note: string) {
    if (!canAdd) return
    const nextItems = updateGalleryItem(items, id, { note })
    setItems(nextItems)
  onChange?.(nextItems)

    appendHistory(pageKey, {
      action: 'Updated gallery note',
      userEmail: userEmail ?? 'unknown',
    })
  }

  return (
    <section className="rounded-[2rem] border border-spruce/15 bg-surface/92 p-5 text-ink shadow-panel backdrop-blur">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-spruce">Gallery</p>
            <span className="rounded-full border border-spruce/15 bg-white/70 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-ink/70">
              {items.length} item{items.length === 1 ? '' : 's'}
            </span>
          </div>
          <p className="mt-2 text-sm text-ink/70">{subtitle}</p>
          {error ? <p className="mt-2 text-sm text-[#8d2034]">{error}</p> : null}
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <input
            id={inputId}
            type="file"
            accept={acceptedImageTypes}
            disabled={!canAdd || isAdding}
            onChange={handleFileSelection}
            className="sr-only"
          />

          <label
            htmlFor={inputId}
            className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold transition ${
              !canAdd || isAdding
                ? 'cursor-not-allowed bg-night/10 text-ink/45'
                : 'cursor-pointer bg-night text-mist hover:bg-spruce'
            }`}
          >
            {isAdding ? 'Adding...' : canAdd ? 'Add image' : 'Locked'}
          </label>
        </div>
      </div>

      {items.length ? (
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <div key={item.id} className="overflow-hidden rounded-3xl border border-spruce/12 bg-white/70">
              <button type="button" onClick={() => setActiveItemId(item.id)} className="block w-full">
                <img src={item.imageDataUrl} alt={'Gallery image'} className="h-44 w-full object-cover" />
              </button>

              <div className="space-y-3 px-4 py-3">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-[0.18em] text-spruce">Note</label>
                  <textarea
                    value={item.note}
                    onChange={(event) => handleUpdateNote(item.id, event.target.value)}
                    disabled={!canAdd}
                    placeholder={canAdd ? 'Add a note...' : '—'}
                    className="mt-2 min-h-20 w-full resize-none rounded-2xl border border-spruce/15 bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-spruce/40 disabled:bg-white/50"
                  />
                </div>

                {canAdd ? (
                  <button
                    type="button"
                    onClick={() => handleRemove(item.id)}
                    className="rounded-full border border-spruce/15 bg-white px-3 py-1 text-xs font-semibold text-ink transition hover:border-spruce/35"
                  >
                    Remove
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-5 rounded-3xl border border-spruce/12 bg-white/60 px-4 py-4 text-sm text-ink/70">
          No images yet.
        </div>
      )}

      {activeItem
        ? createPortal(
            <div
              className="fixed inset-0 z-[2147483647] flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm"
              onClick={() => setActiveItemId(null)}
            >
              <div
                className="relative z-[2147483647] w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(160deg,rgba(253,253,253,0.98),rgba(185,255,156,0.14))] shadow-panel"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="flex items-center justify-between gap-3 bg-white px-5 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-spruce">Gallery image</p>
                  <button
                    type="button"
                    onClick={() => setActiveItemId(null)}
                    className="rounded-full border border-spruce/15 bg-white px-3 py-1 text-sm text-ink transition hover:bg-white/95"
                  >
                    Close
                  </button>
                </div>
                <div className="bg-night">
                  <img src={activeItem.imageDataUrl} alt={'Gallery image'} className="max-h-[70vh] w-full object-contain" />
                </div>
                <div className="bg-white px-5 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-spruce">Note</p>
                  <p className="mt-2 text-sm text-ink/80 whitespace-pre-wrap">{activeItem.note?.trim() ? activeItem.note : '—'}</p>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </section>
  )
}
