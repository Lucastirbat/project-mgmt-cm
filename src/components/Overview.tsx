import { useState, useRef, useEffect, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
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

const MEMBER_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899']
function memberColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) & 0xffff
  return MEMBER_COLORS[hash % MEMBER_COLORS.length]
}

type SortMode = 'company' | 'priority' | 'status' | 'todo'

export default function Overview() {
  const { data, updateData } = useData()
  const [searchParams] = useSearchParams()
  const [showDropdown, setShowDropdown] = useState(false)
  const [sortMode, setSortMode] = useState<SortMode>('status')
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Drag-and-drop state for ToDo board
  const [dragProjectId, setDragProjectId] = useState<string | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null)

  // Member filter comes from URL: /?member=Luca
  const selectedMember = searchParams.get('member')

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
      blocks: [{ id: `b-${Date.now()}`, type: 'tasks', title: 'Tasks', tasks: [] }],
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

  // Flatten all projects
  const allProjects = data.companies.flatMap((company) =>
    company.projects.map((project) => ({
      project,
      company: { id: company.id, name: company.name, color: company.color, emoji: company.emoji, logoUrl: company.logoUrl },
    }))
  )

  // Sort orders
  const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 }
  const statusOrder: Record<string, number> = { active: 0, planning: 1, paused: 2, done: 3 }
  const companyOrder: Record<string, number> = {}
  data.companies.forEach((c, i) => { companyOrder[c.id] = i })

  allProjects.sort((a, b) => {
    if (sortMode === 'company') {
      const ca = companyOrder[a.company.id] ?? 99
      const cb = companyOrder[b.company.id] ?? 99
      if (ca !== cb) return ca - cb
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
    // Default: status sort (also used for 'todo' card ordering within columns)
    const sa = statusOrder[a.project.status] ?? 9
    const sb = statusOrder[b.project.status] ?? 9
    if (sa !== sb) return sa - sb
    const pa = priorityOrder[a.project.priority] ?? 9
    const pb = priorityOrder[b.project.priority] ?? 9
    if (pa !== pb) return pa - pb
    return a.project.name.localeCompare(b.project.name)
  })

  // Filter by selected member (set via sidebar)
  const visibleProjects = selectedMember
    ? allProjects.filter(({ project }) => {
        if (project.owner?.trim() === selectedMember) return true
        return project.blocks.some((b) =>
          b.tasks?.some((t) => t.assignee?.trim() === selectedMember)
        )
      })
    : allProjects

  // Collect unique team members from owners + assignees across all data
  const teamMembers = (() => {
    const names = new Set<string>()
    for (const company of data.companies) {
      for (const project of company.projects) {
        if (project.owner?.trim()) names.add(project.owner.trim())
        for (const block of project.blocks) {
          for (const task of block.tasks ?? []) {
            if (task.assignee?.trim()) names.add(task.assignee.trim())
          }
        }
      }
    }
    return Array.from(names).sort()
  })()

  const todoAssignments = data.todoAssignments ?? {}

  // Build columns for ToDo board: "Unassigned" + each team member
  const todoColumns = ['__unassigned__', ...teamMembers]

  function getColumnProjects(column: string) {
    // For Unassigned column, always show ALL unassigned projects (not filtered by member)
    if (column === '__unassigned__') {
      return allProjects.filter(({ project }) => {
        const assigned = todoAssignments[project.id]
        return !assigned || !teamMembers.includes(assigned)
      })
    }
    // For member columns, use visible (filtered) projects
    return visibleProjects.filter(({ project }) => {
      const assigned = todoAssignments[project.id]
      return assigned === column
    })
  }

  // Drag-and-drop handlers
  const handleDragStart = useCallback((projectId: string) => {
    setDragProjectId(projectId)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, column: string) => {
    e.preventDefault()
    setDragOverColumn(column)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragOverColumn(null)
  }, [])

  const handleDrop = useCallback((column: string) => {
    if (!dragProjectId) return
    const newAssignments = { ...todoAssignments }
    if (column === '__unassigned__') {
      delete newAssignments[dragProjectId]
    } else {
      newAssignments[dragProjectId] = column
    }
    const next: AppData = {
      ...data,
      todoAssignments: newAssignments,
    }
    updateData(next)
    setDragProjectId(null)
    setDragOverColumn(null)
  }, [dragProjectId, todoAssignments, data, updateData])

  const handleDragEnd = useCallback(() => {
    setDragProjectId(null)
    setDragOverColumn(null)
  }, [])

  function getTaskStats(project: Project) {
    let total = 0, done = 0
    for (const block of project.blocks) {
      if (block.tasks) {
        total += block.tasks.length
        done += block.tasks.filter((t) => t.done).length
      }
    }
    return { total, done }
  }

  // When filtering by member, show only their tasks in the preview
  function getPreviewTasks(project: Project, assigneeFilter?: string): { tasks: TaskItem[]; remaining: number } {
    const allTasks: TaskItem[] = []
    for (const block of project.blocks) {
      if (block.tasks) allTasks.push(...block.tasks)
    }
    const relevant = assigneeFilter
      ? allTasks.filter((t) => t.assignee?.trim() === assigneeFilter)
      : allTasks
    const sorted = [...relevant.filter((t) => !t.done), ...relevant.filter((t) => t.done)]
    const preview = sorted.slice(0, MAX_TASK_PREVIEW)
    return { tasks: preview, remaining: sorted.length - preview.length }
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
    {
      mode: 'todo',
      label: 'ToDo',
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
        </svg>
      ),
    },
  ]

  // ——— Project card renderer (shared between grid + kanban) ———
  function renderProjectCard(
    project: Project,
    company: { id: string; name: string; color: string; emoji: string; logoUrl?: string },
    opts?: { draggable?: boolean; compact?: boolean }
  ) {
    const { total, done } = getTaskStats(project)
    const { tasks: previewTasks, remaining } = getPreviewTasks(project, selectedMember ?? undefined)
    const ps = priorityStyle[project.priority] ?? priorityStyle.low
    const sc = statusColor[project.status] ?? '#6b7280'
    const sl = statusLabel[project.status] ?? project.status
    const isDragging = dragProjectId === project.id

    return (
      <Link
        key={project.id}
        to={`/${company.id}/${project.id}`}
        draggable={opts?.draggable}
        onDragStart={(e) => {
          if (opts?.draggable) {
            e.dataTransfer.effectAllowed = 'move'
            handleDragStart(project.id)
          }
        }}
        onDragEnd={handleDragEnd}
        className={`block border border-surface-border rounded-2xl p-4 hover:border-white/20 transition-all hover:bg-white/[0.02] group ${
          isDragging ? 'opacity-40 scale-[0.97]' : ''
        } ${opts?.draggable ? 'cursor-grab active:cursor-grabbing' : ''}`}
      >
        {/* Company badge */}
        <div className="flex items-center gap-2 mb-2">
          <div
            className="w-5 h-5 rounded-md flex items-center justify-center text-xs overflow-hidden shrink-0"
            style={{ backgroundColor: `${company.color}20`, border: `1px solid ${company.color}30` }}
          >
            {company.logoUrl ? (
              <img src={company.logoUrl} alt="" className="w-full h-full object-contain p-0.5" />
            ) : company.emoji}
          </div>
          <span className="text-white/50 text-xs truncate">{company.name}</span>
        </div>

        {/* Project name */}
        <h3 className="text-white font-medium text-sm mb-1 group-hover:text-white/90 transition-colors">
          {project.name}
        </h3>

        {/* Description */}
        {!opts?.compact && project.description && project.description !== 'Add a description\u2026' && (
          <p className="text-white/50 text-xs line-clamp-2 mb-2">{project.description}</p>
        )}

        {/* Status + Priority + owner + deadline */}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <span
            className="flex items-center gap-1.5 text-[10px] font-medium px-2 py-0.5 rounded-full"
            style={{ backgroundColor: `${sc}18`, color: sc }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: sc }} />
            {sl}
          </span>
          <span
            className="text-[10px] font-medium px-2 py-0.5 rounded-full"
            style={{ backgroundColor: ps.bg, color: ps.text }}
          >
            {project.priority}
          </span>
          {project.owner && (
            <span className="text-[10px] text-white/45 flex items-center gap-1">
              <span>👤</span>{project.owner}
            </span>
          )}
          {project.deadline && (
            <span className="text-[10px] flex items-center gap-1" style={{ color: deadlineColor(project.deadline) }}>
              <span>📅</span>{project.deadline}
            </span>
          )}
          {total > 0 && (
            <span className="text-white/50 text-[10px] ml-auto">{done}/{total} tasks</span>
          )}
        </div>

        {/* Task progress bar */}
        {total > 0 && (
          <div className="mt-2 h-1 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${Math.round((done / total) * 100)}%`, backgroundColor: company.color, opacity: 0.6 }}
            />
          </div>
        )}

        {/* Task preview */}
        {!opts?.compact && previewTasks.length > 0 && (
          <div className="mt-2 pt-2 border-t border-white/5 space-y-1.5">
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
                <div className="flex-1 min-w-0">
                  <span className={`text-[11px] leading-tight ${task.done ? 'text-white/25 line-through' : 'text-white/55'}`}>
                    {task.text || 'Untitled task'}
                  </span>
                  {task.dueDate && !task.done && (
                    <span className="ml-2 text-[10px]" style={{ color: deadlineColor(task.dueDate) }}>
                      {task.dueDate}
                    </span>
                  )}
                </div>
              </div>
            ))}
            {remaining > 0 && (
              <p className="text-white/25 text-[10px] pl-5.5">+{remaining} more</p>
            )}
          </div>
        )}
      </Link>
    )
  }

  return (
    <div className="p-8 max-w-full mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">
            {selectedMember ? `${selectedMember}'s work` : 'Overview'}
          </h1>
          <p className="text-white/60 text-sm mt-1">
            {selectedMember
              ? `${visibleProjects.length} project${visibleProjects.length !== 1 ? 's' : ''}`
              : `${allProjects.length} projects across ${data.companies.length} companies`}
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
                    ) : company.emoji}
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

      {/* ToDo Kanban Board */}
      {sortMode === 'todo' ? (
        <div className="todo-kanban-scroll flex gap-4 overflow-x-auto pb-4 items-start">
          {todoColumns.map((column) => {
            const columnProjects = getColumnProjects(column)
            const isUnassigned = column === '__unassigned__'
            const colLabel = isUnassigned ? 'Unassigned' : column
            const colColor = isUnassigned ? '#6b7280' : memberColor(column)
            const isOver = dragOverColumn === column && dragProjectId !== null

            return (
              <div
                key={column}
                className={`flex-shrink-0 w-72 rounded-xl border transition-colors ${
                  isOver
                    ? 'border-white/30 bg-white/[0.04]'
                    : 'border-surface-border bg-white/[0.01]'
                }`}
                onDragOver={(e) => handleDragOver(e, column)}
                onDragLeave={handleDragLeave}
                onDrop={() => handleDrop(column)}
              >
                {/* Column header */}
                <div className="flex items-center gap-2.5 px-4 py-3 border-b border-surface-border">
                  <div
                    className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold shrink-0"
                    style={{ backgroundColor: `${colColor}25`, color: colColor }}
                  >
                    {isUnassigned ? '?' : column[0].toUpperCase()}
                  </div>
                  <span className="text-white/80 text-sm font-medium truncate">{colLabel}</span>
                  <span className="text-white/30 text-xs ml-auto">{columnProjects.length}</span>
                </div>

                {/* Column body — no max height, grows with content */}
                <div className="p-2 space-y-2 min-h-[120px]">
                  {columnProjects.length === 0 && (
                    <div className="flex items-center justify-center h-20 text-white/15 text-xs">
                      Drop projects here
                    </div>
                  )}
                  {columnProjects.map(({ project, company }) =>
                    renderProjectCard(project, company, { draggable: true, compact: true })
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* Standard grid view */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl">
          {visibleProjects.map(({ project, company }) =>
            renderProjectCard(project, company)
          )}
        </div>
      )}
    </div>
  )
}
