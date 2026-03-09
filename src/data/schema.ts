// ——— Block types ————————————————————————————————————————————————

export interface TaskItem {
  id: string
  text: string
  done: boolean
  assignee?: string
  dueDate?: string
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

// ——— Travel Map ————————————————————————————————————————————————————

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

export type TripNeed = 'accommodation' | 'travel' | 'venue'

export interface TripEvent {
  id: string
  title: string
  date?: string
  location?: string
  venueCoords?: [number, number]  // [lat, lng] — geocoded via Nominatim
  link?: string
  imageUrl?: string   // manual cover image override (bypasses og:image proxy)
  sponsorSlot?: string
  notes?: string
  private?: boolean   // if true, only shown on friends view
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
  arrivalTime?: string    // 'HH:MM' — local time of arrival
  departureTime?: string  // 'HH:MM' — local time of departure
  transport?: 'plane' | 'bus' | 'car'  // how you travel TO this stop
  needs?: TripNeed[]      // help requests shown on friends view
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

// ——— Project ————————————————————————————————————————————————————————

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
  owner?: string
  deadline?: string
}

// ——— Company ————————————————————————————————————————————————————————

export interface Company {
  id: string
  name: string
  description: string
  color: string
  emoji: string
  logoUrl?: string
  projects: Project[]
}

// ——— Social Media ———————————————————————————————————————————————————

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

// ——— Root data ——————————————————————————————————————————————————————

// Maps project ID → team member name for the "ToDo" kanban board.
// Projects not in this map appear in the "Unassigned" column.
export interface TodoAssignments {
  [projectId: string]: string
}

export interface AppData {
  companies: Company[]
  socialMedia: SocialMediaData
  todoAssignments?: TodoAssignments
}
