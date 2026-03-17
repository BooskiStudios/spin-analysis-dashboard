import { pathToFileURL } from 'node:url'
import { getDatabase } from '../lib/database.js'
import { seedGames } from './seedData.js'

export async function seedDatabase() {
  const database = await getDatabase()
  let seeded = false

  await database.exec('BEGIN')

  try {
    for (const game of seedGames) {
      const existingGame = await database.get<{ id: number }>('SELECT id FROM games WHERE name = ? AND provider = ?', [
        game.name,
        game.provider,
      ])

      let gameId = existingGame?.id

      if (!gameId) {
        const gameResult = await database.run('INSERT INTO games (name, provider) VALUES (?, ?)', [game.name, game.provider])
        gameId = gameResult.lastID
        seeded = true
      }

      for (const session of game.sessions) {
        const existingSession = await database.get<{ id: number }>(
          'SELECT id FROM sessions WHERE game_id = ? AND created_at = ?',
          [gameId, session.createdAt],
        )

        let sessionId = existingSession?.id

        if (!sessionId) {
          const sessionResult = await database.run(
            'INSERT INTO sessions (game_id, total_spins, rtp, created_at) VALUES (?, ?, ?, ?)',
            [gameId, session.totalSpins, session.rtp, session.createdAt],
          )
          sessionId = sessionResult.lastID
          seeded = true
        }

        for (const spin of session.spins) {
          const existingSpin = await database.get<{ id: number }>(
            'SELECT id FROM spins WHERE session_id = ? AND spin_number = ?',
            [sessionId, spin.spinNumber],
          )

          let spinId = existingSpin?.id

          if (!spinId) {
            const spinResult = await database.run(
              `INSERT INTO spins (session_id, spin_number, win_amount, cascades, bonus_triggered, duration)
               VALUES (?, ?, ?, ?, ?, ?)`,
              [sessionId, spin.spinNumber, spin.winAmount, spin.cascades, spin.bonusTriggered ? 1 : 0, spin.duration],
            )
            spinId = spinResult.lastID
            seeded = true
          }

          for (const event of spin.events) {
            const existingEvent = await database.get<{ id: number }>(
              'SELECT id FROM events WHERE spin_id = ? AND event_type = ? AND timestamp = ?',
              [spinId, event.type, event.time],
            )

            if (!existingEvent) {
              await database.run(
                'INSERT INTO events (spin_id, event_type, timestamp) VALUES (?, ?, ?)',
                [spinId, event.type, event.time],
              )
              seeded = true
            }
          }
        }

        await database.run(
          'UPDATE sessions SET total_spins = COALESCE((SELECT COUNT(*) FROM spins WHERE session_id = ?), 0) WHERE id = ?',
          [sessionId, sessionId],
        )
      }
    }

    await database.exec('COMMIT')
    return { seeded }
  } catch (error) {
    await database.exec('ROLLBACK')
    throw error
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  seedDatabase()
    .then((result) => {
      console.log(result.seeded ? 'Demo data seeded' : 'Database already contains data')
    })
    .catch((error) => {
      console.error(error)
      process.exitCode = 1
    })
}