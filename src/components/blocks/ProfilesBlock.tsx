import { useState } from 'react'
import type { Block, ProfileItem } from '../../data/schema'

interface Props {
  block: Block
  color: string
  onChange: (updated: Block) => void
}

export default function ProfilesBlock({ block, color, onChange }: Props) {
  const profiles = block.profiles ?? []
  const [expandedId, setExpandedId] = useState<string | null>(null)

  function addProfile() {
    const newProfile: ProfileItem = {
      id: `pf-${Date.now()}`,
      name: '',
      role: '',
      linkedinUrl: '',
      email: '',
      phone: '',
    }
    onChange({ ...block, profiles: [...profiles, newProfile] })
    setExpandedId(newProfile.id)
  }

  function updateProfile(id: string, field: keyof ProfileItem, value: string) {
    onChange({
      ...block,
      profiles: profiles.map((p) => (p.id === id ? { ...p, [field]: value } : p)),
    })
  }

  function deleteProfile(id: string) {
    onChange({ ...block, profiles: profiles.filter((p) => p.id !== id) })
    if (expandedId === id) setExpandedId(null)
  }

  function getInitials(name: string): string {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase()
  }

  return (
    <div className="space-y-2">
      {/* Summary count */}
      {profiles.length > 0 && (
        <div className="text-white/25 text-[11px] mb-3">
          {profiles.length} contact{profiles.length !== 1 ? 's' : ''}
        </div>
      )}

      {profiles.map((profile) => {
        const isExpanded = expandedId === profile.id
        return (
          <div
            key={profile.id}
            className="border border-surface-border rounded-xl overflow-hidden hover:border-white/15 transition-colors group/profile"
          >
            {/* Collapsed row */}
            <div
              className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none"
              onClick={() => setExpandedId(isExpanded ? null : profile.id)}
            >
              {/* Avatar */}
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-[11px] font-semibold"
                style={{
                  backgroundColor: `${color}20`,
                  color: color,
                }}
              >
                {profile.name ? getInitials(profile.name) : '?'}
              </div>

              {/* Name + role */}
              <div className="flex-1 min-w-0">
                <div className="text-sm text-white/80 truncate">
                  {profile.name || <span className="text-white/20 italic">No name</span>}
                </div>
                {profile.role && (
                  <div className="text-xs text-white/30 truncate">{profile.role}</div>
                )}
              </div>

              {/* Quick action icons */}
              <div className="flex items-center gap-1.5 shrink-0">
                {profile.linkedinUrl && (
                  <a
                    href={profile.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="text-white/20 hover:text-[#0A66C2] transition-colors p-1"
                    title="LinkedIn"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                    </svg>
                  </a>
                )}
                {profile.email && (
                  <a
                    href={`mailto:${profile.email}`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-white/20 hover:text-white/60 transition-colors p-1"
                    title={profile.email}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </a>
                )}
                {profile.phone && (
                  <a
                    href={`tel:${profile.phone}`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-white/20 hover:text-white/60 transition-colors p-1"
                    title={profile.phone}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </a>
                )}
              </div>

              {/* Expand chevron */}
              <svg
                className={`w-4 h-4 text-white/15 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>

            {/* Expanded edit form */}
            {isExpanded && (
              <div className="px-4 pb-4 pt-1 border-t border-surface-border bg-white/[0.01] space-y-3 animate-fade-in">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-white/20 mb-1 block">Name</label>
                    <input
                      value={profile.name}
                      onChange={(e) => updateProfile(profile.id, 'name', e.target.value)}
                      placeholder="Full name"
                      className="w-full bg-white/5 text-white/80 text-sm rounded-lg px-3 py-2 outline-none border border-transparent focus:border-white/10 transition-colors placeholder-white/15"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-white/20 mb-1 block">Role</label>
                    <input
                      value={profile.role ?? ''}
                      onChange={(e) => updateProfile(profile.id, 'role', e.target.value)}
                      placeholder="e.g. CEO, Investor, Partner"
                      className="w-full bg-white/5 text-white/80 text-sm rounded-lg px-3 py-2 outline-none border border-transparent focus:border-white/10 transition-colors placeholder-white/15"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] uppercase tracking-wider text-white/20 mb-1 block">LinkedIn URL</label>
                  <input
                    value={profile.linkedinUrl ?? ''}
                    onChange={(e) => updateProfile(profile.id, 'linkedinUrl', e.target.value)}
                    placeholder="https://linkedin.com/in/…"
                    className="w-full bg-white/5 text-white/80 text-sm rounded-lg px-3 py-2 outline-none border border-transparent focus:border-white/10 transition-colors placeholder-white/15 font-mono text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-white/20 mb-1 block">Email</label>
                    <input
                      value={profile.email ?? ''}
                      onChange={(e) => updateProfile(profile.id, 'email', e.target.value)}
                      placeholder="name@company.com"
                      className="w-full bg-white/5 text-white/80 text-sm rounded-lg px-3 py-2 outline-none border border-transparent focus:border-white/10 transition-colors placeholder-white/15"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-white/20 mb-1 block">Phone</label>
                    <input
                      value={profile.phone ?? ''}
                      onChange={(e) => updateProfile(profile.id, 'phone', e.target.value)}
                      placeholder="+40 …"
                      className="w-full bg-white/5 text-white/80 text-sm rounded-lg px-3 py-2 outline-none border border-transparent focus:border-white/10 transition-colors placeholder-white/15"
                    />
                  </div>
                </div>

                {/* Delete */}
                <div className="flex justify-end pt-1">
                  <button
                    onClick={() => deleteProfile(profile.id)}
                    className="text-white/20 hover:text-red-400/70 text-xs transition-colors flex items-center gap-1"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Remove
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}

      {/* Add contact button */}
      <button
        onClick={addProfile}
        className="flex items-center gap-2 text-white/25 hover:text-white/50 text-xs transition-colors mt-1 py-1"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add contact
      </button>
    </div>
  )
}
