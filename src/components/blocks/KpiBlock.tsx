import type { Block, KpiItem } from '../../data/schema'

interface Props {
  block: Block
  color: string
  onChange: (updated: Block) => void
}

export default function KpiBlock({ block, color, onChange }: Props) {
  const kpis = block.kpis ?? []

  function updateKpi(id: string, field: keyof KpiItem, value: string) {
    onChange({
      ...block,
      kpis: kpis.map((k) => (k.id === id ? { ...k, [field]: value } : k)),
    })
  }

  function addKpi() {
    const newKpi: KpiItem = {
      id: `k-${Date.now()}`,
      label: 'Metric',
      value: '—',
    }
    onChange({ ...block, kpis: [...kpis, newKpi] })
  }

  function deleteKpi(id: string) {
    onChange({ ...block, kpis: kpis.filter((k) => k.id !== id) })
  }

  function cycleTrend(kpi: KpiItem) {
    const cycle: Array<KpiItem['trend']> = [undefined, 'up', 'down', 'flat']
    const idx = cycle.indexOf(kpi.trend)
    const next = cycle[(idx + 1) % cycle.length]
    onChange({ ...block, kpis: kpis.map((k) => (k.id === kpi.id ? { ...k, trend: next } : k)) })
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {kpis.map((kpi) => (
        <div
          key={kpi.id}
          className="border border-surface-border rounded-xl p-3 group/kpi hover:border-white/15 transition-colors"
        >
          <div className="flex items-start justify-between gap-1">
            <input
              value={kpi.label}
              onChange={(e) => updateKpi(kpi.id, 'label', e.target.value)}
              className="text-[11px] text-white/35 bg-transparent outline-none w-full uppercase tracking-wider font-medium placeholder-white/15"
              placeholder="Label"
            />
            <div className="flex gap-1 opacity-0 group-hover/kpi:opacity-100 transition-opacity shrink-0">
              <button
                onClick={() => cycleTrend(kpi)}
                className="text-white/20 hover:text-white/50 transition-colors"
                title="Cycle trend"
              >
                <TrendIcon trend={kpi.trend} />
              </button>
              <button
                onClick={() => deleteKpi(kpi.id)}
                className="text-white/20 hover:text-white/50 transition-colors"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          <div className="flex items-end gap-1.5 mt-1">
            <input
              value={kpi.value}
              onChange={(e) => updateKpi(kpi.id, 'value', e.target.value)}
              className="text-xl font-semibold bg-transparent outline-none text-white w-full placeholder-white/15"
              style={{ color: kpi.value !== '—' ? color : undefined }}
              placeholder="—"
            />
            {kpi.trend && kpi.trend !== 'flat' && (
              <span className={kpi.trend === 'up' ? 'text-emerald-400 text-sm mb-0.5' : 'text-red-400 text-sm mb-0.5'}>
                {kpi.trend === 'up' ? '↑' : '↓'}
              </span>
            )}
          </div>
        </div>
      ))}

      <button
        onClick={addKpi}
        className="border border-dashed border-surface-border rounded-xl p-3 flex items-center justify-center text-white/20 hover:text-white/50 hover:border-white/20 transition-colors text-xs gap-1.5"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add metric
      </button>
    </div>
  )
}

function TrendIcon({ trend }: { trend?: KpiItem['trend'] }) {
  if (trend === 'up') return <span className="text-emerald-400 text-xs">↑</span>
  if (trend === 'down') return <span className="text-red-400 text-xs">↓</span>
  if (trend === 'flat') return <span className="text-white/30 text-xs">→</span>
  return (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  )
}
