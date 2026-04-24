import { useEffect, useId, useState } from 'react'
import { setAuthToken } from '../lib/user'
import { resolveApiUrl } from '../lib/apiClient'

type LoginModalProps = {
  isOpen: boolean
  onLoggedIn: (username: string) => void
}

type AuthResponse = {
  token: string
  username: string
}

export function LoginModal({ isOpen, onLoggedIn }: LoginModalProps) {
  const usernameId = useId()
  const passwordId = useId()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isRegisterMode, setIsRegisterMode] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    setUsername('')
    setPassword('')
    setError(null)
    setIsLoading(false)
  }, [isOpen])

  if (!isOpen) return null

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedUsername = username.trim()
    const trimmedPassword = password.trim()

    if (!trimmedUsername || !trimmedPassword) {
      setError('Please enter both username and password.')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const endpoint = isRegisterMode ? '/auth/register' : '/auth/login'
      const response = await fetch(resolveApiUrl(endpoint), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: trimmedUsername,
          password: trimmedPassword,
        }),
      })

      const data = (await response.json()) as AuthResponse | { error: string }

      if (!response.ok) {
        setError('error' in data ? data.error : 'Authentication failed')
        return
      }

      const authData = data as AuthResponse
      setAuthToken(authData.token, authData.username)
      onLoggedIn(authData.username)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-night/65 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-[2rem] border border-spruce/18 bg-[linear-gradient(140deg,rgba(253,253,253,0.98),rgba(185,255,156,0.22))] p-6 shadow-panel">
        <p className="text-xs uppercase tracking-[0.32em] text-spruce">Welcome</p>
        <h2 className="mt-3 font-display text-3xl text-ink">
          {isRegisterMode ? 'Create an account' : 'Sign in to continue'}
        </h2>
        <p className="mt-2 text-sm text-ink/75">
          {isRegisterMode
            ? 'Create a new account to get started'
            : 'Sign in to access game data and analytics'}
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor={usernameId} className="block text-[11px] font-semibold uppercase tracking-[0.22em] text-spruce">
              Username
            </label>
            <input
              id={usernameId}
              type="text"
              autoComplete={isRegisterMode ? 'username' : 'username'}
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="your_username"
              disabled={isLoading}
              className="mt-2 w-full rounded-[1rem] border border-spruce/15 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-spruce/40 disabled:opacity-50"
            />
          </div>

          <div>
            <label htmlFor={passwordId} className="block text-[11px] font-semibold uppercase tracking-[0.22em] text-spruce">
              Password
            </label>
            <input
              id={passwordId}
              type="password"
              autoComplete={isRegisterMode ? 'new-password' : 'current-password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              disabled={isLoading}
              className="mt-2 w-full rounded-[1rem] border border-spruce/15 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-spruce/40 disabled:opacity-50"
            />
          </div>

          {error ? <p className="text-sm text-[#8d2034]">{error}</p> : null}

          <div className="flex justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setIsRegisterMode(!isRegisterMode)
                setError(null)
              }}
              disabled={isLoading}
              className="text-sm text-spruce underline transition hover:text-ink disabled:opacity-50"
            >
              {isRegisterMode ? 'Already have an account?' : "Don't have an account?"}
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="rounded-full bg-night px-5 py-2 text-sm font-semibold text-mist transition hover:bg-spruce disabled:opacity-50"
            >
              {isLoading ? 'Loading...' : isRegisterMode ? 'Create Account' : 'Sign In'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
