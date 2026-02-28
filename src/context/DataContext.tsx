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
    <DataContext.Provider value={{ data, loading, saving, updateData }}>
      {children}
    </DataContext.Provider>
  )
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used inside <DataProvider>')
  return ctx
}
