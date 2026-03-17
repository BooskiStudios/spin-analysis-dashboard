import { loadBaseGameBreakdown } from './baseGameBreakdown'
import { loadBonusRoundsBreakdown } from './bonusRoundsBreakdown'

export function getGameMechanics(gameId: number): string[] {
  if (typeof window === 'undefined') {
    return []
  }

  const mechanics = new Set<string>()

  try {
    const base = loadBaseGameBreakdown(gameId)
    for (const mechanic of base.mechanics) {
      if (typeof mechanic === 'string' && mechanic.trim().length) {
        mechanics.add(mechanic)
      }
    }
  } catch {
    // ignore
  }

  try {
    const bonus = loadBonusRoundsBreakdown(gameId)
    for (const round of bonus.rounds) {
      if (round.type === 'Free Spins' && round.freeSpins?.mechanics?.length) {
        for (const mechanic of round.freeSpins.mechanics) {
          if (typeof mechanic === 'string' && mechanic.trim().length) {
            mechanics.add(mechanic)
          }
        }
      }
    }
  } catch {
    // ignore
  }

  return Array.from(mechanics)
}

export function gameMatchesMechanicQuery(mechanics: string[], query: string): boolean {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return false

  return mechanics.some((mechanic) => mechanic.toLowerCase().includes(normalized))
}
