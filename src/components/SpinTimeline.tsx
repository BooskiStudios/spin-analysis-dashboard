import type { SpinEvent } from '../types'
import { EventMarker } from './EventMarker'

type SpinTimelineProps = {
  events: SpinEvent[]
  duration: number
  currentTime: number
  onSeek: (time: number) => void
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = (seconds % 60).toFixed(1).padStart(4, '0')

  return `${minutes}:${remainingSeconds}`
}

export function SpinTimeline({ events, duration, currentTime, onSeek }: SpinTimelineProps) {
  const safeDuration = duration > 0 ? duration : 1
  const progressWidth = Math.min((currentTime / safeDuration) * 100, 100)

  return (
    <div className="rounded-[1.5rem] border border-spruce/15 bg-surface p-4">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-spruce">Event timeline</p>
          <p className="mt-1 text-sm text-ink/72">Click a marker to jump to that point in the replay.</p>
        </div>
        <span className="rounded-full bg-spruce/10 px-3 py-1 text-xs font-semibold text-ink">{formatTime(duration)}</span>
      </div>

      <div className="relative h-20">
        <div className="absolute left-0 right-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-spruce/12" />
        <div className="absolute left-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-spruce" style={{ width: `${progressWidth}%` }} />

        {events.map((event, index) => {
          const nextEvent = events[index + 1]
          const position = Math.min((event.time / safeDuration) * 100, 100)
          const isActive = currentTime >= event.time && (!nextEvent || currentTime < nextEvent.time)

          return (
            <EventMarker
              key={`${event.type}-${event.time}-${index}`}
              event={event}
              position={position}
              isActive={isActive}
              onSelect={onSeek}
            />
          )
        })}
      </div>

      <div className="mt-3 flex items-center justify-between text-xs font-medium text-ink/60">
        <span>0:00</span>
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  )
}