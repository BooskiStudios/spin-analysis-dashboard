import { useEffect, useRef, useState } from 'react'
import type { Spin } from '../types'
import { SpinTimeline } from './SpinTimeline'
import { SpinVideoPlayer } from './SpinVideoPlayer'

type SpinViewerProps = {
  spin: Spin | undefined
}

const poster = `data:image/svg+xml;utf8,${encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450">
    <defs>
      <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0%" stop-color="#016871" />
        <stop offset="100%" stop-color="#00a294" />
      </linearGradient>
    </defs>
    <rect width="800" height="450" fill="url(#bg)" rx="30" />
    <circle cx="640" cy="80" r="70" fill="#ffff79" opacity="0.35" />
    <circle cx="120" cy="360" r="110" fill="#b9ff9c" opacity="0.2" />
    <text x="50%" y="46%" text-anchor="middle" fill="#fdfdfd" font-size="34" font-family="Poppins, sans-serif">Spin Replay Preview</text>
    <text x="50%" y="56%" text-anchor="middle" fill="#fdfdfd" opacity="0.82" font-size="18" font-family="Poppins, sans-serif">Mock poster shown until real replay assets are connected</text>
  </svg>
`)}`

export function SpinViewer({ spin }: SpinViewerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [videoDuration, setVideoDuration] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)

  useEffect(() => {
    setCurrentTime(0)
    setVideoDuration(spin?.duration ?? 0)
    setIsPlaying(false)

    if (videoRef.current) {
      videoRef.current.pause()
      videoRef.current.currentTime = 0
    }
  }, [spin])

  if (!spin) {
    return (
      <aside className="rounded-[2rem] border border-spruce/15 bg-surface/92 p-5 shadow-panel backdrop-blur">
        <p className="text-sm text-ink/72">Select a spin to inspect its replay and event timeline.</p>
      </aside>
    )
  }

  const effectiveDuration = videoDuration ? Math.min(videoDuration, spin.duration) : spin.duration

  const handleTimeUpdate = (time: number) => {
    const clampedTime = Math.min(time, effectiveDuration)

    if (videoRef.current && time > effectiveDuration) {
      videoRef.current.pause()
      videoRef.current.currentTime = effectiveDuration
      setIsPlaying(false)
    }

    setCurrentTime(clampedTime)
  }

  const handleSeek = (time: number) => {
    if (!videoRef.current) {
      return
    }

    videoRef.current.currentTime = Math.min(Math.max(time, 0), effectiveDuration)
    setCurrentTime(videoRef.current.currentTime)
  }

  const handleTogglePlayback = async () => {
    if (!videoRef.current) {
      return
    }

    if (videoRef.current.paused) {
      await videoRef.current.play()
      return
    }

    videoRef.current.pause()
  }

  const handleFrameStep = (direction: -1 | 1) => {
    const frameStep = 1 / 30
    handleSeek(currentTime + direction * frameStep)
  }

  return (
    <aside className="rounded-[2rem] border border-spruce/15 bg-surface/92 p-5 shadow-panel backdrop-blur xl:sticky xl:top-6">
      <div className="mb-4">
        <p className="text-xs uppercase tracking-[0.35em] text-spruce">Spin viewer</p>
        <h2 className="mt-2 font-display text-2xl text-ink">Spin #{spin.spinNumber}</h2>
      </div>

      <SpinVideoPlayer
        ref={videoRef}
        videoUrl={spin.videoUrl}
        poster={poster}
        currentTime={currentTime}
        duration={effectiveDuration}
        isPlaying={isPlaying}
        onTogglePlayback={handleTogglePlayback}
        onPreviousFrame={() => handleFrameStep(-1)}
        onNextFrame={() => handleFrameStep(1)}
        onTimeUpdate={handleTimeUpdate}
        onDurationChange={setVideoDuration}
        onPlayingChange={setIsPlaying}
      />

      <div className="mt-5">
        <SpinTimeline events={spin.events} duration={effectiveDuration} currentTime={currentTime} onSeek={handleSeek} />
      </div>

      <div className="mt-5 rounded-3xl bg-night p-4 text-mist">
        <p className="text-xs uppercase tracking-[0.3em] text-lime">Spin metadata</p>
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-2xl bg-white/5 p-3">
            <p className="text-mist/70">Spin number</p>
            <p className="mt-1 text-lg font-semibold">#{spin.spinNumber}</p>
          </div>
          <div className="rounded-2xl bg-white/5 p-3">
            <p className="text-mist/70">Total win</p>
            <p className="mt-1 text-lg font-semibold">£{spin.totalWin.toFixed(2)}</p>
          </div>
          <div className="rounded-2xl bg-white/5 p-3">
            <p className="text-mist/70">Cascades</p>
            <p className="mt-1 text-lg font-semibold">{spin.cascades}</p>
          </div>
          <div className="rounded-2xl bg-white/5 p-3">
            <p className="text-mist/70">Bonus triggered</p>
            <p className="mt-1 text-lg font-semibold">{spin.bonusTriggered ? 'Yes' : 'No'}</p>
          </div>
          <div className="rounded-2xl bg-white/5 p-3 sm:col-span-2">
            <p className="text-mist/70">Spin duration</p>
            <p className="mt-1 text-lg font-semibold">{Math.floor(spin.duration / 60)}:{(spin.duration % 60).toFixed(1).padStart(4, '0')}</p>
          </div>
        </div>
      </div>
    </aside>
  )
}