import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '../context/DataContext'
import type { Project, AppData, TaskItem } from '../data/schema'

const statusColor: Record<string, string> = {
  active: '#10b981',
  paused: '#f59e0b',
  planning: '#6366f1',
  done: '#6b7280',
}

const statusLabel: Record<string, string> = {
  active: 'Active',
  paused: 'Paused',
  planning: 'Planning',
  done: 'Done',
}

const priorityStyle: Record<string, { bg: string; text: string }> = {
  high: { bg: 'rgba(239,68,68,0.12)', text: '#f87171' },
  medium: { bg: 'rgba(234,179,8,0.12)', text: '#facc15' },
  low: { bg: 'rgba(148,163,184,0.10)', text: '#94a3b8' },
}

const MAX_TASK_PREVIEW = 3

const TODAY_ISO = new Date().toISOString().slice(0, 10)

function deadlineColor(deadline?: string): string {
  if (!deadline) return 'rgba(255,255,255,0.45)'
  const parsed = new Date(deadline)
  if (isNaN(parsed.getTime())) return 'rgba(255,255,255,0.45)'
  const iso = parsed.toISOString().slice(0, 10)
  if (iso < TODAY_ISO) return '#f87171'
  if (iso <= new Date(Date.now() + 7 * 86400_000).toISOString().slice(0, 10)) return '#fbbf24'
  return 'rgba(255,255,255,0.45)'
}

type SortMode = 'company' | 'priority' | 'status'

export default function Overview() {
  const { data, updateData } = useData()
  const [showDropdown, setShowDropdown] = useState(false)
  const [sortMode, setSortMode] = useState<SortMode>('status')
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    if (showDropdown) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showDropdown])

  function addProjectToCompany(companyId: string) {
    const newProject: Project = {
      id: `project-${Date.now()}`,
      name: 'New Project',
      status: 'planning',
      priority: 'medium',
      description: 'Add a description\u2026',
      blocks: [
        {
          id: `b-${Date.now()}`,
          type: 'tasks',
          title: 'Tasks',
          tasks: [],
        },
      ],
      updatedAt: new Date().toISOString(),
    }
    const next: AppData = {
      ...data,
      companies: data.companies.map((c) =>
        c.id === companyId ? { ...c, projects: [...c.projects, newProject] } : c,
      ),
    }
    updateData(next)
    setShowDropdown(false)
  }

  // Flatten all projects with their parent company info
  const allProjects = data.companies.flatMap((company) =>
    company.projects.map((project) => ({
      project,
      company: {
        id: company.id,
        name: company.name,
        color: company.color,
        emoji: company.emoji,
        logoUrl: company.logoUrl,
      },
    }))
  )

  // Sort orders
  const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 }
  const statusOrder: Record<string, number> = { active: 0, planning: 1, paused: 2, done: 3 }

  // Build a company order map based on data.companies array order
  const companyOrder: Record<string, number> = {}
  data.companies.forEach((c, i) => { companyOrder[c.id] = i })

  allProjects.sort((a, b) => {
    if (sortMode === 'company') {
      const ca = companyOrder[a.company.id] ?? 99
      const cb = companyOrder[b.company.id] ?? 99
      if (ca !== cb) return ca - cb
      // Within same company, sort by priority then name
      const pa = priorityOrder[a.project.priority] ?? 9
      const pb = priorityOrder[b.project.priority] ?? 9
      if (pa !== pb) return pa - pb
      return a.project.name.localeCompare(b.project.name)
    }

    if (sortMode === 'priority') {
      const pa = priorityOrder[a.project.priority] ?? 9
      const pb = priorityOrder[b.project.priority] ?? 9
      if (pa !== pb) return pa - pb
      const sa = statusOrder[a.project.status] ?? 9
      const sb = statusOrder[b.project.status] ?? 9
      if (sa !== sb) return sa - sb
      return a.project.name.localeCompare(b.project.name)
    }

    // Default: status
    const sa = statusOrder[a.project.status] ?? 9
    const sb = statusOrder[b.project.status] ?? 9
    if (sa !== sb) return sa - sb
    const pa = priorityOrder[a.project.priority] ?? 9
    const pb = priorityOrder[b.project.priority] ?? 9
    if (pa !== pb) return pa - pb
    return a.project.name.localeCompare(b.project.name)
  })

  // Count tasks
  function getTaskStats(project: Project) {
    let total = 0
    let done = 0
    for (const block of project.blocks) {
      if (block.tasks) {
        total += block.tasks.length
        done += block.tasks.filter((t) => t.done).length
      }
    }
    return { total, done }
  }

  // Get preview tasks: incomplete first, then completed, up to MAX_TASK_PREVIEW
  function getPreviewTasks(project: Project): { tasks: TaskItem[]; remaining: number } {
    const allTasks: TaskItem[] = []
    for (const block of project.blocks) {
      if (block.tasks) {
        allTasks.push(...block.tasks)
      }
    }
    // Sort: incomplete first, then completed
    const sorted = [
      ...allTasks.filter((t) => !t.done),
      ...allTasks.filter((t) => t.done),
    ]
    const preview = sorted.slice(0, MAX_TASK_PREVIEW)
    const remaining = sorted.length - preview.length
    return { tasks: preview, remaining }
  }

  const sortButtons: { mode: SortMode; label: string; icon: JSX.Element }[] = [
    {
      mode: 'company',
      label: 'Company',
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      ),
    },
    {
      mode: 'priority',
      label: 'Priority',
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
        </svg>
      ),
    },
    {
      mode: 'status',
      label: 'Status',
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ]

  return (
    <div className="p-8 max-w-6xl mx-auto animate-fade-in">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Overview</h1>
          <p className="text-white/60 text-sm mt-1">
            {allProjects.length} projects across {data.companies.length} companies
          </p>
        </div>

        {/* Add Project Button */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-sm transition-colors border border-surface-border"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Project
          </button>

          {showDropdown && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-surface-card border border-surface-border rounded-xl shadow-xl z-50 py-1 overflow-hidden">
              <p className="text-white/50 text-[10px] uppercase tracking-wider font-medium px-3 py-2">Select company</p>
              {data.companies.map((company) => (
                <button
                  key={company.id}
                  onClick={() => addProjectToCompany(company.id)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-white/5 transition-colors text-left"
                >
                  <div
                    className="w-6 h-6 rounded-md flex items-center justify-center text-xs overflow-hidden shrink-0"
                    style={{ backgroundColor: `${company.color}20`, border: `1px solid ${company.color}30` }}
                  >
                    {company.logoUrl ? (
                      <img src={company.logoUrl} alt="" className="w-full h-full object-contain p-0.5" />
                    ) : (
                      company.emoji
                    )}
                  </div>
                  <span className="text-white/80 text-sm">{company.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sort buttons */}
      <div className="flex items-center gap-2 mb-5">
        <span className="text-white/40 text-xs font-medium mr-1">Sort by</span>
        {sortButtons.map(({ mode, label, icon }) => (
          <button
            key={mode}
            onClick={() => setSortMode(mode)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
              sortMode === mode
                ? 'bg-white/10 text-white border-white/20'
                : 'bg-white/[0.03] text-white/50 border-surface-border hover:bg-white/[0.06] hover:text-white/70'
            }`}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      {/* Projects grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {allProjects.map(({ project, company }) => {
          const { total, done } = getTaskStats(project)
          const { tasks: previewTasks, remaining } = getPreviewTasks(project)
          const ps = priorityStyle[project.priority] ?? priorityStyle.low
          const sc = statusColor[project.status] ?? '#6b7280'
          const sl = statusLabel[project.status] ?? project.status

          return (
            <Link
              key={project.id}
              to={`/${company.id}/${project.id}`}
              className="block border border-surface-border rounded-2xl p-5 hover:border-white/20 transition-all hover:bg-white/[0.02] group"
            >
              {/* Company badge */}
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="w-5 h-5 rounded-md flex items-center justify-center text-xs overflow-hidden shrink-0"
                  style={{ backgroundColor: `${company.color}20`, border: `1px solid ${company.color}30` }}
                >
                  {company.logoUrl ? (
                    <img src={company.logoUrl} alt="" className="w-full h-full object-contain p-0.5" />
                  ) : (
                    company.emoji
                  )}
                </div>
                <span className="text-white/50 text-xs truncate">{company.name}</span>
              </div>

              {/* Project name */}
              <h3 className="text-white font-medium text-sm mb-1 group-hover:text-white/90 transition-colors">
                {project.name}
              </h3>

              {/* Description */}
              {project.description && project.description !== 'Add a description\u2026' && (
                <p className="text-white/50 text-xs line-clamp-2 mb-3">{project.description}</p>
              )}

              {/* Status + Priority + Tasks */}
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                {/* Status pill */}
                <span className="flex items-center gap-1.5 text-[10px] font-medium px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: `${sc}18`, color: sc }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: sc }} />
                  {sl}
                </span>

                {/* Priority pill */}
                <span
                  className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: ps.bg, color: ps.text }}
                >
                  {project.priority}
                </span>

                {/* Owner */}
                {project.owner && (
                  <span className="text-[10px] text-white/45 flex items-center gap-1">
                    <span>👤</span>
                    {project.owner}
                  </span>
                )}

                {/* Deadline */}
                {project.deadline && (
                  <span
                    className="text-[10px] flex items-center gap-1"
                    style={{ color: deadlineColor(project.deadline) }}
                  >
                    <span>📅</span>
                    {project.deadline}
                  </span>
                )}

                {/* Task count */}
                {total > 0 && (
                  <span className="text-white/50 text-[10px] ml-auto">
                    {done}/{total} tasks
                  </span>
                )}
              </div>

              {/* Task progress bar */}
              {total > 0 && (
                <div className="mt-3 h-1 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.round((done / total) * 100)}%`,
                      backgroundColor: company.color,
                      opacity: 0.6,
                    }}
                  />
                </div>
              )}

              {/* Task preview list */}
              {previewTasks.length > 0 && (
                <div className="mt-3 pt-3 border-t border-white/5 space-y-1.5">
                  {previewTasks.map((task) => (
                    <div key={task.id} className="flex items-start gap-2">
                      <div
                        className="w-3.5 h-3.5 rounded border flex-shrink-0 mt-[1px] flex items-center justify-center"
                        style={{
                          borderColor: task.done ? `${company.color}60` : 'rgba(255,255,255,0.15)',
                          backgroundColor: task.done ? `${company.color}20` : 'transparent',
                        }}
                      >
                        {task.done && (
                          <svg className="w-2.5 h-2.5" fill="none" stroke={company.color} viewBox="0 0 24 24" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <span
                        className={`text-[11px] leading-tight ${
                          task.done ? 'text-white/25 line-through' : 'text-white/55'
                        }`}
                      >
                        {task.text || 'Untitled task'}
                      </span>
                    </div>
                  ))}
                  {remaining > 0 && (
                    <p className="text-white/25 text-[10px] pl-5.5">+{remaining} more</p>
                  )}
                </div>
              )}
            </Link>
          )
        })}
      </div>

      {/* Social media strip */}
      <div className="border border-surface-border rounded-2xl p-5 flex items-center justify-between hover:border-white/20 transition-colors group">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-surface-card border border-surface-border flex items-center justify-center">
            <svg className="w-4 h-4 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
            </svg>
          </div>
          <div>
            <p className="text-white text-sm font-medium">Social Media</p>
            <p className="text-white/55 text-xs">
              {data.socialMedia.managerName} \u00b7 {data.socialMedia.platforms.length} platforms across {data.companies.length} companies
            </p>
          </div>
        </div>
        <Link
          to="/social-media"
          className="text-white/50 hover:text-white/80 text-sm transition-colors flex items-center gap-1"
        >
          View
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </div>
  )
}
