// ——— Block types ————————————————————————————————————————————————————————————

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

export interface ProfileItem {
  id: string
  name: string
  role?: string
  linkedinUrl?: string
  email?: string
  phone?: string
}

// ——— Travel Map ——————————————————————————————————————————————————————————————

export interface TripContact {
  id: string
  name: string
  role?: string
  company?: string
  linkedin?: string
  email?: string
  phone?: string
  notes?: string
}

export interface TripEvent {
  id: string
  title: string
  date?: string
  location?: string
  link?: string
  sponsorSlot?: string
  notes?: string
}

export interface TripStop {
  id: string
  country: string
  capital: string
  flag: string
  lat: number
  lng: number
  arrivalDate: string
  departureDate: string
  events: TripEvent[]
  contacts: TripContact[]
}

export type BlockType = 'tasks' | 'links' | 'notes' | 'kpi' | 'github' | 'calendar' | 'canva' | 'sheets' | 'profiles' | 'travelmap'

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
  // profiles block
  profiles?: ProfileItem[]
  // travelmap block
  tripStops?: TripStop[]
}

// ——— Project ————————————————————————————————————————————————————————————————

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

// ——— Company ————————————————————————————————————————————————————————————————

export interface Company {
  id: string
  name: string
  description: string
  color: string
  emoji: string
  logoUrl?: string
  projects: Project[]
}

// ——— Social Media ———————————————————————————————————————————————————————————

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

// ——— Root data ——————————————————————————————————————————————————————————————

export interface AppData {
  companies: Company[]
  socialMedia: SocialMediaData
}
