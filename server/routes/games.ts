import { Router } from 'express'
import { getDatabase } from '../lib/database.js'
import { parseIdParam } from '../lib/validation.js'
import { parseRequiredString } from '../lib/validation.js'

export const gamesRouter = Router()

function parseOptionalString(value: unknown) {
  return typeof value === 'string' ? value.trim() : null
}

gamesRouter.post('/', async (request, response) => {
  const name = parseRequiredString(request.body?.name, 'name')
  const provider = parseRequiredString(request.body?.provider, 'provider')
  const gameType = typeof request.body?.gameType === 'string' ? request.body.gameType.trim() : null
  const assignedRtp = typeof request.body?.assignedRtp === 'number' ? request.body.assignedRtp : null

  const database = await getDatabase()
  const result = await database.run('INSERT INTO games (name, provider, game_type, assigned_rtp) VALUES (?, ?, ?, ?)', [
    name,
    provider,
    gameType,
    assignedRtp,
  ])
  const game = await database.get(
    'SELECT id, name, provider, game_type, assigned_rtp FROM games WHERE id = ?',
    [result.lastID],
  )

  return response.status(201).json(game)
})

gamesRouter.get('/', async (_request, response) => {
  const database = await getDatabase()
  const games = await database.all(
    `SELECT games.id, games.name, games.provider, games.game_type, games.assigned_rtp, COUNT(sessions.id) AS total_sessions
     FROM games
     LEFT JOIN sessions ON sessions.game_id = games.id
     GROUP BY games.id, games.name, games.provider, games.game_type, games.assigned_rtp
     ORDER BY games.name ASC`,
  )

  return response.json(games)
})

gamesRouter.put('/:gameId', async (request, response) => {
  const gameId = parseIdParam(request.params.gameId, 'gameId')
  const name = parseRequiredString(request.body?.name, 'name')
  const provider = parseRequiredString(request.body?.provider, 'provider')
  const gameType = typeof request.body?.gameType === 'string' ? request.body.gameType.trim() : null
  const assignedRtp = typeof request.body?.assignedRtp === 'number' ? request.body.assignedRtp : null

  const database = await getDatabase()
  const existingGame = await database.get('SELECT id FROM games WHERE id = ?', [gameId])

  if (!existingGame) {
    return response.status(404).json({ error: 'Game not found' })
  }

  await database.run('UPDATE games SET name = ?, provider = ?, game_type = ?, assigned_rtp = ? WHERE id = ?', [
    name,
    provider,
    gameType,
    assignedRtp,
    gameId,
  ])
  const updatedGame = await database.get(
    `SELECT games.id, games.name, games.provider, games.game_type, games.assigned_rtp, COUNT(sessions.id) AS total_sessions
     FROM games
     LEFT JOIN sessions ON sessions.game_id = games.id
     WHERE games.id = ?
     GROUP BY games.id, games.name, games.provider, games.game_type, games.assigned_rtp`,
    [gameId],
  )

  return response.json(updatedGame)
})

gamesRouter.get('/:gameId/base-breakdown', async (request, response) => {
  const gameId = parseIdParam(request.params.gameId, 'gameId')
  const database = await getDatabase()

  const existingGame = await database.get('SELECT id FROM games WHERE id = ?', [gameId])
  if (!existingGame) {
    return response.status(404).json({ error: 'Game not found' })
  }

  const row = await database.get<{
    game_id: number
    breakdown_json: string
    updated_at: string
    updated_by_email: string | null
  }>('SELECT game_id, breakdown_json, updated_at, updated_by_email FROM game_base_breakdowns WHERE game_id = ?', [gameId])

  if (!row) {
    return response.json({ gameId, breakdown: null, updatedAt: null, updatedByEmail: null })
  }

  return response.json({
    gameId: row.game_id,
    breakdown: JSON.parse(row.breakdown_json),
    updatedAt: row.updated_at,
    updatedByEmail: row.updated_by_email,
  })
})

gamesRouter.put('/:gameId/base-breakdown', async (request, response) => {
  const gameId = parseIdParam(request.params.gameId, 'gameId')
  const breakdown = request.body?.breakdown
  const userEmail = parseOptionalString(request.body?.userEmail)

  if (breakdown == null) {
    return response.status(400).json({ error: 'breakdown is required' })
  }

  const database = await getDatabase()
  const existingGame = await database.get('SELECT id FROM games WHERE id = ?', [gameId])
  if (!existingGame) {
    return response.status(404).json({ error: 'Game not found' })
  }

  const json = JSON.stringify(breakdown)
  await database.run(
    `INSERT INTO game_base_breakdowns (game_id, breakdown_json, updated_at, updated_by_email)
     VALUES (?, ?, CURRENT_TIMESTAMP, ?)
     ON CONFLICT(game_id) DO UPDATE SET breakdown_json = excluded.breakdown_json, updated_at = CURRENT_TIMESTAMP, updated_by_email = excluded.updated_by_email`,
    [gameId, json, userEmail],
  )

  const row = await database.get<{ updated_at: string; updated_by_email: string | null }>(
    'SELECT updated_at, updated_by_email FROM game_base_breakdowns WHERE game_id = ?',
    [gameId],
  )

  return response.json({ gameId, breakdown, updatedAt: row?.updated_at ?? null, updatedByEmail: row?.updated_by_email ?? null })
})

gamesRouter.get('/:gameId/bonus-breakdown', async (request, response) => {
  const gameId = parseIdParam(request.params.gameId, 'gameId')
  const database = await getDatabase()

  const existingGame = await database.get('SELECT id FROM games WHERE id = ?', [gameId])
  if (!existingGame) {
    return response.status(404).json({ error: 'Game not found' })
  }

  const row = await database.get<{
    game_id: number
    breakdown_json: string
    updated_at: string
    updated_by_email: string | null
  }>('SELECT game_id, breakdown_json, updated_at, updated_by_email FROM game_bonus_breakdowns WHERE game_id = ?', [gameId])

  if (!row) {
    return response.json({ gameId, breakdown: null, updatedAt: null, updatedByEmail: null })
  }

  return response.json({
    gameId: row.game_id,
    breakdown: JSON.parse(row.breakdown_json),
    updatedAt: row.updated_at,
    updatedByEmail: row.updated_by_email,
  })
})

gamesRouter.put('/:gameId/bonus-breakdown', async (request, response) => {
  const gameId = parseIdParam(request.params.gameId, 'gameId')
  const breakdown = request.body?.breakdown
  const userEmail = parseOptionalString(request.body?.userEmail)

  if (breakdown == null) {
    return response.status(400).json({ error: 'breakdown is required' })
  }

  const database = await getDatabase()
  const existingGame = await database.get('SELECT id FROM games WHERE id = ?', [gameId])
  if (!existingGame) {
    return response.status(404).json({ error: 'Game not found' })
  }

  const json = JSON.stringify(breakdown)
  await database.run(
    `INSERT INTO game_bonus_breakdowns (game_id, breakdown_json, updated_at, updated_by_email)
     VALUES (?, ?, CURRENT_TIMESTAMP, ?)
     ON CONFLICT(game_id) DO UPDATE SET breakdown_json = excluded.breakdown_json, updated_at = CURRENT_TIMESTAMP, updated_by_email = excluded.updated_by_email`,
    [gameId, json, userEmail],
  )

  const row = await database.get<{ updated_at: string; updated_by_email: string | null }>(
    'SELECT updated_at, updated_by_email FROM game_bonus_breakdowns WHERE game_id = ?',
    [gameId],
  )

  return response.json({ gameId, breakdown, updatedAt: row?.updated_at ?? null, updatedByEmail: row?.updated_by_email ?? null })
})