import type { Game, Spin, SpinEvent } from '../types'

const mockReplayUrl = 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4'

type SpinSeed = {
  totalWin: number
  cascades: number
  bonusTriggered: boolean
  duration: number
}

function createEvents(duration: number, cascades: number, bonusTriggered: boolean): SpinEvent[] {
  const events: SpinEvent[] = [{ type: 'spin_start', time: 0 }]

  for (let index = 0; index < cascades; index += 1) {
    const position = ((index + 1) / (cascades + 1)) * Math.max(duration - 1.5, 1)
    events.push({ type: 'cascade', time: Number(position.toFixed(2)) })
  }

  if (bonusTriggered) {
    events.push({ type: 'bonus_trigger', time: Number(Math.max(duration * 0.68, 0.5).toFixed(2)) })
  }

  events.push({ type: 'spin_end', time: duration })

  return events.sort((left, right) => left.time - right.time)
}

function createSpin(sessionCode: string, spinNumber: number, seed: SpinSeed): Spin {
  return {
    id: `${sessionCode}-${String(spinNumber).padStart(3, '0')}`,
    spinNumber,
    videoUrl: mockReplayUrl,
    totalWin: seed.totalWin,
    cascades: seed.cascades,
    bonusTriggered: seed.bonusTriggered,
    duration: seed.duration,
    events: createEvents(seed.duration, seed.cascades, seed.bonusTriggered),
  }
}

function createSessionSpins(sessionCode: string, seeds: SpinSeed[]) {
  return seeds.map((seed, index) => createSpin(sessionCode, index + 1, seed))
}

export const games: Game[] = [
  {
    id: 'gates-of-olympus',
    name: 'Gates of Olympus',
    provider: 'Pragmatic Play',
    totalSessions: 3,
    sessions: [
      {
        totalSpins: 184,
        rtp: '97.8%',
        totalWin: '£1,942.40',
        date: '2026-03-01',
        spins: createSessionSpins('GOL-240301-A', [
          { totalWin: 0, cascades: 0, bonusTriggered: false, duration: 4.1 },
          { totalWin: 24.5, cascades: 2, bonusTriggered: false, duration: 4.6 },
          { totalWin: 0, cascades: 0, bonusTriggered: false, duration: 4.0 },
          { totalWin: 18.2, cascades: 1, bonusTriggered: false, duration: 4.3 },
          { totalWin: 0, cascades: 0, bonusTriggered: true, duration: 4.9 },
          { totalWin: 316.8, cascades: 5, bonusTriggered: false, duration: 5.0 },
        ]),
      },
      {
        totalSpins: 96,
        rtp: '88.4%',
        totalWin: '£742.10',
        date: '2026-03-02',
        spins: createSessionSpins('GOL-240302-B', [
          { totalWin: 8.4, cascades: 1, bonusTriggered: false, duration: 4.2 },
          { totalWin: 0, cascades: 0, bonusTriggered: false, duration: 4.0 },
          { totalWin: 12, cascades: 1, bonusTriggered: false, duration: 4.3 },
          { totalWin: 122.6, cascades: 3, bonusTriggered: false, duration: 4.8 },
          { totalWin: 5.6, cascades: 1, bonusTriggered: false, duration: 4.1 },
          { totalWin: 0, cascades: 0, bonusTriggered: false, duration: 4.0 },
        ]),
      },
      {
        totalSpins: 211,
        rtp: '104.2%',
        totalWin: '£2,881.75',
        date: '2026-03-05',
        spins: createSessionSpins('GOL-240305-C', [
          { totalWin: 0, cascades: 0, bonusTriggered: false, duration: 4.0 },
          { totalWin: 32, cascades: 2, bonusTriggered: false, duration: 4.5 },
          { totalWin: 0, cascades: 0, bonusTriggered: false, duration: 4.0 },
          { totalWin: 76.4, cascades: 3, bonusTriggered: false, duration: 4.8 },
          { totalWin: 0, cascades: 0, bonusTriggered: true, duration: 4.9 },
          { totalWin: 640, cascades: 6, bonusTriggered: false, duration: 5.0 },
        ]),
      },
    ],
  },
  {
    id: 'big-bass-bonanza',
    name: 'Big Bass Bonanza',
    provider: 'Pragmatic Play',
    totalSessions: 2,
    sessions: [
      {
        totalSpins: 143,
        rtp: '92.1%',
        totalWin: '£1,014.55',
        date: '2026-02-28',
        spins: createSessionSpins('BBB-240228-A', [
          { totalWin: 0, cascades: 0, bonusTriggered: false, duration: 4.0 },
          { totalWin: 12, cascades: 1, bonusTriggered: false, duration: 4.2 },
          { totalWin: 54, cascades: 2, bonusTriggered: false, duration: 4.5 },
          { totalWin: 0, cascades: 0, bonusTriggered: false, duration: 4.0 },
          { totalWin: 24, cascades: 1, bonusTriggered: false, duration: 4.3 },
          { totalWin: 210.25, cascades: 4, bonusTriggered: false, duration: 4.9 },
        ]),
      },
      {
        totalSpins: 87,
        rtp: '109.6%',
        totalWin: '£1,322.20',
        date: '2026-03-04',
        spins: createSessionSpins('BBB-240304-B', [
          { totalWin: 0, cascades: 0, bonusTriggered: false, duration: 4.0 },
          { totalWin: 18, cascades: 1, bonusTriggered: false, duration: 4.2 },
          { totalWin: 0, cascades: 0, bonusTriggered: true, duration: 4.9 },
          { totalWin: 46.5, cascades: 2, bonusTriggered: false, duration: 4.5 },
          { totalWin: 88.4, cascades: 3, bonusTriggered: false, duration: 4.8 },
          { totalWin: 488.3, cascades: 5, bonusTriggered: false, duration: 5.0 },
        ]),
      },
    ],
  },
  {
    id: 'fishin-frenzy-megaways',
    name: 'Fishin\' Frenzy Megaways',
    provider: 'Blueprint Gaming',
    totalSessions: 2,
    sessions: [
      {
        totalSpins: 126,
        rtp: '95.5%',
        totalWin: '£864.90',
        date: '2026-02-25',
        spins: createSessionSpins('FFM-240225-A', [
          { totalWin: 6.2, cascades: 1, bonusTriggered: false, duration: 4.2 },
          { totalWin: 0, cascades: 0, bonusTriggered: false, duration: 4.0 },
          { totalWin: 22.8, cascades: 2, bonusTriggered: false, duration: 4.4 },
          { totalWin: 0, cascades: 0, bonusTriggered: false, duration: 4.0 },
          { totalWin: 138, cascades: 3, bonusTriggered: false, duration: 4.8 },
          { totalWin: 16.4, cascades: 1, bonusTriggered: false, duration: 4.2 },
        ]),
      },
      {
        totalSpins: 203,
        rtp: '101.3%',
        totalWin: '£2,103.45',
        date: '2026-03-06',
        spins: createSessionSpins('FFM-240306-B', [
          { totalWin: 0, cascades: 0, bonusTriggered: false, duration: 4.0 },
          { totalWin: 18.2, cascades: 1, bonusTriggered: false, duration: 4.2 },
          { totalWin: 0, cascades: 0, bonusTriggered: true, duration: 4.9 },
          { totalWin: 64.8, cascades: 2, bonusTriggered: false, duration: 4.5 },
          { totalWin: 118.7, cascades: 3, bonusTriggered: false, duration: 4.8 },
          { totalWin: 522.75, cascades: 4, bonusTriggered: false, duration: 5.0 },
        ]),
      },
    ],
  },
]