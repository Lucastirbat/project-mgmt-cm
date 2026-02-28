import { useState } from 'react'
import { useParams, Navigate, Link } from 'react-router-dom'
import { useData } from '../context/DataContext'
import type { Block, BlockType, AppData, Project } from '../data/schema'
import TaskBlock from './blocks/TaskBlock'
import LinksBlock from './blocks/LinksBlock'
import NotesBlock from './blocks/NotesBlock'
import KpiBlock from './blocks/KpiBlock'
import GithubBlock from './blocks/GithubBlock'
import CalendarBlock from './blocks/CalendarBlock'
import CanvaBlock from './blocks/CanvaBlock'
import SheetsBlock from './blocks/SheetsBlock'

const STATUS_OPTIONS: Project['status'][] = ['active', 'paused', 'planning', 'done']
const PRIORITY_OPTIONS: Project['priority'][] = ['high', 'medium', 'low']

const STATUS_COLORS: Record<Project['status'], string> = {
  active: '#10b981',
  paused: '#f59e0b',
  planning: '#6366f1',
  done: '#6b7280',
}

export default function ProjectPage() {
  const { companyId, projectId } = useParams<{ companyId: string; projectId: string }>()
  const { data, updateData } = useData()
  const [showBlockPicker, setShowBlockPicker] = useState(false)

  const company = data.companies.find((c) => c.id === companyId)
  if (!company) return <Navigate to="/" replace />

  const project = company.projects.find((p) => p.id === projectId)
  if (!project) return <Navigate to={`/${companyId}`} replace />

  function updateProject(updated: Project) {
    const next: AppData = {
      ...data,
      companies: data.companies.map((c) =>
        c.id === companyId
          ? {
              ...c,
              projects: c.projects.map((p) =>
                p.id === projectId ? { ...updated, updatedAt: new Date().toISOString() } : p,
              ),
            }
          : c,
      ),
    }
    updateData(next)
  }

  function updateBlock(updated: Block) {
    updateProject({ ...project!, blocks: project!.blocks.map((b) => (b.id === updated.id ? updated : b)) })
  }

  function addBlock(type: BlockType) {
    const defaults: Partial<Block> = {
      tasks: type === 'tasks' ? [] : undefined,
      links: type === 'links' ? [] : undefined,
      notes: type === 'notes' ? '' : undefined,
      kpis: type === 'kpi' ? [] : undefined,
      repoUrl: type === 'github' ? '' : undefined,
      repoName: type === 'github' ? '' : undefined,
      canvaUrl: type === 'canva' ? '' : undefined,
      canvaEditUrl: type === 'canva' ? '' : undefined,
      sheetsUrl: type === 'sheets' ? '' : undefined,
      sheetsEditUrl: type === 'sheets' ? '' : undefined,
    }
    const newBlock: Block = {
      id: `b-${Date.now()}`,
      type,
      title: BLOCK_LABELS[type],
      ...defaults,
    }
    updateProject({ ...project!, blocks: [...project!.blocks, newBlock] })
    setShowBlockPicker(false)
  }

  function deleteBlock(id: string) {
    updateProject({ ...project!, blocks: project!.blocks.filter((b) => b.id !== id) })
  }

  function updateBlockTitle(id: string, title: string) {
    updateProject({ ...project!, blocks: project!.blocks.map((b) => (b.id === id ? { ...b, title } : b)) })
  }

  function deleteProject() {
    if (!confirm(`Delete "${project!.name}"? This cannot be undone.`)) return
    const next: AppData = {
      ...data,
      companies: data.companies.map((c) =>
        c.id === companyId ? { ...c, projects: c.projects.filter((p) => p.id !== projectId) } : c,
      ),
    }
    updateData(next)
    window.history.back()
  }

  const statusColor = STATUS_COLORS[project.status]

  return (
    <div className="p-8 max-w-4xl mx-auto animate-fade-in">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-white/30 text-sm mb-6">
        <Link to={`/${companyId}`} className="hover:text-white/60 transition-colors flex items-center gap-1.5">
          {company.logoUrl ? (
            <span className="w-4 h-4 rounded overflow-hidden inline-flex items-center justify-center" style={{ backgroundColor: `${company.color}25` }}>
              <img src={company.logoUrl} alt="" className="w-full h-full object-contain p-0.5" />
            </span>
          ) : (
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: company.color }} />
          )}
          {company.name}
        </Link>
        <span>/</span>
        <span className="text-white/60">{project.name}</span>
      </div>

      {/* Project header */}
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            {/* Editable name */}
            <input
              value={project.name}
              onChange={(e) => updateProject({ ...project, name: e.target.value })}
              className="text-3xl font-semibold text-white bg-transparent outline-none w-full placeholder-white/20 tracking-tight border-b border-transparent focus:border-white/10 pb-1 transition-colors"
              placeholder="Project name"
            />
            {/* Editable description */}
            <textarea
              value={project.description}
              onChange={(e) => updateProject({ ...project, description: e.target.value })}
              rows={2}
              className="mt-2 text-white/40 text-sm bg-transparent outline-none w-full resize-none placeholder-white/15 leading-relaxed border-b border-transparent focus:border-white/8 transition-colors"
              placeholder="Add a description…"
            />
          </div>

          {/* Delete */}
          <button
            onClick={deleteProject}
            className="text-white/15 hover:text-red-400/60 transition-colors mt-1 p-1"
            title="Delete project"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>

        {/* Status + priority controls */}
        <div className="flex items-center gap-3 mt-4 flex-wrap">
          {/* Status picker */}
          <div className="flex items-center gap-1 p-1 bg-surface-card border border-surface-border rounded-xl">
            {STATUS_OPTIONS.map((s) => (
              <button
                key={s}
                onClick={() => updateProject({ ...project, status: s })}
                className={[
                  'text-xs px-2.5 py-1.5 rounded-lg transition-all capitalize',
                  project.status === s
                    ? 'text-white font-medium'
                    : 'text-white/30 hover:text-white/60',
                ].join(' ')}
                style={project.status === s ? { backgroundColor: `${STATUS_COLORS[s]}20`, color: STATUS_COLORS[s] } : {}}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Priority picker */}
          <div className="flex items-center gap-1 p-1 bg-surface-card border border-surface-border rounded-xl">
            {PRIORITY_OPTIONS.map((p) => (
              <button
                key={p}
                onClick={() => updateProject({ ...project, priority: p })}
                className={[
                  'text-xs px-2.5 py-1.5 rounded-lg transition-all capitalize',
                  project.priority === p
                    ? 'bg-white/10 text-white font-medium'
                    : 'text-white/30 hover:text-white/60',
                ].join(' ')}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Last updated */}
          <span className="text-white/20 text-xs ml-auto">
            Updated {formatDate(project.updatedAt)}
          </span>
        </div>
      </div>

      {/* Color accent */}
      <div
        className="h-px mb-8 rounded-full"
        style={{ background: `linear-gradient(to right, ${statusColor}50, transparent)` }}
      />

      {/* Blocks */}
      <div className="space-y-5">
        {project.blocks.map((block) => (
          <BlockCard
            key={block.id}
            block={block}
            color={company.color}
            onChange={updateBlock}
            onTitleChange={(title) => updateBlockTitle(block.id, title)}
            onDelete={() => deleteBlock(block.id)}
          />
        ))}
      </div>

      {/* Add block */}
      <div className="mt-6 relative">
        <button
          onClick={() => setShowBlockPicker((v) => !v)}
          className="flex items-center gap-2 text-white/25 hover:text-white/60 text-sm transition-colors py-2 px-3 rounded-lg hover:bg-white/5"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add block
        </button>

        {showBlockPicker && (
          <div className="absolute left-0 top-10 z-20 bg-surface-card border border-surface-border rounded-xl shadow-2xl p-2 flex gap-1.5 flex-wrap min-w-max animate-fade-in">
            {BLOCK_TYPES.map(({ type, label, icon }) => (
              <button
                key={type}
                onClick={() => addBlock(type)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-white/50 hover:text-white hover:bg-white/8 text-sm transition-colors"
              >
                {icon}
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Block Card ───────────────────────────────────────────────────────────────

function BlockCard({
  block,
  color,
  onChange,
  onTitleChange,
  onDelete,
}: {
  block: Block
  color: string
  onChange: (b: Block) => void
  onTitleChange: (title: string) => void
  onDelete: () => void
}) {
  return (
    <div className="border border-surface-border rounded-2xl overflow-hidden hover:border-white/15 transition-colors group/block">
      {/* Block header */}
      <div className="flex items-center gap-2 px-5 py-3 border-b border-surface-border bg-white/[0.02]">
        <span className="text-white/25">{BLOCK_ICONS[block.type]}</span>
        <input
          value={block.title}
          onChange={(e) => onTitleChange(e.target.value)}
          className="flex-1 text-sm font-medium text-white/70 bg-transparent outline-none placeholder-white/15 border-b border-transparent focus:border-white/10 transition-colors"
          placeholder="Block title"
        />
        <button
          onClick={onDelete}
          className="opacity-0 group-hover/block:opacity-100 transition-opacity text-white/20 hover:text-white/50"
          title="Remove block"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Block content */}
      <div className="p-5">
        {block.type === 'tasks' && <TaskBlock block={block} color={color} onChange={onChange} />}
        {block.type === 'links' && <LinksBlock block={block} onChange={onChange} />}
        {block.type === 'notes' && <NotesBlock block={block} onChange={onChange} />}
        {block.type === 'kpi' && <KpiBlock block={block} color={color} onChange={onChange} />}
        {block.type === 'github' && <GithubBlock block={block} color={color} onChange={onChange} />}
        {block.type === 'calendar' && <CalendarBlock block={block} onChange={onChange} />}
        {block.type === 'canva' && <CanvaBlock block={block} onChange={onChange} />}
        {block.type === 'sheets' && <SheetsBlock block={block} onChange={onChange} />}
      </div>
    </div>
  )
}

// ─── Constants ────────────────────────────────────────────────────────────────

const BLOCK_LABELS: Record<BlockType, string> = {
  tasks: 'Tasks',
  links: 'Links',
  notes: 'Notes',
  kpi: 'Metrics',
  github: 'GitHub',
  calendar: 'Calendar',
  canva: 'Canva',
  sheets: 'Sheets',
}

const BLOCK_ICONS: Record<BlockType, string> = {
  tasks: '☑',
  links: '🔗',
  notes: '📝',
  kpi: '📊',
  github: '⌥',
  calendar: '📅',
  canva: '✏',
  sheets: '🟩',
}

const BLOCK_TYPES: { type: BlockType; label: string; icon: string }[] = [
  { type: 'tasks', label: 'Tasks', icon: '☑' },
  { type: 'kpi', label: 'Metrics', icon: '📊' },
  { type: 'links', label: 'Links', icon: '🔗' },
  { type: 'notes', label: 'Notes', icon: '📝' },
  { type: 'github', label: 'GitHub', icon: '⌥' },
  { type: 'calendar', label: 'Calendar', icon: '📅' },
  { type: 'canva', label: 'Canva', icon: '✏' },
  { type: 'sheets', label: 'Sheets', icon: '🟩' },
]

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(new Date(iso))
  } catch {
    return ''
  }
}
