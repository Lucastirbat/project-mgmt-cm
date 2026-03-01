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
// Only keep migrations that patch values in-place (safe to re-run).
// Migrations that ADD new projects/blocks have been removed — they prevented
// users from deleting those items (migration re-added them on every load).

function migrate(raw: AppData): { data: AppData; changed: boolean } {
  let data = raw
  let changed = false

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

  // M6: Fix euro-trip-2025 stop dates from 2025 → 2026
  const rxTrip = data.companies
    .find((c) => c.id === 'reaktorx')
    ?.projects.find((p) => p.id === 'euro-trip-2025')
  const tripBlock = rxTrip?.blocks.find((b) => b.type === 'travelmap')
  if (tripBlock?.tripStops?.some((s) => s.arrivalDate.startsWith('2025'))) {
    data = {
      ...data,
      companies: data.companies.map((c) =>
        c.id === 'reaktorx'
          ? {
              ...c,
              projects: c.projects.map((p) =>
                p.id === 'euro-trip-2025'
                  ? {
                      ...p,
                      blocks: p.blocks.map((b) =>
                        b.type === 'travelmap' && b.tripStops
                          ? {
                              ...b,
                              tripStops: b.tripStops.map((s) => ({
                                ...s,
                                arrivalDate: s.arrivalDate.replace(/^2025/, '2026'),
                                departureDate: s.departureDate.replace(/^2025/, '2026'),
                              })),
                            }
                          : b,
                      ),
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
