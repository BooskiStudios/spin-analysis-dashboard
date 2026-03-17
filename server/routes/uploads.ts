import path from 'node:path'
import { Router } from 'express'
import multer from 'multer'
import { getDatabase, uploadsStorageDir } from '../lib/database.js'
import { processUploadedSessionVideo, type UploadedSessionMetadata } from '../lib/sessionVideoProcessor.js'
import { RequestValidationError, parseOptionalNumber } from '../lib/validation.js'

const supportedExtensions = new Set(['.mp4', '.mov', '.mkv'])

const upload = multer({
  storage: multer.diskStorage({
    destination: (_request, _file, callback) => {
      callback(null, uploadsStorageDir)
    },
    filename: (_request, file, callback) => {
      const extension = path.extname(file.originalname).toLowerCase()
      callback(null, `session-upload-${Date.now()}${extension}`)
    },
  }),
  fileFilter: (_request, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase()

    if (supportedExtensions.has(extension)) {
      callback(null, true)
      return
    }

    callback(new RequestValidationError('Only mp4, mov, and mkv uploads are supported'))
  },
})

export const uploadsRouter = Router()

function parseUploadedSessionMetadata(rawMetadata: unknown) {
  if (typeof rawMetadata !== 'string' || rawMetadata.trim().length === 0) {
    return undefined
  }

  let parsedMetadata: unknown

  try {
    parsedMetadata = JSON.parse(rawMetadata)
  } catch {
    throw new RequestValidationError('Upload metadata must be valid JSON')
  }

  if (!parsedMetadata || typeof parsedMetadata !== 'object') {
    throw new RequestValidationError('Upload metadata must be a JSON object')
  }

  return parsedMetadata as UploadedSessionMetadata
}

async function getOrCreateUploadsGame(gameId?: number) {
  const database = await getDatabase()

  if (gameId !== undefined) {
    const existingGame = await database.get<{ id: number }>('SELECT id FROM games WHERE id = ?', [gameId])

    if (!existingGame) {
      throw new RequestValidationError('Game not found', 404)
    }

    return gameId
  }

  const uploadedGame = await database.get<{ id: number }>(
    'SELECT id FROM games WHERE name = ? AND provider = ?',
    ['Uploaded Session Videos', 'User Upload'],
  )

  if (uploadedGame) {
    return uploadedGame.id
  }

  const result = await database.run('INSERT INTO games (name, provider) VALUES (?, ?)', ['Uploaded Session Videos', 'User Upload'])
  return Number(result.lastID)
}

uploadsRouter.post('/upload-session-video', upload.single('video'), async (request, response) => {
  if (!request.file) {
    return response.status(400).json({ error: 'Video file is required under the video field' })
  }

  const requestedGameId = request.body?.gameId === undefined ? undefined : parseOptionalNumber(Number(request.body.gameId), 'gameId', 0)
  const gameId = await getOrCreateUploadsGame(requestedGameId && requestedGameId > 0 ? requestedGameId : undefined)
  const database = await getDatabase()
  const metadata = parseUploadedSessionMetadata(request.body?.metadata)

  const activeUpload = await database.get<{ id: number }>(
    `SELECT id
     FROM sessions
     WHERE source_video_path IS NOT NULL
       AND processing_status IN ('queued', 'processing')
     ORDER BY id DESC
     LIMIT 1`,
  )

  if (activeUpload) {
    throw new RequestValidationError('Another uploaded session is already being processed. Wait for it to finish before starting a new upload.', 409)
  }

  const relativeSourceVideoPath = path.posix.join('storage', 'uploads', request.file.filename)

  const result = await database.run(
    `INSERT INTO sessions (game_id, total_spins, rtp, created_at, source_video_path, processing_status)
     VALUES (?, 0, 0, CURRENT_TIMESTAMP, ?, ?)`,
    [gameId, relativeSourceVideoPath, 'queued'],
  )

  const sessionId = Number(result.lastID)
  response.status(201).json({ sessionId })

  void processUploadedSessionVideo(sessionId, request.file.path, metadata).catch((error) => {
    console.error(`Failed processing uploaded session ${sessionId}:`, error)
  })
})