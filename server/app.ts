import express from 'express'
import path from 'node:path'
import { getDatabase } from './lib/database.js'
import { RequestValidationError } from './lib/validation.js'
import { gamesRouter } from './routes/games.js'
import { sessionsRouter } from './routes/sessions.js'
import { spinsRouter } from './routes/spins.js'
import { uploadsRouter } from './routes/uploads.js'
import { seedDatabase } from './seed/seed.js'

export async function createApp() {
  await getDatabase()
  await seedDatabase()

  const app = express()

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