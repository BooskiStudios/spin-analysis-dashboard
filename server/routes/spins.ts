import { unlink } from 'node:fs/promises'
import path from 'node:path'
import { Router } from 'express'
import multer from 'multer'
import { getDatabase, sessionsStorageDir } from '../lib/database.js'
import { parseIdParam } from '../lib/validation.js'

const upload = multer({
  storage: multer.diskStorage({
    destination: (_request, _file, callback) => {
      callback(null, sessionsStorageDir)
    },
    filename: (request, file, callback) => {
      const extension = path.extname(file.originalname)
      callback(null, `spin-${request.params.spinId}-${Date.now()}${extension}`)
    },
  }),
})

export const spinsRouter = Router()

spinsRouter.post('/:spinId/video', upload.single('video'), async (request, response) => {
  const spinId = parseIdParam(request.params.spinId, 'spinId')

  if (!request.file) {
    return response.status(400).json({ error: 'Video file is required under the video field' })
  }

  const database = await getDatabase()
  const spin = await database.get('SELECT id FROM spins WHERE id = ?', [spinId])

  if (!spin) {
    return response.status(404).json({ error: 'Spin not found' })
  }

  const existingVideo = await database.get<{ video_path: string }>('SELECT video_path FROM videos WHERE spin_id = ?', [spinId])
  const relativePath = path.posix.join('storage', 'sessions', request.file.filename)

  await database.run(
    `INSERT INTO videos (spin_id, video_path) VALUES (?, ?)
     ON CONFLICT(spin_id) DO UPDATE SET video_path = excluded.video_path`,
    [spinId, relativePath],
  )

  if (existingVideo?.video_path) {
    const oldAbsolutePath = path.resolve(process.cwd(), existingVideo.video_path)

    if (oldAbsolutePath !== request.file.path) {
      await unlink(oldAbsolutePath).catch(() => undefined)
    }
  }

  return response.status(201).json({ spinId, videoPath: relativePath, videoUrl: `/${relativePath.replace(/\\/g, '/')}` })
})

spinsRouter.get('/:spinId', async (request, response) => {
  const spinId = parseIdParam(request.params.spinId, 'spinId')

  const database = await getDatabase()
  const spin = await database.get<{
    id: number
    session_id: number
    spin_number: number
    win_amount: number
    cascades: number
    bonus_triggered: number
    duration: number
    start_frame: number | null
    end_frame: number | null
  }>(
    `SELECT id, session_id, spin_number, win_amount, cascades, bonus_triggered, duration, start_frame, end_frame
     FROM spins WHERE id = ?`,
    [spinId],
  )

  if (!spin) {
    return response.status(404).json({ error: 'Spin not found' })
  }

  const events = await database.all(
    'SELECT id, spin_id, event_type, timestamp FROM events WHERE spin_id = ? ORDER BY timestamp ASC',
    [spinId],
  )
  const video = await database.get<{ video_path: string }>('SELECT video_path FROM videos WHERE spin_id = ?', [spinId])

  return response.json({
    ...spin,
    sessionId: spin.session_id,
    spinNumber: spin.spin_number,
    winAmount: spin.win_amount,
    bonus_triggered: Boolean(spin.bonus_triggered),
    bonusTriggered: Boolean(spin.bonus_triggered),
    startFrame: spin.start_frame,
    endFrame: spin.end_frame,
    events,
    video_path: video?.video_path ?? null,
    video_url: video?.video_path ? `/${video.video_path.replace(/\\/g, '/')}` : null,
    videoPath: video?.video_path ?? null,
    videoUrl: video?.video_path ? `/${video.video_path.replace(/\\/g, '/')}` : null,
  })
})