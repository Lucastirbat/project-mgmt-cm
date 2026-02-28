import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Dashboard() {
  const [loggingOut, setLoggingOut] = useState(false)
  const navigate = useNavigate()

  async function handleLogout() {
    setLoggingOut(true)
    try {
      await fetch('/api/logout', { method: 'POST' })
    } finally {
      navigate('/login', { replace: true })
    }
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Top nav */}
      <header className="border-b border-surface-border">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-accent flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
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
            <span className="text-white font-medium text-sm tracking-tight">
              Creative Motion PM
            </span>
          </div>

          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="text-white/40 hover:text-white/70 text-sm transition-colors disabled:opacity-30 flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            {loggingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-12 animate-fade-in">
        {/* Welcome */}
        <div className="mb-10">
          <h2 className="text-2xl font-semibold text-white tracking-tight">Projects</h2>
          <p className="text-white/40 text-sm mt-1">
            All client projects and workspaces live here.
          </p>
        </div>

        {/* Empty state — projects will be added here */}
        <div className="border border-surface-border border-dashed rounded-2xl p-16 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 rounded-xl bg-surface-card border border-surface-border flex items-center justify-center mb-4">
            <svg className="w-5 h-5 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
              />
            </svg>
          </div>
          <h3 className="text-white/70 font-medium text-sm">No projects yet</h3>
          <p className="text-white/30 text-xs mt-1 max-w-xs">
            Projects will appear here once they're set up. Each project is fully custom-tailored.
          </p>
          <button className="mt-5 px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium transition-colors">
            + New Project
          </button>
        </div>
      </main>
    </div>
  )
}
