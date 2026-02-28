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

export function DataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(SEED_DATA)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Load from KV on mount
  useEffect(() => {
    fetch('/api/data')
      .then((r) => r.json())
      .then((d: AppData) => {
        if (d && d.companies) setData(d)
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
