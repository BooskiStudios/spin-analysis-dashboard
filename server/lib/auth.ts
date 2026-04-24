import express from 'express'
import { verifyToken, type AuthToken } from '../routes/auth.js'

declare global {
  namespace Express {
    interface Request {
      user?: AuthToken
    }
  }
}

export function authMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized: No token provided' })
  }

  const user = verifyToken(token)

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token' })
  }

  req.user = user
  next()
}
