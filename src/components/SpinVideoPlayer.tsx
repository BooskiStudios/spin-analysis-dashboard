import { forwardRef } from 'react'

type SpinVideoPlayerProps = {
  videoUrl: string
  poster: string
  currentTime: number
  duration: number
  isPlaying: boolean
  onTogglePlayback: () => void
  onPreviousFrame: () => void
  onNextFrame: () => void
  onTimeUpdate: (time: number) => void
  onDurationChange: (duration: number) => void
  onPlayingChange: (isPlaying: boolean) => void
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = (seconds % 60).toFixed(1).padStart(4, '0')

  return `${minutes}:${remainingSeconds}`
}

export const SpinVideoPlayer = forwardRef<HTMLVideoElement, SpinVideoPlayerProps>(function SpinVideoPlayer(
  {
    videoUrl,
    poster,
    currentTime,
    duration,
    isPlaying,
    onTogglePlayback,
    onPreviousFrame,
    onNextFrame,
    onTimeUpdate,
    onDurationChange,
    onPlayingChange,
  },
  ref,
) {
  return (
    <div className="rounded-[1.5rem] border border-spruce/15 bg-surface p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-spruce">Replay video</p>
          <p className="mt-1 text-sm text-ink/72">Current time {formatTime(currentTime)} / {formatTime(duration)}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onTogglePlayback}
            className="rounded-full bg-night px-4 py-2 text-sm font-semibold text-mist"
          >
            {isPlaying ? 'Pause' : 'Play'}
          </button>
          <button
            type="button"
            onClick={onPreviousFrame}
            className="rounded-full border border-spruce/20 bg-spruce/8 px-4 py-2 text-sm font-semibold text-ink"
          >
            Previous frame
          </button>
          <button
            type="button"
            onClick={onNextFrame}
            className="rounded-full border border-spruce/20 bg-spruce/8 px-4 py-2 text-sm font-semibold text-ink"
          >
            Next frame
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-[1.25rem] bg-night">
        <video
          key={videoUrl}
          ref={ref}
          src={videoUrl}
          controls
          preload="metadata"
          poster={poster}
          className="aspect-video w-full bg-night object-cover"
          onTimeUpdate={(event) => onTimeUpdate(event.currentTarget.currentTime)}
          onLoadedMetadata={(event) => onDurationChange(event.currentTarget.duration)}
          onPlay={() => onPlayingChange(true)}
          onPause={() => onPlayingChange(false)}
          onEnded={() => onPlayingChange(false)}
        />
      </div>
    </div>
  )
})