import { demoGames } from '../data/demoData'
import { defaultBaseGameBreakdown, loadBaseGameBreakdown, saveBaseGameBreakdown, type BaseGameBreakdown } from './baseGameBreakdown'
import {
  defaultBonusRoundsBreakdown,
  loadBonusRoundsBreakdown,
  saveBonusRoundsBreakdown,
  type BonusRoundsBreakdown,
} from './bonusRoundsBreakdown'

type DemoBreakdownSeed = {
  base?: Partial<BaseGameBreakdown>
  bonus?: Partial<BonusRoundsBreakdown>
}

// Fill these out as you like. These are meant to be "placeholder" examples for the demo games.
const seedByGameId: Record<number, DemoBreakdownSeed> = {
  1: {
    base: {
      reelSize: '6x5',
      winWays: 'Pay Anywhere',
      winWaysCount: '',
      lowPaySymbolCount: 6,
      mediumPaySymbolCount: 4,
      highPaySymbolCount: 3,
      wildSymbolCount: 1,
      bonusSymbolCount: 1,
      specialSymbolCount: 1,
      mechanics: ['Win Multiplier (Bonus)', 'Collector Meter'],
      topPrizeAmount: '5,000x',
      gameSpeed: 'Standard',
      volatility: 'High',
    },
    bonus: {
      count: 1,
      rounds: [
        {
          type: 'Free Spins',
          freeSpins: {
            reelSize: '6x5',
            mechanics: ['Win Multiplier (Bonus)'],
          },
        },
      ],
    },
  },
  2: {
    base: {
      reelSize: '5x3',
      winWays: 'Win Lines',
      winWaysCount: 10,
      lowPaySymbolCount: 6,
      mediumPaySymbolCount: 3,
      highPaySymbolCount: 3,
      wildSymbolCount: 1,
      bonusSymbolCount: 1,
      specialSymbolCount: 0,
      mechanics: ['Scatter (Standard)'],
      topPrizeAmount: '2,100x',
      gameSpeed: 'Standard',
      volatility: 'High',
    },
    bonus: {
      count: 1,
      rounds: [
        {
          type: 'Free Spins',
          freeSpins: {
            reelSize: '5x3',
            mechanics: ['Improved Base Game'],
          },
        },
      ],
    },
  },
  3: {
    base: {
      reelSize: 'Megaways',
      winWays: 'Megaways / Variable Height',
      winWaysCount: '',
      lowPaySymbolCount: 6,
      mediumPaySymbolCount: 4,
      highPaySymbolCount: 4,
      wildSymbolCount: 1,
      bonusSymbolCount: 1,
      specialSymbolCount: 0,
      mechanics: ['Megaways / Variable Height'],
      topPrizeAmount: '10,000x',
      gameSpeed: 'Standard',
      volatility: 'High',
    },
    bonus: {
      count: 2,
      rounds: [
        {
          type: 'Free Spins',
          freeSpins: {
            reelSize: 'Megaways',
            mechanics: ['Improved Base Game'],
          },
        },
        {
          type: 'Pick / Click',
          description: 'Pick a prize from a selection of hidden values.',
        },
      ],
    },
  },
}

function hasAnySavedBase(gameId: number) {
  const saved = loadBaseGameBreakdown(gameId)
  return JSON.stringify(saved) !== JSON.stringify(defaultBaseGameBreakdown)
}

function hasAnySavedBonus(gameId: number) {
  const saved = loadBonusRoundsBreakdown(gameId)
  return JSON.stringify(saved) !== JSON.stringify(defaultBonusRoundsBreakdown)
}

export function ensureDemoBreakdownsSeeded() {
  if (typeof window === 'undefined') return

  for (const game of demoGames) {
    const seed = seedByGameId[game.id]
    if (!seed) continue

    if (seed.base && !hasAnySavedBase(game.id)) {
      saveBaseGameBreakdown(game.id, { ...defaultBaseGameBreakdown, ...seed.base })
    }

    if (seed.bonus && !hasAnySavedBonus(game.id)) {
      saveBonusRoundsBreakdown(game.id, { ...defaultBonusRoundsBreakdown, ...seed.bonus })
    }
  }
}
