export type SpinEvent = {
  type: string
  time: number
}

export type Spin = {
  id: number
  spinNumber: number
  totalWin: number
  cascades: number
  bonusTriggered: boolean
  duration: number
  videoUrl: string
  events: SpinEvent[]
}

export type Session = {
  id: number
  totalSpins: number
  rtp: string
  totalWin: string
  date: string
  processingStatus: 'queued' | 'processing' | 'completed' | 'failed'
  processingError: string | null
  sourceVideoPath: string | null
}

export type Game = {
  id: number
  name: string
  provider: string
  gameType: string | null
  assignedRtp: number | null
  totalSessions: number
}