import { mechanicsTaxonomy } from './mechanicsTaxonomy'
import { requestJson, requestJsonWithBody } from './apiClient'

export type BonusRoundType = 'Free Spins' | 'Pick / Click' | 'Spin Wheel' | 'Hold & Win' | 'Custom / Other'

export type FreeSpinsBreakdown = {
  reelSize: string
  mechanics: string[]
}

export type BonusRound = {
  type: BonusRoundType | ''
  freeSpins?: FreeSpinsBreakdown
  description?: string
}

export type BonusRoundsBreakdown = {
  count: number
  rounds: BonusRound[]
}

export const defaultFreeSpinsBreakdown: FreeSpinsBreakdown = {
  reelSize: '',
  mechanics: [],
}

export const defaultBonusRoundsBreakdown: BonusRoundsBreakdown = {
  count: 0,
  rounds: [],
}

function storageKey(gameId: number) {
  return `spin-examiner:bonus-breakdown:game:${gameId}`
}

type ApiBonusRoundsBreakdownResponse = {
  gameId: number
  breakdown: BonusRoundsBreakdown
  updatedAt: string
  updatedByEmail: string | null
}

function sanitizeMechanics(values: unknown): string[] {
  if (!Array.isArray(values)) return []
  const allowed = new Set(mechanicsTaxonomy.flatMap((category) => category.mechanics))
  return values.filter((value): value is string => typeof value === 'string' && allowed.has(value))
}

export function loadBonusRoundsBreakdown(gameId: number): BonusRoundsBreakdown {
  const raw = window.localStorage.getItem(storageKey(gameId))
  if (!raw) return defaultBonusRoundsBreakdown

  try {
    const parsed = JSON.parse(raw) as Partial<BonusRoundsBreakdown>
    const count = typeof parsed.count === 'number' && parsed.count >= 0 ? parsed.count : 0
    const rounds = Array.isArray(parsed.rounds) ? parsed.rounds : []

    const normalizedRounds: BonusRound[] = rounds.slice(0, 20).map((round) => {
      const record = (round ?? {}) as Partial<BonusRound>
      const type = typeof record.type === 'string' ? (record.type as BonusRoundType) : ''

      if (type === 'Free Spins') {
        const freeSpins = (record.freeSpins ?? {}) as Partial<FreeSpinsBreakdown>
        return {
          type,
          freeSpins: {
            reelSize: typeof freeSpins.reelSize === 'string' ? freeSpins.reelSize : '',
            mechanics: sanitizeMechanics(freeSpins.mechanics),
          },
        }
      }

      return {
        type,
        description: typeof record.description === 'string' ? record.description : '',
      }
    })

    return {
      count,
      rounds: normalizedRounds,
    }
  } catch {
    return defaultBonusRoundsBreakdown
  }
}

export function saveBonusRoundsBreakdown(gameId: number, breakdown: BonusRoundsBreakdown) {
  window.localStorage.setItem(storageKey(gameId), JSON.stringify(breakdown))
}

export async function loadBonusRoundsBreakdownFromServer(gameId: number): Promise<BonusRoundsBreakdown> {
  const response = await requestJson<ApiBonusRoundsBreakdownResponse>(`/games/${gameId}/bonus-breakdown`)
  return {
    ...defaultBonusRoundsBreakdown,
    ...response.breakdown,
  }
}

export async function saveBonusRoundsBreakdownToServer(gameId: number, breakdown: BonusRoundsBreakdown, userEmail?: string | null) {
  await requestJsonWithBody<ApiBonusRoundsBreakdownResponse>(`/games/${gameId}/bonus-breakdown`, 'PUT', {
    breakdown,
    userEmail: userEmail ?? null,
  })
}

export function setBonusRoundCount(current: BonusRoundsBreakdown, nextCount: number): BonusRoundsBreakdown {
  const safeCount = Math.max(0, Math.min(20, Math.floor(nextCount)))
  const nextRounds = [...current.rounds]

  while (nextRounds.length < safeCount) {
    nextRounds.push({ type: '' })
  }

  if (nextRounds.length > safeCount) {
    nextRounds.length = safeCount
  }

  return {
    count: safeCount,
    rounds: nextRounds,
  }
}
