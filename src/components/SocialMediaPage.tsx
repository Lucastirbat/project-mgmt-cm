import { useData } from '../context/DataContext'
import type { AppData, SocialPlatform } from '../data/schema'

const PLATFORM_COLORS: Record<string, string> = {
  'LinkedIn': '#0077b5',
  'Instagram': '#e1306c',
  'X / Twitter': '#000000',
  'TikTok': '#ff0050',
  'YouTube': '#ff0000',
  'Facebook': '#1877f2',
}

export default function SocialMediaPage() {
  const { data, updateData } = useData()
  const { socialMedia } = data

  function updateSM(patch: Partial<typeof socialMedia>) {
    updateData({ ...data, socialMedia: { ...socialMedia, ...patch } })
  }

  function updatePlatform(id: string, field: keyof SocialPlatform, value: string) {
    updateData({
      ...data,
      socialMedia: {
        ...socialMedia,
        platforms: socialMedia.platforms.map((p) =>
          p.id === id ? { ...p, [field]: value } : p,
        ),
      },
    })
  }

  function addPlatform() {
    const newPlatform: SocialPlatform = {
      id: `p-${Date.now()}`,
      companyId: data.companies[0]?.id ?? '',
      platform: 'Platform',
      handle: '',
      status: 'planned',
    }
    updateData({
      ...data,
      socialMedia: {
        ...socialMedia,
        platforms: [...socialMedia.platforms, newPlatform],
      },
    })
  }

  function deletePlatform(id: string) {
    updateData({
      ...data,
      socialMedia: {
        ...socialMedia,
        platforms: socialMedia.platforms.filter((p) => p.id !== id),
      },
    })
  }

  // Group platforms by company
  const byCompany = data.companies.map((company) => ({
    company,
    platforms: socialMedia.platforms.filter((p) => p.companyId === company.id),
  }))

  return (
    <div className="p-8 max-w-4xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Social Media</h1>
          <p className="text-white/40 text-sm mt-1">
            Content coverage across all companies.
          </p>
        </div>
        {socialMedia.notionUrl && (
          <a
            href={socialMedia.notionUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-surface-border text-white/50 hover:text-white text-sm transition-colors"
          >
            <NotionIcon />
            Open in Notion
          </a>
        )}
      </div>

      {/* Manager card */}
      <div className="border border-surface-border rounded-2xl p-5 mb-6">
        <p className="text-white/30 text-xs uppercase tracking-widest font-medium mb-3">Manager</p>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex-1">
            <label className="text-white/30 text-xs block mb-1">Name</label>
            <input
              value={socialMedia.managerName}
              onChange={(e) => updateSM({ managerName: e.target.value })}
              placeholder="Manager name…"
              className="text-white text-sm bg-transparent outline-none border-b border-transparent focus:border-white/10 transition-colors placeholder-white/15 w-full py-0.5"
            />
          </div>
          <div className="flex-1">
            <label className="text-white/30 text-xs block mb-1">Notion page URL</label>
            <div className="flex items-center gap-2">
              <input
                value={socialMedia.notionUrl}
                onChange={(e) => updateSM({ notionUrl: e.target.value })}
                placeholder="https://notion.so/…"
                className="text-white/50 text-sm bg-transparent outline-none border-b border-transparent focus:border-white/10 transition-colors placeholder-white/15 w-full py-0.5 font-mono text-xs"
              />
              {socialMedia.notionUrl && (
                <a
                  href={socialMedia.notionUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white/30 hover:text-white/60 transition-colors shrink-0"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Platforms by company */}
      <div className="space-y-4 mb-6">
        {byCompany.map(({ company, platforms }) => (
          <div key={company.id} className="border border-surface-border rounded-2xl overflow-hidden">
            <div
              className="flex items-center gap-3 px-5 py-3 border-b border-surface-border"
              style={{ background: `linear-gradient(to right, ${company.color}10, transparent)` }}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: company.color }}
              />
              <span className="text-white/70 text-sm font-medium">{company.name}</span>
              <span className="text-white/25 text-xs">
                {platforms.filter((p) => p.status === 'active').length} active
              </span>
            </div>

            {platforms.length === 0 ? (
              <div className="px-5 py-4 text-white/20 text-xs">No platforms added yet.</div>
            ) : (
              <div className="divide-y divide-surface-border">
                {platforms.map((platform) => (
                  <PlatformRow
                    key={platform.id}
                    platform={platform}
                    companies={data.companies}
                    onChange={(field, value) => updatePlatform(platform.id, field, value)}
                    onDelete={() => deletePlatform(platform.id)}
                  />
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Unassigned platforms */}
        {(() => {
          const unassigned = socialMedia.platforms.filter(
            (p) => !data.companies.find((c) => c.id === p.companyId),
          )
          if (!unassigned.length) return null
          return (
            <div className="border border-surface-border rounded-2xl overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-3 border-b border-surface-border">
                <span className="text-white/40 text-sm font-medium">Unassigned</span>
              </div>
              <div className="divide-y divide-surface-border">
                {unassigned.map((platform) => (
                  <PlatformRow
                    key={platform.id}
                    platform={platform}
                    companies={data.companies}
                    onChange={(field, value) => updatePlatform(platform.id, field, value)}
                    onDelete={() => deletePlatform(platform.id)}
                  />
                ))}
              </div>
            </div>
          )
        })()}
      </div>

      <button
        onClick={addPlatform}
        className="flex items-center gap-2 text-white/25 hover:text-white/60 text-sm transition-colors py-2 px-3 rounded-lg hover:bg-white/5"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add platform
      </button>
    </div>
  )
}

// ─── Platform Row ─────────────────────────────────────────────────────────────

function PlatformRow({
  platform,
  companies,
  onChange,
  onDelete,
}: {
  platform: SocialPlatform
  companies: AppData['companies']
  onChange: (field: keyof SocialPlatform, value: string) => void
  onDelete: () => void
}) {
  const color = PLATFORM_COLORS[platform.platform] ?? '#6366f1'

  return (
    <div className="flex items-center gap-3 px-5 py-3 group/row hover:bg-white/[0.01]">
      {/* Platform name */}
      <div
        className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 text-[10px] font-bold text-white"
        style={{ backgroundColor: color }}
      >
        {platform.platform.charAt(0)}
      </div>
      <input
        value={platform.platform}
        onChange={(e) => onChange('platform', e.target.value)}
        className="w-28 text-white/70 text-sm bg-transparent outline-none border-b border-transparent focus:border-white/10 transition-colors placeholder-white/15 py-0.5 shrink-0"
        placeholder="Platform"
      />

      {/* Handle */}
      <input
        value={platform.handle}
        onChange={(e) => onChange('handle', e.target.value)}
        placeholder="@handle"
        className="flex-1 text-white/40 text-sm bg-transparent outline-none border-b border-transparent focus:border-white/10 transition-colors placeholder-white/15 py-0.5 font-mono text-xs"
      />

      {/* Company select */}
      <select
        value={platform.companyId}
        onChange={(e) => onChange('companyId', e.target.value)}
        className="text-white/30 text-xs bg-surface border border-surface-border rounded-lg px-2 py-1 outline-none shrink-0"
      >
        {companies.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>

      {/* Status */}
      <select
        value={platform.status}
        onChange={(e) => onChange('status', e.target.value)}
        className="text-white/30 text-xs bg-surface border border-surface-border rounded-lg px-2 py-1 outline-none shrink-0"
      >
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
        <option value="planned">Planned</option>
      </select>

      <button
        onClick={onDelete}
        className="opacity-0 group-hover/row:opacity-100 transition-opacity text-white/20 hover:text-white/50"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}

function NotionIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.981-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.887l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952L12.21 19s0 .84-1.168.84l-3.222.186c-.093-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.456-.233 4.764 7.279v-6.44l-1.215-.139c-.093-.514.28-.887.747-.933zM1.936 1.035l13.31-.98c1.634-.14 2.055-.047 3.082.7l4.249 2.986c.7.513.934.653.934 1.213v16.378c0 1.026-.373 1.634-1.68 1.726l-15.458.934c-.98.047-1.448-.093-1.962-.747l-3.129-4.06c-.56-.747-.793-1.306-.793-1.96V2.667c0-.839.374-1.54 1.447-1.632z" />
    </svg>
  )
}
