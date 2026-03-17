import { useEffect, useId, useMemo, useState } from 'react'
import { getUserEmail, setUserEmail } from '../lib/user'

type EmailGateProps = {
  isOpen: boolean
  onSignedIn: (email: string) => void
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())
}

export function EmailGate({ isOpen, onSignedIn }: EmailGateProps) {
  const emailId = useId()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)

  const storedEmail = useMemo(() => (typeof window === 'undefined' ? null : getUserEmail()), [])

  useEffect(() => {
    if (!isOpen) return
    setEmail(storedEmail ?? '')
    setError(null)
  }, [isOpen, storedEmail])

  if (!isOpen) return null

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const next = email.trim()

    if (!isValidEmail(next)) {
      setError('Please enter a valid email address.')
      return
    }

    setUserEmail(next)
    onSignedIn(next)
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-night/65 px-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-[2rem] border border-spruce/18 bg-[linear-gradient(140deg,rgba(253,253,253,0.98),rgba(185,255,156,0.22))] p-6 shadow-panel">
        <p className="text-xs uppercase tracking-[0.32em] text-spruce">Welcome</p>
        <h2 className="mt-3 font-display text-3xl text-ink">Enter your email to continue</h2>
        <p className="mt-2 text-sm text-ink/75">
          We’ll use this to sign any edits you make and to keep a page history of changes.
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor={emailId} className="block text-[11px] font-semibold uppercase tracking-[0.22em] text-spruce">
              Email address
            </label>
            <input
              id={emailId}
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@company.com"
              className="mt-2 w-full rounded-[1rem] border border-spruce/15 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-spruce/40"
            />
            {error ? <p className="mt-2 text-sm text-[#8d2034]">{error}</p> : null}
          </div>

          <div className="flex justify-end pt-2">
            <button type="submit" className="rounded-full bg-night px-5 py-2 text-sm font-semibold text-mist transition hover:bg-spruce">
              Continue
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
