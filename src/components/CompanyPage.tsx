import { Link, useParams, Navigate } from 'react-router-dom'
import { useData } from '../context/DataContext'
import type { Project, AppData } from '../data/schema'

export default function CompanyPage() {
  const { companyId } = useParams<{ companyId: string }>()
  const { data, updateData } = useData()

  const company = data.companies.find((c) => c.id === companyId)
  if (!company) return <Navigate to="/" replace />

  const statusOrder: Record<string, number> = { active: 0, paused: 1, planning: 2, done: 3 }
  const sorted = [...company.projects].sort(
    (a, b) => (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9),
  )

  function addProject() {
    const newProject: Project = {
      id: `project-${Date.now()}`,
      name: 'New Project',
      status: 'planning',
      priority: 'medium',
      description: 'Add a description…',
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
  }

  return (
    <div className="p-8 max-w-6xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl overflow-hidden"
            style={{
              backgroundColor: `${company.color}18`,
              border: `1px solid ${company.color}30`,
              boxShadow: `0 0 24px ${company.color}10`,
            }}
          >
            {company.logoUrl
              ? <img src={company.logoUrl} alt={company.name} className="w-full h-full object-contain p-1.5" />
              : company.emoji}
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white tracking-tight">{company.name}</h1>
            <p className="text-white/40 text-sm mt-0.5">{company.description}</p>
          </div>
        </div>
        <button
          onClick={addProject}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-sm transition-colors border border-surface-border"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New project
        </button>
      </div>

      {/* Color accent bar */}
      <div className="h-px mb-8 rounded-full" style={{ background: `linear-gradient(to right, ${company.color}60, transparent)` }} />

      {/* Projects grid */}
      {sorted.length === 0 ? (
        <EmptyState color={company.color} onAdd={addProject} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sorted.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              companyId={company.id}
              color={company.color}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Project Card ─────────────────────────────────────────────────────────────

function ProjectCard({
  project,
  companyId,
  color,
}: {
  project: Project
  companyId: string
  color: string
}) {
  const taskBlock = project.blocks.find((b) => b.type === 'tasks')
  const totalTasks = taskBlock?.tasks?.length ?? 0
  const doneTasks = taskBlock?.tasks?.filter((t) => t.done).length ?? 0

  return (
    <Link
      to={`/${companyId}/${project.id}`}
      className="block border border-surface-border rounded-2xl p-5 hover:border-white/20 transition-all hover:bg-white/[0.02] group"
    >
      {/* Status + priority */}
      <div className="flex items-center gap-2 mb-3">
        <StatusBadge status={project.status} />
        {project.priority === 'high' && (
          <span
            className="text-[10px] px-2 py-0.5 rounded-full font-medium"
            style={{ backgroundColor: `${color}18`, color }}
          >
            high priority
          </span>
        )}
        <svg
          className="w-3.5 h-3.5 text-white/20 group-hover:text-white/50 transition-colors ml-auto"
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>

      {/* Name + description */}
      <h3 className="text-white font-medium text-sm mb-1.5">{project.name}</h3>
      <p className="text-white/40 text-xs line-clamp-2 leading-relaxed">{project.description}</p>

      {/* Block type chips */}
      <div className="flex flex-wrap gap-1.5 mt-3">
        {project.blocks.map((block) => (
          <span key={block.id} className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-white/30">
            {block.type}
          </span>
        ))}
      </div>

      {/* Task progress */}
      {totalTasks > 0 && (
        <div className="mt-4 pt-3 border-t border-surface-border">
          <div className="flex items-center justify-between text-xs text-white/30 mb-1.5">
            <span>Tasks</span>
            <span>{doneTasks}/{totalTasks}</span>
          </div>
          <div className="h-1 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${totalTasks > 0 ? (doneTasks / totalTasks) * 100 : 0}%`,
                backgroundColor: color,
              }}
            />
          </div>
        </div>
      )}
    </Link>
  )
}

function StatusBadge({ status }: { status: Project['status'] }) {
  const config: Record<Project['status'], { label: string; color: string; bg: string }> = {
    active: { label: 'Active', color: '#10b981', bg: '#10b98120' },
    paused: { label: 'Paused', color: '#f59e0b', bg: '#f59e0b20' },
    planning: { label: 'Planning', color: '#6366f1', bg: '#6366f120' },
    done: { label: 'Done', color: '#6b7280', bg: '#6b728020' },
  }
  const { label, color, bg } = config[status]
  return (
    <span
      className="text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1"
      style={{ backgroundColor: bg, color }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  )
}

function EmptyState({ color, onAdd }: { color: string; onAdd: () => void }) {
  return (
    <div className="border border-surface-border border-dashed rounded-2xl p-16 flex flex-col items-center text-center">
      <div className="w-10 h-10 rounded-xl bg-surface-card border border-surface-border flex items-center justify-center mb-3">
        <svg className="w-4 h-4 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      </div>
      <p className="text-white/40 text-sm font-medium">No projects yet</p>
      <p className="text-white/20 text-xs mt-1">Create your first project to get started.</p>
      <button
        onClick={onAdd}
        className="mt-4 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        style={{ backgroundColor: `${color}20`, color }}
      >
        + New project
      </button>
    </div>
  )
}

