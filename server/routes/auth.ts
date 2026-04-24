import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { getDatabase } from '../lib/database.js'

const router = express.Router()

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this-in-production'

export type AuthToken = {
  userId: number
  username: string
}

export function verifyToken(token: string): AuthToken | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthToken
    return decoded
  } catch {
    return null
  }
}

export function generateToken(userId: number, username: string): string {
  return jwt.sign({ userId, username }, JWT_SECRET, { expiresIn: '30d' })
}

router.post('/register', async (req: express.Request, res: express.Response) => {
  try {
    const { username, password } = req.body

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' })
    }

    if (username.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters' })
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' })
    }

    const database = await getDatabase()
    const existing = await database.get('SELECT id FROM users WHERE username = ?', username)

    if (existing) {
      return res.status(409).json({ error: 'Username already exists' })
    }

    const passwordHash = await bcrypt.hash(password, 10)
    const result = await database.run(
      'INSERT INTO users (username, password_hash) VALUES (?, ?)',
      username,
      passwordHash,
    )

    const token = generateToken(result.lastID as number, username)
    res.json({ token, username })
  } catch (error) {
    console.error('Register error:', error)
    res.status(500).json({ error: 'Registration failed' })
  }
})

router.post('/login', async (req: express.Request, res: express.Response) => {
  try {
    const { username, password } = req.body

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' })
    }

    const database = await getDatabase()
    const user = await database.get('SELECT id, username, password_hash FROM users WHERE username = ?', username)

    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' })
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash as string)

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid username or password' })
    }

    const token = generateToken(user.id as number, user.username as string)
    res.json({ token, username: user.username })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ error: 'Login failed' })
  }
})

router.post('/verify', (req: express.Request, res: express.Response) => {
  try {
    const authHeader = req.headers.authorization
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

    if (!token) {
      return res.status(401).json({ error: 'No token provided' })
    }

    const decoded = verifyToken(token)

    if (!decoded) {
      return res.status(401).json({ error: 'Invalid token' })
    }

    res.json({ valid: true, user: decoded })
  } catch (error) {
    console.error('Verify error:', error)
    res.status(500).json({ error: 'Verification failed' })
  }
})

export const authRouter = router
