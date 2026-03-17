import { requestJson, requestJsonWithBody } from './apiClient'

export type Volatility = 'Low' | 'Medium' | 'High' | 'Extreme' | ''

export type BaseGameBreakdown = {
  reelSize: string
  winWays: string
  winWaysCount: number | ''
  lowPaySymbolCount: number | ''
  mediumPaySymbolCount: number | ''
  highPaySymbolCount: number | ''
  specialSymbolCount: number | ''
  wildSymbolCount: number | ''
  bonusSymbolCount: number | ''
  mechanics: string[]
  betModifiers: string[]
  topPrizeAmount: string
  gameSpeed: string
  volatility: Volatility
}

export const defaultBaseGameBreakdown: BaseGameBreakdown = {
  reelSize: '',
  winWays: '',
  winWaysCount: '',
  lowPaySymbolCount: '',
  mediumPaySymbolCount: '',
  highPaySymbolCount: '',
  specialSymbolCount: '',
  wildSymbolCount: '',
  bonusSymbolCount: '',
  mechanics: [],
  betModifiers: [],
  topPrizeAmount: '',
  gameSpeed: '',
  volatility: '',
}

function storageKey(gameId: number) {
  return `spin-examiner:base-breakdown:game:${gameId}`
}

type ApiBaseGameBreakdownResponse = {
  gameId: number
  breakdown: BaseGameBreakdown
  updatedAt: string
  updatedByEmail: string | null
}

export function loadBaseGameBreakdown(gameId: number): BaseGameBreakdown {
  const raw = window.localStorage.getItem(storageKey(gameId))
  if (!raw) return defaultBaseGameBreakdown

  try {
    const parsed = JSON.parse(raw) as Partial<BaseGameBreakdown>
    return {
      ...defaultBaseGameBreakdown,
      ...parsed,
      mechanics: Array.isArray(parsed.mechanics) ? parsed.mechanics.filter((value) => typeof value === 'string') : [],
      betModifiers: Array.isArray(parsed.betModifiers) ? parsed.betModifiers.filter((value) => typeof value === 'string') : [],
    }
  } catch {
    return defaultBaseGameBreakdown
  }
}

export async function loadBaseGameBreakdownFromServer(gameId: number): Promise<BaseGameBreakdown> {
  const response = await requestJson<ApiBaseGameBreakdownResponse>(`/games/${gameId}/base-breakdown`)
  return {
    ...defaultBaseGameBreakdown,
    ...response.breakdown,
    mechanics: Array.isArray(response.breakdown.mechanics) ? response.breakdown.mechanics : [],
    betModifiers: Array.isArray(response.breakdown.betModifiers) ? response.breakdown.betModifiers : [],
  }
}

export function saveBaseGameBreakdown(gameId: number, breakdown: BaseGameBreakdown) {
  window.localStorage.setItem(storageKey(gameId), JSON.stringify(breakdown))
}

export async function saveBaseGameBreakdownToServer(gameId: number, breakdown: BaseGameBreakdown, userEmail?: string | null) {
  await requestJsonWithBody<ApiBaseGameBreakdownResponse>(`/games/${gameId}/base-breakdown`, 'PUT', {
    breakdown,
    userEmail: userEmail ?? null,
  })
}
