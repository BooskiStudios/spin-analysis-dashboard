import type { Game, Session, Spin, SpinEvent } from '../types'
import { demoGames, getDemoSessions, getDemoSpinDetail, getDemoSpins } from '../data/demoData'
import { resolveApiUrl } from './apiClient'
import { getAuthToken } from './user'

const defaultReplayUrl = 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4'
export const isStaticDemo = import.meta.env.VITE_STATIC_DEMO === 'true'

type ApiGame = {
  id: number
  name: string
  provider: string
  game_type?: string | null
  assigned_rtp?: number | null
  total_sessions: number
}

type ApiSession = {
  id: number
  game_id: number
  total_spins: number
  rtp: number
  total_win: number
  created_at: string
  source_video_path?: string | null
  processing_status?: 'queued' | 'processing' | 'completed' | 'failed'
  processing_error?: string | null
}

type ApiSpinListItem = {
  id: number
  session_id: number
  spin_number: number
  win_amount: number
  cascades: number
  bonus_triggered: boolean | number
  duration: number
  video_url?: string | null
  videoUrl?: string | null
}

type ApiSpinEvent = {
  event_type: string
  timestamp: number
}

type ApiSpinDetail = ApiSpinListItem & {
  events: ApiSpinEvent[]
  video_url: string | null
  videoUrl?: string | null
}

function resolveReplayUrl(videoUrl?: string | null, legacyVideoUrl?: string | null) {
  return videoUrl ?? legacyVideoUrl ?? defaultReplayUrl
}

function isVisibleGame(game: ApiGame) {
  return !(game.provider === 'User Upload' && game.name === 'Uploaded Session Videos')
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(amount)
}

function formatRtp(rtp: number) {
  return `${rtp.toFixed(1)}%`
}

function normalizeBoolean(value: boolean | number) {
  return typeof value === 'boolean' ? value : Boolean(value)
}

function getAuthHeaders() {
  const token = getAuthToken()
  return token ? { 'Authorization': `Bearer ${token}` } : {}
}

async function requestJson<T>(input: string) {
  const response = await fetch(resolveApiUrl(input), {
    headers: getAuthHeaders(),
  })

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`)
  }

  return (await response.json()) as T
}

async function requestJsonWithBody<T>(input: string, method: string, body: unknown) {
  const response = await fetch(resolveApiUrl(input), {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`)
  }

  return (await response.json()) as T
}

async function requestFormData<T>(input: string, body: FormData) {
  const response = await fetch(resolveApiUrl(input), {
    method: 'POST',
    headers: getAuthHeaders(),
    body,
  })

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`)
  }

  return (await response.json()) as T
}

export async function fetchGames(): Promise<Game[]> {
  if (isStaticDemo) {
    return demoGames
  }

  const games = await requestJson<ApiGame[]>('/games')

  return games.filter(isVisibleGame).map((game) => ({
    id: game.id,
    name: game.name,
    provider: game.provider,
    gameType: game.game_type ?? null,
    assignedRtp: game.assigned_rtp ?? null,
    totalSessions: game.total_sessions,
  }))
}

export async function createGame(provider: string, name: string, gameType?: string | null, assignedRtp?: number | null): Promise<Game> {
  if (isStaticDemo) {
    throw new Error('Create game is disabled in the static demo build')
  }

  const game = await requestJsonWithBody<ApiGame>('/games', 'POST', {
    provider,
    name,
    gameType,
    assignedRtp,
  })

  return {
    id: game.id,
    name: game.name,
    provider: game.provider,
    gameType: game.game_type ?? null,
    assignedRtp: game.assigned_rtp ?? null,
    totalSessions: game.total_sessions,
  }
}

export async function updateGame(
  gameId: number,
  values: { provider: string; name: string; gameType?: string | null; assignedRtp?: number | null },
): Promise<Game> {
  if (isStaticDemo) {
    throw new Error('Update game is disabled in the static demo build')
  }

  const game = await requestJsonWithBody<ApiGame>(`/games/${gameId}`, 'PUT', {
    provider: values.provider,
    name: values.name,
    gameType: values.gameType ?? null,
    assignedRtp: values.assignedRtp ?? null,
  })

  return {
    id: game.id,
    name: game.name,
    provider: game.provider,
    gameType: game.game_type ?? null,
    assignedRtp: game.assigned_rtp ?? null,
    totalSessions: game.total_sessions,
  }
}

export async function fetchSessions(gameId: number): Promise<Session[]> {
  if (isStaticDemo) {
    return getDemoSessions(gameId)
  }

  const sessions = await requestJson<ApiSession[]>(`/sessions/${gameId}`)

  return sessions.map((session) => ({
    id: session.id,
    totalSpins: session.total_spins,
    rtp: formatRtp(session.rtp),
    totalWin: formatCurrency(session.total_win),
    date: session.created_at,
    processingStatus: session.processing_status ?? 'completed',
    processingError: session.processing_error ?? null,
    sourceVideoPath: session.source_video_path ?? null,
  }))
}

export async function fetchSpins(sessionId: number): Promise<Spin[]> {
  if (isStaticDemo) {
    return getDemoSpins(sessionId)
  }

  const spins = await requestJson<ApiSpinListItem[]>(`/sessions/${sessionId}/spins`)

  return spins.map((spin) => ({
    id: spin.id,
    spinNumber: spin.spin_number,
    totalWin: spin.win_amount,
    cascades: spin.cascades,
    bonusTriggered: normalizeBoolean(spin.bonus_triggered),
    duration: spin.duration,
    videoUrl: resolveReplayUrl(spin.videoUrl, spin.video_url),
    events: [],
  }))
}

export async function uploadSessionVideo(videoFile: File, gameId?: number | null, metadataText?: string | null) {
  if (isStaticDemo) {
    throw new Error('Video upload is disabled in the static demo build')
  }

  const formData = new FormData()
  formData.append('video', videoFile)

  if (gameId) {
    formData.append('gameId', String(gameId))
  }

  if (metadataText && metadataText.trim().length > 0) {
    formData.append('metadata', metadataText)
  }

  return requestFormData<{ sessionId: number }>('/upload-session-video', formData)
}

export async function fetchSpinDetail(spinId: number): Promise<Spin> {
  if (isStaticDemo) {
    const spin = getDemoSpinDetail(spinId)

    if (!spin) {
      throw new Error('Spin not found')
    }

    return spin
  }

  const spin = await requestJson<ApiSpinDetail>(`/spins/${spinId}`)

  return {
    id: spin.id,
    spinNumber: spin.spin_number,
    totalWin: spin.win_amount,
    cascades: spin.cascades,
    bonusTriggered: normalizeBoolean(spin.bonus_triggered),
    duration: spin.duration,
    videoUrl: resolveReplayUrl(spin.videoUrl, spin.video_url),
    events: spin.events.map<SpinEvent>((event) => ({
      type: event.event_type,
      time: event.timestamp,
    })),
  }
}