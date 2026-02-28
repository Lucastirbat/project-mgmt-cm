import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from 'react'
import type { AppData } from '../data/schema'
import { SEED_DATA } from '../data/seed'

interface DataContextValue {
  data: AppData
  loading: boolean
  saving: boolean
  updateData: (next: AppData) => void
  refreshData: () => Promise<void>
}

const DataContext = createContext<DataContextValue | null>(null)

// ─── Migrations ───────────────────────────────────────────────────────────────
// Each migration is idempotent — checks before adding, so safe to run on every load.

function migrate(raw: AppData): { data: AppData; changed: boolean } {
  let data = raw
  let changed = false

  // M1: Add ReaktorX events-calendar project with Luma embed
  const rx = data.companies.find((c) => c.id === 'reaktorx')
  if (rx && !rx.projects.some((p) => p.id === 'events-calendar')) {
    data = {
      ...data,
      companies: data.companies.map((c) =>
        c.id === 'reaktorx'
          ? {
              ...c,
              projects: [
                ...c.projects,
                {
                  id: 'events-calendar',
                  name: 'Events Calendar',
                  status: 'active' as const,
                  priority: 'medium' as const,
                  description: 'Upcoming ReaktorX events.',
                  updatedAt: new Date().toISOString(),
                  blocks: [
                    {
                      id: 'b-cal-rx',
                      type: 'calendar' as const,
                      title: 'Events',
                      calendarUrl: 'https://luma.com/embed/calendar/cal-wX9FCql5TyxdFtJ/events',
                    },
                  ],
                },
              ],
            }
          : c,
      ),
    }
    changed = true
  }

  // M2: Add calendar block to EU Startup Embassy Events project
  const eu = data.companies.find((c) => c.id === 'eu-startup-embassy')
  if (eu) {
    const eventsProject = eu.projects.find((p) => p.id === 'events')
    if (eventsProject && !eventsProject.blocks.some((b) => b.type === 'calendar')) {
      data = {
        ...data,
        companies: data.companies.map((c) =>
          c.id === 'eu-startup-embassy'
            ? {
                ...c,
                projects: c.projects.map((p) =>
                  p.id === 'events'
                    ? {
                        ...p,
                        blocks: [
                          ...p.blocks,
                          {
                            id: 'b-cal-eu',
                            type: 'calendar' as const,
                            title: 'Events Calendar',
                            calendarUrl:
                              'https://luma.com/embed/calendar/cal-04KinE3PojvsYbV/events',
                          },
                        ],
                      }
                    : p,
                ),
              }
            : c,
        ),
      }
      changed = true
    }
  }

  // M3: Add sheets block to ReaktorX "Raising the Fund" project
  const rxFund = data.companies
    .find((c) => c.id === 'reaktorx')
    ?.projects.find((p) => p.id === 'raising-fund')
  if (rxFund && !rxFund.blocks.some((b) => b.type === 'sheets')) {
    data = {
      ...data,
      companies: data.companies.map((c) =>
        c.id === 'reaktorx'
          ? {
              ...c,
              projects: c.projects.map((p) =>
                p.id === 'raising-fund'
                  ? {
                      ...p,
                      blocks: [
                        ...p.blocks,
                        {
                          id: 'b-sheet-rx',
                          type: 'sheets' as const,
                          title: 'Fund Sheet',
                          sheetsUrl:
                            'https://docs.google.com/spreadsheets/d/e/2PACX-1vSCXmGXeAkYg4yWrt20Y-bCY5CttBpBeXwwNTmSRAMFMCcCYOvTJR2RS0FiOqAu3iVjUdQn25vjR5Ty/pubhtml?widget=true&headers=false',
                        },
                      ],
                    }
                  : p,
              ),
            }
          : c,
      ),
    }
    changed = true
  }

  // M4: Update company brand colors and logos
  const BRAND: Record<string, { color: string; logoUrl: string }> = {
    reaktorx: {
      color: '#a78bfa',
      logoUrl: 'https://reaktorx.com/wp-content/uploads/2022/10/cropped-Group-1-5-1.png',
    },
    'creative-motion': {
      color: '#7c3aed',
      logoUrl: '',
    },
    'eu-startup-embassy': {
      color: '#4ade80',
      logoUrl: 'https://europeanstartupembassy.com/wp-content/uploads/2025/09/ESE-Logo-Basic.svg',
    },
    jacquebox: {
      color: '#16a34a',
      logoUrl: 'https://jacquebox.com/logo.png',
    },
  }
  const needsBrandUpdate = data.companies.some((c) => {
    const brand = BRAND[c.id]
    return brand && (c.color !== brand.color || c.logoUrl !== brand.logoUrl)
  })
  if (needsBrandUpdate) {
    data = {
      ...data,
      companies: data.companies.map((c) => {
        const brand = BRAND[c.id]
        return brand ? { ...c, color: brand.color, logoUrl: brand.logoUrl || undefined } : c
      }),
    }
    changed = true
  }

  // M5: Add Eastern Europe Tour 2025 project to ReaktorX
  const rxForTrip = data.companies.find((c) => c.id === 'reaktorx')
  if (rxForTrip && !rxForTrip.projects.some((p) => p.id === 'euro-trip-2025')) {
    data = {
      ...data,
      companies: data.companies.map((c) =>
        c.id === 'reaktorx'
          ? {
              ...c,
              projects: [
                ...c.projects,
                {
                  id: 'euro-trip-2025',
                  name: 'Eastern Europe Tour 2025',
                  status: 'active' as const,
                  priority: 'high' as const,
                  description: 'Live map tracking the SF → Eastern Europe tour (Mar 23 – May 2, 2025).',
                  updatedAt: new Date().toISOString(),
                  blocks: [
                    {
                      id: 'b-travelmap-1',
                      type: 'travelmap' as const,
                      title: 'Route Map',
                      tripStops: [
                        { id: 'ts-1',  country: 'Belgium',       capital: 'Brussels',  flag: '🇧🇪', lat: 50.8503, lng: 4.3517,  arrivalDate: '2025-03-23', departureDate: '2025-03-27', events: [], contacts: [] },
                        { id: 'ts-2',  country: 'Romania',       capital: 'Bucharest', flag: '🇷🇴', lat: 44.4268, lng: 26.1025, arrivalDate: '2025-03-27', departureDate: '2025-04-05', events: [], contacts: [] },
                        { id: 'ts-3',  country: 'Moldova',       capital: 'Chișinău',  flag: '🇲🇩', lat: 47.0105, lng: 28.8638, arrivalDate: '2025-04-05', departureDate: '2025-04-07', events: [], contacts: [] },
                        { id: 'ts-4',  country: 'Bulgaria',      capital: 'Sofia',     flag: '🇧🇬', lat: 42.6977, lng: 23.3219, arrivalDate: '2025-04-07', departureDate: '2025-04-09', events: [], contacts: [] },
                        { id: 'ts-5',  country: 'N. Macedonia',  capital: 'Skopje',    flag: '🇲🇰', lat: 41.9981, lng: 21.4254, arrivalDate: '2025-04-09', departureDate: '2025-04-11', events: [], contacts: [] },
                        { id: 'ts-6',  country: 'Serbia',        capital: 'Belgrade',  flag: '🇷🇸', lat: 44.7866, lng: 20.4489, arrivalDate: '2025-04-13', departureDate: '2025-04-16', events: [], contacts: [] },
                        { id: 'ts-7',  country: 'Bosnia',        capital: 'Sarajevo',  flag: '🇧🇦', lat: 43.8563, lng: 18.4131, arrivalDate: '2025-04-16', departureDate: '2025-04-18', events: [], contacts: [] },
                        { id: 'ts-8',  country: 'Croatia',       capital: 'Zagreb',    flag: '🇭🇷', lat: 45.8150, lng: 15.9819, arrivalDate: '2025-04-18', departureDate: '2025-04-20', events: [], contacts: [] },
                        { id: 'ts-9',  country: 'Hungary',       capital: 'Budapest',  flag: '🇭🇺', lat: 47.4979, lng: 19.0402, arrivalDate: '2025-04-20', departureDate: '2025-04-22', events: [], contacts: [] },
                        { id: 'ts-10', country: 'Slovakia',      capital: 'Bratislava',flag: '🇸🇰', lat: 48.1486, lng: 17.1077, arrivalDate: '2025-04-22', departureDate: '2025-04-24', events: [], contacts: [] },
                        { id: 'ts-11', country: 'Czech Republic',capital: 'Prague',    flag: '🇨🇿', lat: 50.0755, lng: 14.4378, arrivalDate: '2025-04-24', departureDate: '2025-04-26', events: [], contacts: [] },
                        { id: 'ts-12', country: 'Lithuania',     capital: 'Vilnius',   flag: '🇱🇹', lat: 54.6872, lng: 25.2797, arrivalDate: '2025-04-26', departureDate: '2025-04-27', events: [], contacts: [] },
                        { id: 'ts-13', country: 'Latvia',        capital: 'Riga',      flag: '🇱🇻', lat: 56.9496, lng: 24.1052, arrivalDate: '2025-04-27', departureDate: '2025-04-28', events: [], contacts: [] },
                        { id: 'ts-14', country: 'Estonia',       capital: 'Tallinn',   flag: '🇪🇪', lat: 59.4370, lng: 24.7536, arrivalDate: '2025-04-28', departureDate: '2025-04-29', events: [], contacts: [] },
                        { id: 'ts-15', country: 'Ukraine',       capital: 'Kyiv',      flag: '🇺🇦', lat: 50.4501, lng: 30.5234, arrivalDate: '2025-04-29', departureDate: '2025-05-02', events: [], contacts: [] },
                      ],
                    },
                  ],
                },
              ],
            }
          : c,
      ),
    }
    changed = true
  }

  return { data, changed }
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(SEED_DATA)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load from KV on mount, then apply migrations
  useEffect(() => {
    fetch('/api/data')
      .then((r) => r.json())
      .then((d: AppData) => {
        if (d && d.companies) {
          const { data: migrated, changed } = migrate(d)
          setData(migrated)
          if (changed) {
            fetch('/api/data', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(migrated),
            }).catch(() => {})
          }
        }
      })
      .catch(() => {
        // KV not configured yet (local dev or first deploy) — use seed data
      })
      .finally(() => setLoading(false))
  }, [])

  // Re-fetch from KV and apply migrations (called after agent updates data)
  const refreshData = useCallback(async () => {
    try {
      const r = await fetch('/api/data')
      const d: AppData = await r.json()
      if (d && d.companies) {
        const { data: migrated } = migrate(d)
        setData(migrated)
      }
    } catch {
      // silent — keep current state
    }
  }, [])

  // Debounced save to KV
  const updateData = useCallback((next: AppData) => {
    setData(next)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      setSaving(true)
      try {
        await fetch('/api/data', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(next),
        })
      } catch {
        // silent fail — data is still in React state
      } finally {
        setSaving(false)
      }
    }, 600)
  }, [])

  return (
    <DataContext.Provider value={{ data, loading, saving, updateData, refreshData }}>
      {children}
    </DataContext.Provider>
  )
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used inside <DataProvider>')
  return ctx
}
