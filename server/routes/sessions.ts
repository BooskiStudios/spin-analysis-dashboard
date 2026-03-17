import { Router } from 'express'
import { getDatabase } from '../lib/database.js'
import {
  parseEvents,
  parseIdParam,
  parseOptionalNumber,
  parseRequiredBoolean,
  parseRequiredNumber,
} from '../lib/validation.js'

export const sessionsRouter = Router()

sessionsRouter.post('/', async (request, response) => {
  const gameId = parseRequiredNumber(request.body?.gameId, 'gameId')
  const totalSpins = parseOptionalNumber(request.body?.totalSpins, 'totalSpins', 0)
  const rtp = parseOptionalNumber(request.body?.rtp, 'rtp', 0)
  const createdAt = typeof request.body?.createdAt === 'string' ? request.body.createdAt : undefined

  const database = await getDatabase()
  const game = await database.get('SELECT id FROM games WHERE id = ?', [gameId])

  if (!game) {
    return response.status(404).json({ error: 'Game not found' })
  }

  const result = await database.run(
    'INSERT INTO sessions (game_id, total_spins, rtp, created_at) VALUES (?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP))',
    [gameId, totalSpins, rtp, createdAt ?? null],
  )

  const session = await database.get(
    'SELECT id, game_id, total_spins, rtp, created_at FROM sessions WHERE id = ?',
    [result.lastID],
  )

  return response.status(201).json(session)
})

sessionsRouter.get('/:gameId', async (request, response) => {
  const gameId = parseIdParam(request.params.gameId, 'gameId')

  const database = await getDatabase()
  const sessions = await database.all(
    `SELECT sessions.id, sessions.game_id, sessions.total_spins, sessions.rtp, sessions.created_at,
            sessions.source_video_path, sessions.processing_status, sessions.processing_error,
            COALESCE(SUM(spins.win_amount), 0) AS total_win
     FROM sessions
     LEFT JOIN spins ON spins.session_id = sessions.id
     WHERE sessions.game_id = ?
     GROUP BY sessions.id, sessions.game_id, sessions.total_spins, sessions.rtp, sessions.created_at,
              sessions.source_video_path, sessions.processing_status, sessions.processing_error
     ORDER BY datetime(sessions.created_at) DESC`,
    [gameId],
  )

  return response.json(sessions)
})

sessionsRouter.post('/:sessionId/spins', async (request, response) => {
  const sessionId = parseIdParam(request.params.sessionId, 'sessionId')
  const spinNumber = parseRequiredNumber(request.body?.spinNumber, 'spinNumber')
  const winAmount = parseRequiredNumber(request.body?.winAmount, 'winAmount')
  const cascades = parseRequiredNumber(request.body?.cascades, 'cascades')
  const bonusTriggered = parseRequiredBoolean(request.body?.bonusTriggered, 'bonusTriggered')
  const duration = parseRequiredNumber(request.body?.duration, 'duration')
  const events = parseEvents(request.body?.events)

  const database = await getDatabase()
  const session = await database.get('SELECT id FROM sessions WHERE id = ?', [sessionId])

  if (!session) {
    return response.status(404).json({ error: 'Session not found' })
  }

  await database.exec('BEGIN')

  try {
    const spinResult = await database.run(
      `INSERT INTO spins (session_id, spin_number, win_amount, cascades, bonus_triggered, duration)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [sessionId, spinNumber, winAmount, cascades, bonusTriggered ? 1 : 0, duration],
    )

    for (const event of events) {
      if (!event.type || event.time === undefined) {
        continue
      }

      await database.run(
        'INSERT INTO events (spin_id, event_type, timestamp) VALUES (?, ?, ?)',
        [spinResult.lastID, event.type, event.time],
      )
    }

    await database.run(
      'UPDATE sessions SET total_spins = (SELECT COUNT(*) FROM spins WHERE session_id = ?) WHERE id = ?',
      [sessionId, sessionId],
    )

    await database.exec('COMMIT')

    const spin = await database.get(
      `SELECT id, session_id, spin_number, win_amount, cascades, bonus_triggered, duration
       FROM spins WHERE id = ?`,
      [spinResult.lastID],
    )

    return response.status(201).json(spin)
  } catch (error) {
    await database.exec('ROLLBACK')
    throw error
  }
})

sessionsRouter.get('/:sessionId/spins', async (request, response) => {
  const sessionId = parseIdParam(request.params.sessionId, 'sessionId')

  const database = await getDatabase()
  const spins = await database.all(
    `SELECT spins.id, spins.session_id, spins.spin_number, spins.win_amount, spins.cascades,
            spins.bonus_triggered, spins.duration, spins.start_frame, spins.end_frame,
            videos.video_path
     FROM spins
     LEFT JOIN videos ON videos.spin_id = spins.id
     WHERE spins.session_id = ?
     ORDER BY spins.spin_number ASC`,
    [sessionId],
  )

  return response.json(
    spins.map((spin) => ({
      ...spin,
      sessionId: spin.session_id,
      spinNumber: spin.spin_number,
      winAmount: spin.win_amount,
      bonus_triggered: Boolean(spin.bonus_triggered),
      bonusTriggered: Boolean(spin.bonus_triggered),
      startFrame: spin.start_frame,
      endFrame: spin.end_frame,
      videoPath: spin.video_path,
      video_url: spin.video_path ? `/${String(spin.video_path).replace(/\\/g, '/')}` : null,
      videoUrl: spin.video_path ? `/${String(spin.video_path).replace(/\\/g, '/')}` : null,
    })),
  )
})