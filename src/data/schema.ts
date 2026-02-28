// ─── Block types ──────────────────────────────────────────────────────────────

export interface TaskItem {
  id: string
  text: string
  done: boolean
}

export interface LinkItem {
  id: string
  label: string
  url: string
}

export interface KpiItem {
  id: string
  label: string
  value: string
  trend?: 'up' | 'down' | 'flat'
}

export type BlockType = 'tasks' | 'links' | 'notes' | 'kpi' | 'github' | 'calendar' | 'canva' | 'sheets'

export interface Block {
  id: string
  type: BlockType
  title: string
  // tasks block
  tasks?: TaskItem[]
  // links block
  links?: LinkItem[]
  // notes block
  notes?: string
  // kpi block
  kpis?: KpiItem[]
  // github block
  repoUrl?: string
  repoName?: string
  // calendar block
  calendarUrl?: string
  // canva block
  canvaUrl?: string
  canvaEditUrl?: string
  // sheets block
  sheetsUrl?: string
  sheetsEditUrl?: string
}

// ─── Project ──────────────────────────────────────────────────────────────────

export type ProjectStatus = 'active' | 'paused' | 'planning' | 'done'
export type ProjectPriority = 'high' | 'medium' | 'low'

export interface Project {
  id: string
  name: string
  status: ProjectStatus
  priority: ProjectPriority
  description: string
  blocks: Block[]
  updatedAt: string
}

// ─── Company ──────────────────────────────────────────────────────────────────

export interface Company {
  id: string
  name: string
  description: string
  color: string
  emoji: string
  projects: Project[]
}

// ─── Social Media ─────────────────────────────────────────────────────────────

export interface SocialPlatform {
  id: string
  companyId: string
  platform: string
  handle: string
  status: 'active' | 'inactive' | 'planned'
}

export interface SocialMediaData {
  managerName: string
  notionUrl: string
  platforms: SocialPlatform[]
}

// ─── Root data ────────────────────────────────────────────────────────────────

export interface AppData {
  companies: Company[]
  socialMedia: SocialMediaData
}
