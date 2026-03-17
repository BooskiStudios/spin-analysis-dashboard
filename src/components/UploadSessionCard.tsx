import { useEffect, useId, useState } from 'react'

export type UploadWorkflowStatus = 'idle' | 'uploading' | 'queued' | 'processing' | 'completed' | 'failed'

type UploadSessionCardProps = {
  status: UploadWorkflowStatus
  activeUploadSessionId: number | null
  isDisabled: boolean
  onUpload: (file: File) => Promise<void>
}

const acceptedVideoTypes = '.mp4,.mov,.mkv'

export function UploadSessionCard({ status, activeUploadSessionId, isDisabled, onUpload }: UploadSessionCardProps) {
  const inputId = useId()
  const [selectedFileName, setSelectedFileName] = useState('')
  const [displayProgress, setDisplayProgress] = useState(0)

  async function handleFileSelection(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    setSelectedFileName(file.name)

    try {
      await onUpload(file)
    } finally {
      event.target.value = ''
    }
  }

  useEffect(() => {
    const targetProgress = {
      idle: 0,
      uploading: 24,
      queued: 42,
      processing: 78,
      completed: 100,
      failed: 0,
    }[status]

    setDisplayProgress((currentProgress) => {
      if (status === 'failed') {
        return 0
      }

      if (targetProgress >= currentProgress) {
        return targetProgress
      }

      return currentProgress
    })
  }, [status])

  const statusMessage = {
    idle: 'MP4, MOV, MKV',
    uploading: 'Uploading video',
    queued: activeUploadSessionId ? `Queued session ${activeUploadSessionId}` : 'Queued',
    processing: activeUploadSessionId ? `Processing session ${activeUploadSessionId}` : 'Processing',
    completed: 'Upload complete',
    failed: 'Upload failed',
  }[status]

  const helperText = isDisabled
    ? 'Uploads are locked while another game is being processed.'
    : selectedFileName
      ? selectedFileName
      : 'Upload a gameplay video to create a session and auto-split spins.'

  const progressBarTone = status === 'failed' ? 'from-[#f38b9b] to-[#d9485f]' : 'from-lime to-[#73e2d8]'
  const showProgress = status !== 'idle' || displayProgress > 0

  return (
    <div className="rounded-[1.6rem] border border-spruce/15 bg-night px-4 py-4 text-mist shadow-panel">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-lime">Session upload</p>
            <span className="rounded-full border border-white/10 bg-white/8 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-mist/75">
              {statusMessage}
            </span>
          </div>
          <p className="mt-2 truncate text-sm text-mist/76">
            {helperText}
          </p>
          {showProgress ? (
            <div className="mt-3">
              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${progressBarTone} transition-[width] duration-500 ease-out`}
                  style={{ width: `${displayProgress}%` }}
                />
              </div>
              <div className="mt-1 flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-mist/55">
                <span>{status === 'processing' ? 'Analyzing and splitting spins' : statusMessage}</span>
                <span>{displayProgress}%</span>
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <input
            id={inputId}
            type="file"
            accept={acceptedVideoTypes}
            disabled={status === 'uploading' || isDisabled}
            onChange={handleFileSelection}
            className="sr-only"
          />

          <label
            htmlFor={inputId}
            className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold transition ${
              status === 'uploading' || isDisabled
                ? 'cursor-not-allowed bg-white/10 text-mist/60'
                : 'cursor-pointer bg-lime text-ink hover:bg-[#d6ff9f]'
            }`}
          >
            {status === 'uploading' ? 'Uploading...' : isDisabled ? 'Locked' : 'Choose video'}
          </label>
        </div>
      </div>
    </div>
  )
}