import express from 'express'
import path from 'node:path'
import { getDatabase } from './lib/database.js'
import { RequestValidationError } from './lib/validation.js'
import { gamesRouter } from './routes/games.js'
import { sessionsRouter } from './routes/sessions.js'
import { spinsRouter } from './routes/spins.js'
import { uploadsRouter } from './routes/uploads.js'
import { seedDatabase } from './seed/seed.js'

// Origins that are allowed to call the API.
// Set ALLOWED_ORIGINS as a comma-separated list in your environment, e.g.:
//   ALLOWED_ORIGINS=https://BGGltd.github.io
// Defaults to allowing all origins if not set (useful during local dev).
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : null

function corsMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  const origin = req.headers.origin
  if (!ALLOWED_ORIGINS) {
    // Dev mode — allow everything
    res.setHeader('Access-Control-Allow-Origin', '*')
  } else if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') {
    res.sendStatus(204)
    return
  }
  next()
}

export async function createApp() {
  await getDatabase()
  await seedDatabase()

  const app = express()

  app.use(corsMiddleware)
  app.use(express.json())
  app.use('/storage', express.static(path.resolve(process.cwd(), 'storage')))

  app.get('/health', (_request, response) => {
    response.json({ status: 'ok' })
  })

  app.use('/games', gamesRouter)
  app.use('/sessions', sessionsRouter)
  app.use('/spins', spinsRouter)
  app.use(uploadsRouter)

  app.use((error: Error, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
    if (error instanceof RequestValidationError) {
      return response.status(error.statusCode).json({ error: error.message })
    }

    response.status(500).json({ error: error.message || 'Internal server error' })
  })

  return app
}