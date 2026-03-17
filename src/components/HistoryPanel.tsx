import { useEffect, useState } from 'react'
import type { HistoryEntry } from '../lib/history'
import { loadHistory } from '../lib/history'

type HistoryPanelProps = {
  pageKey: string
}

function formatTimestamp(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString()
}

export function HistoryPanel({ pageKey }: HistoryPanelProps) {
  const [entries, setEntries] = useState<HistoryEntry[]>(() => loadHistory(pageKey))
  const [visibleCount, setVisibleCount] = useState(5)
  const visibleEntries = entries.slice(0, visibleCount)
  const hasMore = entries.length > visibleCount

  useEffect(() => {
    setEntries(loadHistory(pageKey))
    setVisibleCount(5)

    function handleStorage(event: StorageEvent) {
      if (!event.key) return
      if (event.key === `spin-examiner:history:${pageKey}`) {
        setEntries(loadHistory(pageKey))
      }
    }

    function handleCustomEvent(event: Event) {
      const customEvent = event as CustomEvent<{ pageKey?: string }>
      if (customEvent.detail?.pageKey === pageKey) {
        setEntries(loadHistory(pageKey))
      }
    }

    window.addEventListener('storage', handleStorage)
    window.addEventListener('spin-examiner:history-changed', handleCustomEvent)
    return () => {
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener('spin-examiner:history-changed', handleCustomEvent)
    }
  }, [pageKey])

  return (
    <section className="rounded-[2rem] border border-spruce/15 bg-surface/92 p-5 shadow-panel backdrop-blur">
      <div className="mb-4">
        <p className="text-xs uppercase tracking-[0.35em] text-spruce">History</p>
        <h3 className="mt-2 font-display text-2xl text-ink">Signed changes</h3>
        <p className="mt-2 text-sm text-ink/70">Recent updates made while edit mode was enabled.</p>
      </div>

      {entries.length ? (
        <ol className="space-y-3">
          {visibleEntries.map((entry: HistoryEntry) => (
            <li key={entry.id} className="rounded-3xl border border-white/35 bg-white/70 px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-ink">{entry.action}</p>
                <p className="text-xs text-ink/60">{formatTimestamp(entry.timestamp)}</p>
              </div>
              <p className="mt-1 text-xs uppercase tracking-[0.18em] text-spruce">{entry.userEmail}</p>
            </li>
          ))}
        </ol>
      ) : (
        <div className="rounded-3xl border border-white/35 bg-white/55 px-4 py-4 text-sm text-ink/70">No edits recorded yet.</div>
      )}

      {hasMore ? (
        <div className="mt-4 flex justify-center">
          <button
            type="button"
            onClick={() => setVisibleCount((count) => Math.min(count + 5, entries.length))}
            className="rounded-full border border-spruce/15 bg-white px-4 py-2 text-sm font-semibold text-ink transition hover:border-spruce/35"
          >
            Show next 5
          </button>
        </div>
      ) : null}
    </section>
  )
}
