import { NavLink, useNavigate } from 'react-router-dom'
import { useData } from '../context/DataContext'

export default function Sidebar() {
  const { saving } = useData()
  const navigate = useNavigate()

  async function handleLogout() {
    await fetch('/api/logout', { method: 'POST' }).catch(() => {})
    navigate('/login', { replace: true })
  }

  return (
    <aside className="w-56 shrink-0 flex flex-col h-full bg-surface border-r border-surface-border">
      {/* Brand */}
      <div className="px-4 h-14 flex items-center gap-2.5 border-b border-surface-border">
        <div className="w-7 h-7 rounded-md bg-accent flex items-center justify-center shrink-0">
          <CMIcon />
        </div>
        <span className="text-white font-medium text-sm tracking-tight truncate">
          CM Projects
        </span>
        {saving && (
          <span className="ml-auto text-white/20 text-[10px] shrink-0">saving…</span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin py-3 px-2">
        {/* Overview */}
        <SidebarLink to="/" end label="Overview" icon={<OverviewIcon />} />

        {/* Social Media */}
        <div className="mt-4 mb-1.5 px-2">
          <span className="text-white/25 text-[10px] font-semibold uppercase tracking-widest">
            Team
          </span>
        </div>
        <SidebarLink
          to="/social-media"
          label="Social Media"
          icon={<SocialIcon />}
        />
      </nav>

      {/* Footer */}
      <div className="px-2 pb-3 border-t border-surface-border pt-3">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/5 transition-colors text-sm"
        >
          <LogoutIcon />
          Sign out
        </button>
      </div>
    </aside>
  )
}

// ——— Sub-components ————————————————————————————————————————————————————————

function SidebarLink({
  to,
  label,
  icon,
  end,
}: {
  to: string
  label: string
  icon: React.ReactNode
  end?: boolean
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        [
          'flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm transition-colors',
          isActive
            ? 'bg-white/8 text-white'
            : 'text-white/50 hover:text-white/80 hover:bg-white/5',
        ].join(' ')
      }
    >
      {icon}
      {label}
    </NavLink>
  )
}

// ——— Icons ——————————————————————————————————————————————————————————————————

function CMIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
      <path d="M2 8C2 4.686 4.686 2 8 2C9.657 2 11.157 2.672 12.243 3.757" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <path d="M14 8C14 11.314 11.314 14 8 14C6.343 14 4.843 13.328 3.757 12.243" stroke="white" strokeWidth="2" strokeLinecap="round" />
      <circle cx="8" cy="8" r="2" fill="white" />
    </svg>
  )
}

function OverviewIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  )
}

function SocialIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
    </svg>
  )
}

function LogoutIcon() {
  return (
    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  )
}
