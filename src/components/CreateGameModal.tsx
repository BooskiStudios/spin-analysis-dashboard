import { useEffect, useId, useState } from 'react'
import { createPortal } from 'react-dom'

type CreateGameModalProps = {
  isOpen: boolean
  isSubmitting: boolean
  onClose: () => void
  onSubmit: (values: { provider: string; name: string; gameType: string; assignedRtp: number | null }) => Promise<void>
}

export function CreateGameModal({ isOpen, isSubmitting, onClose, onSubmit }: CreateGameModalProps) {
  const providerId = useId()
  const gameNameId = useId()
  const gameTypeId = useId()
  const rtpId = useId()
  const [provider, setProvider] = useState('')
  const [name, setName] = useState('')
  const [gameType, setGameType] = useState('Slot')
  const [assignedRtp, setAssignedRtp] = useState<string>('')

  useEffect(() => {
    if (!isOpen) {
      setProvider('')
      setName('')
      setGameType('Slot')
      setAssignedRtp('')
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape' && !isSubmitting) {
        onClose()
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen, isSubmitting, onClose])

  if (!isOpen) {
    return null
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsedRtp = assignedRtp.trim().length ? Number(assignedRtp) : null
    await onSubmit({
      provider: provider.trim(),
      name: name.trim(),
      gameType: gameType.trim(),
      assignedRtp: parsedRtp !== null && Number.isFinite(parsedRtp) ? parsedRtp : null,
    })
  }

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-night/55 px-4 backdrop-blur-sm" onClick={isSubmitting ? undefined : onClose}>
      <div
        className="w-full max-w-md rounded-[2rem] border border-spruce/15 bg-[linear-gradient(160deg,rgba(253,253,253,0.98),rgba(185,255,156,0.18))] p-6 shadow-panel"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.32em] text-spruce">Add game</p>
            <h3 className="mt-2 font-display text-2xl text-ink">Create new game entry</h3>
            <p className="mt-2 text-sm text-ink/72">Add some details to help this tool understand what type of game you're looking to break down.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-full border border-spruce/15 bg-white/70 px-3 py-1 text-sm text-ink transition hover:bg-white"
          >
            Close
          </button>
        </div>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor={providerId} className="block text-[11px] font-semibold uppercase tracking-[0.22em] text-spruce">
              Provider name
            </label>
            <input
              id={providerId}
              type="text"
              value={provider}
              onChange={(event) => setProvider(event.target.value)}
              placeholder="Pragmatic Play"
              disabled={isSubmitting}
              className="mt-2 w-full rounded-[1rem] border border-spruce/15 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-spruce/40"
            />
          </div>

          <div>
            <label htmlFor={gameNameId} className="block text-[11px] font-semibold uppercase tracking-[0.22em] text-spruce">
              Game name
            </label>
            <input
              id={gameNameId}
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Wild Skullz"
              disabled={isSubmitting}
              className="mt-2 w-full rounded-[1rem] border border-spruce/15 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-spruce/40"
            />
          </div>

          <div>
            <label htmlFor={gameTypeId} className="block text-[11px] font-semibold uppercase tracking-[0.22em] text-spruce">
              Game type
            </label>
            <select
              id={gameTypeId}
              value={gameType}
              onChange={(event) => setGameType(event.target.value)}
              disabled={isSubmitting}
              className="mt-2 w-full rounded-[1rem] border border-spruce/15 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-spruce/40"
            >
              <option value="Slot">Slot</option>
              <option value="Instant Win">Instant Win</option>
              <option value="Bingo">Bingo</option>
              <option value="Crash">Crash</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label htmlFor={rtpId} className="block text-[11px] font-semibold uppercase tracking-[0.22em] text-spruce">
              RTP (%)
            </label>
            <input
              id={rtpId}
              type="number"
              inputMode="decimal"
              min={0}
              max={100}
              step={0.1}
              value={assignedRtp}
              onChange={(event) => setAssignedRtp(event.target.value)}
              placeholder="e.g. 96.2"
              disabled={isSubmitting}
              className="mt-2 w-full rounded-[1rem] border border-spruce/15 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-spruce/40"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-full border border-spruce/15 bg-white px-4 py-2 text-sm font-medium text-ink transition hover:border-spruce/35"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !provider.trim() || !name.trim() || !gameType.trim()}
              className="rounded-full bg-night px-5 py-2 text-sm font-semibold text-mist transition hover:bg-spruce disabled:cursor-not-allowed disabled:bg-night/45 disabled:text-mist/55"
            >
              {isSubmitting ? 'Creating...' : 'Create game'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  )
}