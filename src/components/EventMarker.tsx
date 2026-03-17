import type { SpinEvent } from '../types'

type EventMarkerProps = {
  event: SpinEvent
  position: number
  isActive: boolean
  onSelect: (time: number) => void
}

const eventStyles: Record<string, string> = {
  spin_start: 'border-spruce bg-spruce',
  cascade: 'border-lime bg-lime',
  bonus_trigger: 'border-ember bg-ember',
  spin_end: 'border-ink bg-night',
}

const eventLabels: Record<string, string> = {
  spin_start: 'Start',
  cascade: 'Cascade',
  bonus_trigger: 'Bonus',
  spin_end: 'End',
}

export function EventMarker({ event, position, isActive, onSelect }: EventMarkerProps) {
  const eventClassName = eventStyles[event.type] ?? 'border-roseclay bg-roseclay'
  const label = eventLabels[event.type] ?? event.type.replace(/_/g, ' ')

  return (
    <button
      type="button"
      onClick={() => onSelect(event.time)}
      className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 text-left"
      style={{ left: `${position}%` }}
      aria-label={`Jump to ${label} at ${event.time.toFixed(1)} seconds`}
      title={`${label} at ${event.time.toFixed(1)}s`}
    >
      <span className="flex flex-col items-center gap-1">
        <span className={`h-4 w-0.5 ${isActive ? 'bg-night' : 'bg-ink/45'}`} />
        <span
          className={`h-3.5 w-3.5 rounded-full border-2 ${eventClassName} ${isActive ? 'scale-110 shadow-panel' : ''}`}
        />
        <span className="whitespace-nowrap rounded-full bg-night px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-mist">
          {label}
        </span>
      </span>
    </button>
  )
}