import type { Game, Session, Spin, SpinEvent } from '../types'

const demoReplayUrl = 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4'

type DemoSpinSeed = {
  totalWin: number
  cascades: number
  bonusTriggered: boolean
  duration: number
}

type DemoSessionSeed = {
  id: number
  totalSpins: number
  rtp: string
  totalWin: string
  date: string
  spins: DemoSpinSeed[]
}

type DemoGameSeed = {
  id: number
  name: string
  provider: string
  sessions: DemoSessionSeed[]
}

function createEvents(duration: number, cascades: number, bonusTriggered: boolean): SpinEvent[] {
  const events: SpinEvent[] = [{ type: 'spin_start', time: 0 }]

  for (let index = 0; index < cascades; index += 1) {
    const position = ((index + 1) / (cascades + 1)) * Math.max(duration - 1.2, 1)
    events.push({ type: 'cascade', time: Number(position.toFixed(2)) })
  }

  if (bonusTriggered) {
    events.push({ type: 'bonus_detected', time: Number(Math.max(duration * 0.76, 0.8).toFixed(2)) })
  }

  events.push({ type: 'spin_end', time: duration })
  return events.sort((left, right) => left.time - right.time)
}

function createSpin(sessionId: number, spinNumber: number, seed: DemoSpinSeed): Spin {
  return {
    id: sessionId * 1000 + spinNumber,
    spinNumber,
    totalWin: seed.totalWin,
    cascades: seed.cascades,
    bonusTriggered: seed.bonusTriggered,
    duration: seed.duration,
    videoUrl: demoReplayUrl,
    events: createEvents(seed.duration, seed.cascades, seed.bonusTriggered),
  }
}

const demoSeed: DemoGameSeed[] = [
  {
    id: 1,
    name: 'Gates of Olympus',
    provider: 'Pragmatic Play',
    sessions: [
      {
        id: 101,
        totalSpins: 132,
        rtp: '96.8%',
        totalWin: '£1,284.20',
        date: '2026-03-05 20:14',
        spins: [
          { totalWin: 0, cascades: 0, bonusTriggered: false, duration: 3.8 },
          { totalWin: 12.4, cascades: 1, bonusTriggered: false, duration: 4.5 },
          { totalWin: 0, cascades: 0, bonusTriggered: false, duration: 3.7 },
          { totalWin: 44.8, cascades: 2, bonusTriggered: false, duration: 5.1 },
          { totalWin: 0, cascades: 0, bonusTriggered: true, duration: 6.2 },
          { totalWin: 188.2, cascades: 4, bonusTriggered: false, duration: 7.8 },
        ],
      },
      {
        id: 102,
        totalSpins: 94,
        rtp: '104.1%',
        totalWin: '£1,036.90',
        date: '2026-03-07 21:02',
        spins: [
          { totalWin: 0, cascades: 0, bonusTriggered: false, duration: 3.6 },
          { totalWin: 20, cascades: 1, bonusTriggered: false, duration: 4.4 },
          { totalWin: 73.6, cascades: 3, bonusTriggered: false, duration: 6.6 },
          { totalWin: 0, cascades: 0, bonusTriggered: false, duration: 3.5 },
          { totalWin: 16.2, cascades: 1, bonusTriggered: false, duration: 4.1 },
          { totalWin: 242.9, cascades: 5, bonusTriggered: false, duration: 8 },
        ],
      },
    ],
  },
  {
    id: 2,
    name: 'Big Bass Bonanza',
    provider: 'Pragmatic Play',
    sessions: [
      {
        id: 201,
        totalSpins: 118,
        rtp: '92.7%',
        totalWin: '£842.15',
        date: '2026-03-04 19:41',
        spins: [
          { totalWin: 0, cascades: 0, bonusTriggered: false, duration: 3.9 },
          { totalWin: 8, cascades: 0, bonusTriggered: false, duration: 4.2 },
          { totalWin: 22.5, cascades: 1, bonusTriggered: false, duration: 4.6 },
          { totalWin: 0, cascades: 0, bonusTriggered: false, duration: 3.8 },
          { totalWin: 64, cascades: 2, bonusTriggered: false, duration: 5.2 },
          { totalWin: 0, cascades: 0, bonusTriggered: true, duration: 6.8 },
        ],
      },
      {
        id: 202,
        totalSpins: 87,
        rtp: '109.2%',
        totalWin: '£1,198.40',
        date: '2026-03-06 22:10',
        spins: [
          { totalWin: 0, cascades: 0, bonusTriggered: false, duration: 3.8 },
          { totalWin: 18.4, cascades: 1, bonusTriggered: false, duration: 4.4 },
          { totalWin: 0, cascades: 0, bonusTriggered: false, duration: 3.9 },
          { totalWin: 88.2, cascades: 2, bonusTriggered: false, duration: 5.8 },
          { totalWin: 0, cascades: 0, bonusTriggered: true, duration: 7.4 },
          { totalWin: 312.5, cascades: 3, bonusTriggered: false, duration: 7.9 },
        ],
      },
    ],
  },
  {
    id: 3,
    name: 'Fishin\' Frenzy Megaways',
    provider: 'Blueprint Gaming',
    sessions: [
      {
        id: 301,
        totalSpins: 145,
        rtp: '98.6%',
        totalWin: '£1,502.65',
        date: '2026-03-03 18:27',
        spins: [
          { totalWin: 0, cascades: 0, bonusTriggered: false, duration: 4 },
          { totalWin: 16.8, cascades: 1, bonusTriggered: false, duration: 4.9 },
          { totalWin: 52.1, cascades: 2, bonusTriggered: false, duration: 5.7 },
          { totalWin: 0, cascades: 0, bonusTriggered: false, duration: 4 },
          { totalWin: 0, cascades: 0, bonusTriggered: true, duration: 6.1 },
          { totalWin: 164.75, cascades: 3, bonusTriggered: false, duration: 7.1 },
        ],
      },
    ],
  },
]

const sessionLookup = new Map<number, Session[]>()
const spinLookup = new Map<number, Spin[]>()
const spinDetailLookup = new Map<number, Spin>()

export const demoGames: Game[] = demoSeed.map((game) => {
  const sessions = game.sessions.map<Session>((session) => {
    const spins = session.spins.map((seed, index) => createSpin(session.id, index + 1, seed))
    spinLookup.set(session.id, spins)

    for (const spin of spins) {
      spinDetailLookup.set(spin.id, spin)
    }

    return {
      id: session.id,
      totalSpins: session.totalSpins,
      rtp: session.rtp,
      totalWin: session.totalWin,
      date: session.date,
      processingStatus: 'completed',
      processingError: null,
      sourceVideoPath: null,
    }
  })

  sessionLookup.set(game.id, sessions)

  return {
    id: game.id,
    name: game.name,
    provider: game.provider,
    totalSessions: sessions.length,
  }
})

export function getDemoSessions(gameId: number) {
  return sessionLookup.get(gameId) ?? []
}

export function getDemoSpins(sessionId: number) {
  return spinLookup.get(sessionId) ?? []
}

export function getDemoSpinDetail(spinId: number) {
  return spinDetailLookup.get(spinId)
}