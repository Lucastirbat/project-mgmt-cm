import { useState, useRef, useEffect, type FormEvent, type KeyboardEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

export default function LoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!password.trim()) return

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      if (res.ok) {
        const redirect = searchParams.get('redirect') || '/'
        navigate(redirect, { replace: true })
      } else {
        const data = await res.json().catch(() => ({}))
        setError((data as { error?: string }).error || 'Incorrect password. Try again.')
        setPassword('')
        inputRef.current?.focus()
      }
    } catch {
      setError('Connection error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      handleSubmit(e as unknown as FormEvent)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface p-4">
      {/* Ambient glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-accent/5 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-sm animate-slide-up">
        {/* Brand */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-5">
            <CMLogoMark />
            <span className="text-white font-semibold text-lg tracking-tight">
              Creative Motion
            </span>
          </div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">
            Project Management
          </h1>
          <p className="text-sm text-white/40 mt-1.5">
            Enter your password to continue
          </p>
        </div>

        {/* Card */}
        <div className="bg-surface-card border border-surface-border rounded-2xl p-7 shadow-2xl">
          <form onSubmit={handleSubmit} noValidate>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="password"
                  className="block text-xs font-medium text-white/50 uppercase tracking-wider mb-2"
                >
                  Password
                </label>
                <input
                  ref={inputRef}
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="••••••••••••"
                  disabled={loading}
                  className={[
                    'w-full bg-surface border rounded-xl px-4 py-3 text-white placeholder-white/20',
                    'text-sm font-mono tracking-widest',
                    'outline-none transition-all duration-200',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    error
                      ? 'border-red-500/50 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                      : 'border-surface-border focus:border-accent focus:ring-2 focus:ring-accent/20',
                  ].join(' ')}
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-400 text-sm animate-fade-in">
                  <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !password.trim()}
                className={[
                  'w-full py-3 px-4 rounded-xl text-sm font-medium transition-all duration-200',
                  'bg-accent hover:bg-accent-hover text-white',
                  'focus:outline-none focus:ring-2 focus:ring-accent/50 focus:ring-offset-2 focus:ring-offset-surface-card',
                  'disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-accent',
                  'active:scale-[0.98]',
                ].join(' ')}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Spinner />
                    Signing in…
                  </span>
                ) : (
                  'Sign In'
                )}
              </button>
            </div>
          </form>
        </div>

        <p className="text-center text-white/20 text-xs mt-6">
          projects.creativemotion.io
        </p>
      </div>
    </div>
  )
}

function CMLogoMark() {
  return (
    <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M2 8C2 4.686 4.686 2 8 2C9.657 2 11.157 2.672 12.243 3.757"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M14 8C14 11.314 11.314 14 8 14C6.343 14 4.843 13.328 3.757 12.243"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="8" cy="8" r="2" fill="white" />
      </svg>
    </div>
  )
}

function Spinner() {
  return (
    <svg
      className="animate-spin h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  )
}
