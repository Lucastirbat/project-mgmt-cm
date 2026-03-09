/**
 * /trip/friends — Private friends-facing trip map.
 * Requires TRIP_FRIENDS_PASSWORD. Shows contacts + full event details.
 * Amber accent (#f59e0b) distinguishes it from the public fan page.
 */

import { useState, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, CircleMarker, Polyline, Tooltip, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

// ─── Types ────────────────────────────────────────────────────────────────────

interface TripContact {
  id: string; name: string; role?: string; company?: string
  linkedin?: string; email?: string; phone?: string; notes?: string
}

interface TripEvent {
  id: string; title: string; date?: string; location?: string
  link?: string; sponsorSlot?: string; notes?: string
}

interface TripStop {
  id: string; country: string; capital: string; flag: string
  lat: number; lng: number; arrivalDate: string; departureDate: string
  events: TripEvent[]; contacts: TripContact[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ACCENT = '#f59e0b'
const ACCENT_DIM = 'rgba(245,158,11,0.15)'
const ACCENT_BORDER = 'rgba(245,158,11,0.3)'
const TODAY = new Date().toISOString().slice(0, 10)

const MIN = 60_000, HOUR = 3_600_000, DAY = 86_400_000

function dateToMs(d: string) { return new Date(d + 'T12:00:00').getTime() }

function stopStatus(stop: TripStop): 'past' | 'current' | 'upcoming' {
  if (TODAY >= stop.departureDate) return 'past'
  if (TODAY >= stop.arrivalDate) return 'current'
  return 'upcoming'
}

function fmt(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en', { month: 'short', day: 'numeric' })
}

// ─── Timeline helpers ─────────────────────────────────────────────────────────

function getTickConfig(visibleMs: number) {
  if (visibleMs > 30 * DAY) return { major: 7 * DAY, minor: DAY, fmt: (d: Date) => d.toLocaleDateString('en', { month: 'short', day: 'numeric' }) }
  if (visibleMs > 5 * DAY)  return { major: DAY,     minor: 6 * HOUR, fmt: (d: Date) => d.toLocaleDateString('en', { month: 'short', day: 'numeric' }) }
  if (visibleMs > DAY)      return { major: 6 * HOUR, minor: HOUR, fmt: (d: Date) => d.toLocaleDateString('en', { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: false }) }
  if (visibleMs > 4 * HOUR) return { major: HOUR, minor: 15 * MIN, fmt: (d: Date) => d.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: false }) }
  return { major: 30 * MIN, minor: 5 * MIN, fmt: (d: Date) => d.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: false }) }
}

function getTicks(start: number, end: number, interval: number) {
  const first = Math.ceil(start / interval) * interval
  const result: number[] = []
  for (let t = first; t <= end; t += interval) result.push(t)
  return result
}

function fmtPlayhead(ms: number, visibleMs: number) {
  const d = new Date(ms)
  if (visibleMs > 3 * DAY) return d.toLocaleDateString('en', { month: 'short', day: 'numeric' })
  if (visibleMs > HOUR) return d.toLocaleDateString('en', { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: false })
  return d.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: false })
}

// ─── Timeline component ───────────────────────────────────────────────────────

function TripTimeline({ stops, tripStartMs, tripEndMs, playheadMs, viewStartMs, viewEndMs, onPlayheadChange, onViewChange, accent }: {
  stops: TripStop[]; tripStartMs: number; tripEndMs: number
  playheadMs: number; viewStartMs: number; viewEndMs: number
  onPlayheadChange: (ms: number) => void; onViewChange: (s: number, e: number) => void
  accent: string
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(800)
  const cbRef = useRef({ onPlayheadChange, onViewChange })
  cbRef.current = { onPlayheadChange, onViewChange }
  const viewRef = useRef({ viewStartMs, viewEndMs, containerWidth })
  viewRef.current = { viewStartMs, viewEndMs, containerWidth }
  const dragging = useRef<'playhead' | 'pan' | null>(null)
  const panAnchor = useRef<{ mouseX: number; viewStart: number; viewEnd: number } | null>(null)

  useEffect(() => {
    const update = () => setContainerWidth(containerRef.current?.clientWidth ?? 800)
    update()
    const ro = new ResizeObserver(update)
    if (containerRef.current) ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!dragging.current || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const { viewStartMs: vs, viewEndMs: ve, containerWidth: w } = viewRef.current
      if (dragging.current === 'playhead') {
        cbRef.current.onPlayheadChange(Math.max(tripStartMs, Math.min(tripEndMs, vs + (x / w) * (ve - vs))))
      } else if (dragging.current === 'pan' && panAnchor.current) {
        const { mouseX, viewStart, viewEnd } = panAnchor.current
        const msPerPx = (viewEnd - viewStart) / w
        const delta = (mouseX - x) * msPerPx
        let ns = viewStart + delta, ne = viewEnd + delta
        if (ns < tripStartMs) { ne += tripStartMs - ns; ns = tripStartMs }
        if (ne > tripEndMs) { ns -= ne - tripEndMs; ne = tripEndMs }
        cbRef.current.onViewChange(Math.max(tripStartMs, ns), Math.min(tripEndMs, ne))
      }
    }
    function onUp(e: MouseEvent) {
      if (dragging.current === 'pan' && panAnchor.current && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        const dist = Math.abs((e.clientX - rect.left) - panAnchor.current.mouseX)
        if (dist < 5) {
          const { viewStartMs: vs, viewEndMs: ve, containerWidth: w } = viewRef.current
          const ms = vs + (panAnchor.current.mouseX / w) * (ve - vs)
          cbRef.current.onPlayheadChange(Math.max(tripStartMs, Math.min(tripEndMs, ms)))
        }
      }
      dragging.current = null; panAnchor.current = null
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    return () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp) }
  }, [tripStartMs, tripEndMs])

  function handleWheel(e: React.WheelEvent) {
    e.preventDefault()
    const factor = e.deltaY > 0 ? 1.08 : 1 / 1.08
    const rect = containerRef.current!.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const { viewStartMs: vs, viewEndMs: ve, containerWidth: w } = viewRef.current
    const duration = ve - vs
    const mouseMs = vs + (mouseX / w) * duration
    const newDuration = Math.max(30 * MIN, Math.min(tripEndMs - tripStartMs, duration * factor))
    const ratio = (mouseMs - vs) / duration
    let ns = mouseMs - ratio * newDuration, ne = mouseMs + (1 - ratio) * newDuration
    if (ns < tripStartMs) { ne += tripStartMs - ns; ns = tripStartMs }
    if (ne > tripEndMs) { ns -= ne - tripEndMs; ne = tripEndMs }
    onViewChange(Math.max(tripStartMs, ns), Math.min(tripEndMs, ne))
  }

  const visibleMs = viewEndMs - viewStartMs
  const msToX = (ms: number) => ((ms - viewStartMs) / visibleMs) * containerWidth
  const { major, minor, fmt: tickFmt } = getTickConfig(visibleMs)
  const majorTicks = getTicks(viewStartMs, viewEndMs, major)
  const majorSet = new Set(majorTicks)
  const minorTicks = getTicks(viewStartMs, viewEndMs, minor).filter((t) => !majorSet.has(t))
  const playheadX = msToX(playheadMs)
  const todayX = msToX(Date.now())

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', height: 72, flexShrink: 0, backgroundColor: 'rgba(0,0,0,0.35)', borderTop: `1px solid ${ACCENT_BORDER.replace('0.3', '0.1')}`, cursor: 'grab', userSelect: 'none', overflow: 'hidden' }}
      onWheel={handleWheel}
      onMouseDown={(e) => { const rect = containerRef.current!.getBoundingClientRect(); dragging.current = 'pan'; panAnchor.current = { mouseX: e.clientX - rect.left, viewStart: viewStartMs, viewEnd: viewEndMs }; e.preventDefault() }}
    >
      <div style={{ position: 'absolute', top: 0, bottom: 0, left: Math.max(0, msToX(tripStartMs)), width: Math.max(0, Math.min(playheadX, containerWidth) - Math.max(0, msToX(tripStartMs))), backgroundColor: `${accent}10`, pointerEvents: 'none' }} />

      {minorTicks.map((t) => { const x = msToX(t); if (x < 0 || x > containerWidth) return null; return <div key={t} style={{ position: 'absolute', bottom: 0, left: x, height: 10, borderLeft: '1px solid rgba(255,255,255,0.06)', pointerEvents: 'none' }} /> })}

      {majorTicks.map((t) => { const x = msToX(t); if (x < 0 || x > containerWidth) return null; return (
        <div key={t} style={{ position: 'absolute', top: 0, bottom: 0, left: x, pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', top: 0, bottom: 0, borderLeft: '1px solid rgba(255,255,255,0.12)' }} />
          <span style={{ position: 'absolute', top: 7, left: 4, fontSize: 9, color: 'rgba(255,255,255,0.3)', whiteSpace: 'nowrap', lineHeight: 1 }}>{tickFmt(new Date(t))}</span>
        </div>
      )})}

      {todayX >= 0 && todayX <= containerWidth && <div style={{ position: 'absolute', top: 0, bottom: 0, left: todayX, borderLeft: '1px dashed rgba(255,255,255,0.22)', pointerEvents: 'none' }} />}

      {stops.map((stop) => { const x = msToX(dateToMs(stop.arrivalDate)); if (x < -20 || x > containerWidth + 20) return null; const reached = dateToMs(stop.arrivalDate) <= playheadMs; return (
        <div key={stop.id} style={{ position: 'absolute', top: 0, bottom: 0, left: x, pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', top: 0, bottom: 0, borderLeft: `1px solid ${reached ? `${accent}80` : 'rgba(255,255,255,0.18)'}` }} />
          <span style={{ position: 'absolute', bottom: 7, left: 4, fontSize: 12, lineHeight: 1, opacity: reached ? 1 : 0.3 }}>{stop.flag}</span>
        </div>
      )})}

      <div style={{ position: 'absolute', top: 0, bottom: 0, left: playheadX, borderLeft: `2px solid ${accent}e6`, zIndex: 5, pointerEvents: 'none', transition: 'left 0.06s linear' }} />
      <span style={{ position: 'absolute', top: 20, left: playheadX + 6, fontSize: 8, color: 'rgba(255,255,255,0.7)', whiteSpace: 'nowrap', zIndex: 6, pointerEvents: 'none', lineHeight: 1 }}>{fmtPlayhead(playheadMs, visibleMs)}</span>
      <div
        style={{ position: 'absolute', top: 0, left: playheadX - 7, width: 14, height: 14, borderRadius: '50%', backgroundColor: accent, border: '2.5px solid rgba(255,255,255,0.85)', cursor: 'ew-resize', boxShadow: `0 0 10px ${accent}b0`, zIndex: 10, pointerEvents: 'auto' }}
        onMouseDown={(e) => { dragging.current = 'playhead'; e.preventDefault(); e.stopPropagation() }}
      />
      <span style={{ position: 'absolute', bottom: 5, right: 7, fontSize: 8, color: 'rgba(255,255,255,0.15)', lineHeight: 1 }}>scroll to zoom · drag to pan</span>
    </div>
  )
}

// ─── Map effects ──────────────────────────────────────────────────────────────

function MapEffects() {
  const map = useMap()
  useEffect(() => {
    let accDir = 0
    let timer: ReturnType<typeof setTimeout> | null = null
    const container = map.getContainer()
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      accDir += e.deltaY > 0 ? -1 : 1
      if (timer !== null) clearTimeout(timer)
      timer = setTimeout(() => {
        if (accDir !== 0) map.setZoom(map.getZoom() + Math.sign(accDir))
        accDir = 0; timer = null
      }, 100)
    }
    container.addEventListener('wheel', onWheel, { passive: false })
    const style = document.createElement('style')
    style.id = 'friends-map-transitions'
    style.textContent = '.leaflet-overlay-pane path { transition: stroke 0.4s ease, stroke-opacity 0.35s ease, fill 0.4s ease, fill-opacity 0.35s ease; }'
    document.head.appendChild(style)
    return () => { container.removeEventListener('wheel', onWheel); document.getElementById('friends-map-transitions')?.remove() }
  }, [map])
  return null
}

// ─── Password gate ────────────────────────────────────────────────────────────

function PasswordGate({ onAuth }: { onAuth: () => void }) {
  const [value, setValue] = useState('')
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => { inputRef.current?.focus() }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setLoading(true); setError(false)
    try {
      const r = await fetch('/api/trip/friends-auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: value }) })
      if (r.ok) { onAuth() } else { setError(true); setValue(''); inputRef.current?.focus() }
    } catch { setError(true) } finally { setLoading(false) }
  }

  return (
    <div style={{ height: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ width: 320, padding: 32, borderRadius: 18, background: '#111', border: '1px solid #1f1f1f' }}>
        <div style={{ fontSize: 28, marginBottom: 12, textAlign: 'center' }}>🔒</div>
        <div style={{ color: '#fff', fontSize: 16, fontWeight: 600, textAlign: 'center', marginBottom: 4 }}>Friends access</div>
        <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, textAlign: 'center', marginBottom: 24 }}>Enter the password to see the full trip details</div>
        <form onSubmit={submit}>
          <input ref={inputRef} type="password" value={value} onChange={(e) => { setValue(e.target.value); setError(false) }} placeholder="Password"
            style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: 10, background: '#1a1a1a', border: `1px solid ${error ? '#ef4444' : '#2a2a2a'}`, color: '#fff', fontSize: 14, outline: 'none', marginBottom: 8, fontFamily: 'Inter, sans-serif' }} />
          {error && <div style={{ color: '#f87171', fontSize: 12, marginBottom: 10 }}>Wrong password, try again.</div>}
          <button type="submit" disabled={loading || !value}
            style={{ width: '100%', padding: '10px 0', borderRadius: 10, border: 'none', background: ACCENT, color: '#000', fontSize: 14, fontWeight: 600, cursor: loading || !value ? 'not-allowed' : 'pointer', opacity: loading || !value ? 0.5 : 1, fontFamily: 'Inter, sans-serif' }}>
            {loading ? 'Checking…' : 'Enter'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function FriendsTripPage() {
  const [authed, setAuthed] = useState<'checking' | 'no' | 'yes'>('checking')
  const [stops, setStops] = useState<TripStop[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isClient, setIsClient] = useState(false)

  const tripStartMs = stops.length ? dateToMs(stops[0].arrivalDate) : Date.now() - DAY
  const tripEndMs = stops.length ? dateToMs(stops[stops.length - 1].departureDate) : Date.now() + DAY
  const [playheadMs, setPlayheadMs] = useState<number>(() => Date.now())
  const [viewStartMs, setViewStartMs] = useState(tripStartMs)
  const [viewEndMs, setViewEndMs] = useState(tripEndMs)

  useEffect(() => {
    if (stops.length) {
      const s = dateToMs(stops[0].arrivalDate)
      const e = dateToMs(stops[stops.length - 1].departureDate)
      setPlayheadMs(Math.max(s, Math.min(e, Date.now())))
      setViewStartMs(s); setViewEndMs(e)
    }
  }, [stops.length])

  async function loadData() {
    setLoading(true)
    try {
      const r = await fetch('/api/trip/friends-data')
      if (r.status === 401) { setAuthed('no'); return }
      const d = await r.json() as { stops: TripStop[] }
      const loaded = d.stops ?? []
      setStops(loaded)
      const cur = loaded.find((s) => stopStatus(s) === 'current')
      setSelectedId(cur?.id ?? loaded[0]?.id ?? null)
      setAuthed('yes')
    } catch { setAuthed('no') } finally { setLoading(false) }
  }

  useEffect(() => { setIsClient(true); loadData() }, [])

  if (authed === 'checking') return <div style={{ height: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a', color: 'rgba(255,255,255,0.25)', fontFamily: 'Inter, sans-serif', fontSize: 13 }}>Loading…</div>
  if (authed === 'no') return <PasswordGate onAuth={() => loadData()} />

  const currentStop = stops.find((s) => stopStatus(s) === 'current')
  const selectedStop = stops.find((s) => s.id === selectedId) ?? null
  const mapCenter: [number, number] = currentStop ? [currentStop.lat, currentStop.lng] : [50.0, 20.0]

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: '#0a0a0a', fontFamily: 'Inter, sans-serif', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 18px', borderBottom: `1px solid rgba(245,158,11,0.12)`, flexShrink: 0, background: '#0d0d0d' }}>
        <span style={{ fontSize: 22 }}>🧭</span>
        <div style={{ flex: 1 }}>
          <div style={{ color: '#fff', fontSize: 15, fontWeight: 600, letterSpacing: '-0.02em' }}>
            Eastern Europe Tour 2026
            <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 500, background: ACCENT_DIM, color: ACCENT, borderRadius: 20, padding: '2px 8px', border: `1px solid ${ACCENT_BORDER}` }}>friends</span>
          </div>
          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, marginTop: 1 }}>{stops.length} cities · Mar – May 2026 · Full details view</div>
        </div>
        {currentStop && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: ACCENT_DIM, border: `1px solid ${ACCENT_BORDER}`, borderRadius: 20, padding: '5px 12px', fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: ACCENT, display: 'inline-block', boxShadow: `0 0 8px ${ACCENT}` }} />
            {currentStop.flag} {currentStop.capital}
          </div>
        )}
        <a href="/trip" style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', textDecoration: 'none', padding: '4px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)' }}>Public view →</a>
      </div>

      {/* Map */}
      <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
        {loading && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.25)', fontSize: 13, zIndex: 999 }}>Loading…</div>}

        {isClient && stops.length > 0 && (
          <MapContainer center={mapCenter} zoom={4} scrollWheelZoom={false} style={{ height: '100%', width: '100%', background: '#0a0a0a' }} zoomControl={true} attributionControl={false}>
            <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution='&copy; OpenStreetMap &copy; CARTO' />
            <MapEffects />

            {stops.slice(1).map((stop, i) => {
              const prev = stops[i]
              const reached = dateToMs(stop.arrivalDate) <= playheadMs
              return <Polyline key={`seg-${i}`} positions={[[prev.lat, prev.lng], [stop.lat, stop.lng]]} pathOptions={{ color: reached ? ACCENT : '#ffffff', weight: reached ? 2.5 : 1.5, opacity: reached ? 0.7 : 0.15, dashArray: reached ? undefined : '4 6' }} />
            })}

            {stops.map((stop) => {
              const reached = dateToMs(stop.arrivalDate) <= playheadMs
              const isSelected = stop.id === selectedId
              const isCurrent = stopStatus(stop) === 'current'
              const color = isCurrent ? ACCENT : reached ? '#d97706' : '#4b5563'
              return (
                <CircleMarker key={stop.id} center={[stop.lat, stop.lng]} radius={isCurrent ? 10 : isSelected ? 9 : 7} pathOptions={{ fillColor: color, fillOpacity: reached ? 0.9 : 0.4, color: isSelected ? '#ffffff' : color, weight: isSelected ? 2 : 1 }} eventHandlers={{ click: () => setSelectedId(stop.id) }}>
                  <Tooltip direction="top" offset={[0, -8]} opacity={0.95}><span style={{ fontSize: 12, fontFamily: 'Inter, sans-serif' }}>{stop.flag} {stop.capital}</span></Tooltip>
                </CircleMarker>
              )
            })}
          </MapContainer>
        )}

        {/* Left detail overlay */}
        {selectedStop && (
          <div style={{ position: 'absolute', top: 12, left: 12, bottom: 12, width: 300, zIndex: 1000, overflowY: 'auto', borderRadius: 14, background: 'rgba(10,10,10,0.95)', backdropFilter: 'blur(12px)', border: `1px solid rgba(245,158,11,0.12)` }}>
            <div style={{ padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 16 }}>
                <span style={{ fontSize: 26, lineHeight: 1 }}>{selectedStop.flag}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#fff', fontSize: 15, fontWeight: 600, lineHeight: 1.2 }}>
                    {selectedStop.capital}
                    {stopStatus(selectedStop) === 'current' && <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 400, background: ACCENT_DIM, color: ACCENT, borderRadius: 20, padding: '2px 7px', border: `1px solid ${ACCENT_BORDER}` }}>Here now</span>}
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, marginTop: 2 }}>{selectedStop.country} · {fmt(selectedStop.arrivalDate)} – {fmt(selectedStop.departureDate)}</div>
                </div>
                <button onClick={() => setSelectedId(null)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.2)', cursor: 'pointer', padding: 2, fontSize: 16, lineHeight: 1 }}>×</button>
              </div>

              <SectionLabel label="Events" color={ACCENT} />
              {selectedStop.events.length === 0
                ? <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12, fontStyle: 'italic', marginBottom: 16 }}>No events scheduled</div>
                : <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                    {selectedStop.events.map((ev) => (
                      <div key={ev.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '9px 11px' }}>
                        <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: 500, marginBottom: 3 }}>{ev.title || 'Untitled event'}</div>
                        {(ev.date || ev.location) && <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>{[ev.date, ev.location].filter(Boolean).join(' · ')}</div>}
                        {ev.sponsorSlot && <div style={{ color: ACCENT, fontSize: 10, marginTop: 3 }}>🏷 {ev.sponsorSlot}</div>}
                        {ev.notes && <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10, marginTop: 3, fontStyle: 'italic' }}>{ev.notes}</div>}
                        {ev.link && <a href={ev.link} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', marginTop: 5, color: ACCENT, fontSize: 10, textDecoration: 'none' }}>View event →</a>}
                      </div>
                    ))}
                  </div>
              }

              {selectedStop.contacts.length > 0 && (
                <>
                  <SectionLabel label="Contacts" color={ACCENT} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {selectedStop.contacts.map((cx) => (
                      <div key={cx.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: '9px 11px' }}>
                        <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: 500, marginBottom: 2 }}>👤 {cx.name}</div>
                        {(cx.role || cx.company) && <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>{[cx.role, cx.company].filter(Boolean).join(' @ ')}</div>}
                        <div style={{ marginTop: 5, display: 'flex', flexDirection: 'column', gap: 2 }}>
                          {cx.email && <a href={`mailto:${cx.email}`} style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, textDecoration: 'none' }}>📧 {cx.email}</a>}
                          {cx.phone && <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10 }}>📞 {cx.phone}</span>}
                          {cx.linkedin && <a href={cx.linkedin} target="_blank" rel="noopener noreferrer" style={{ color: ACCENT, fontSize: 10, textDecoration: 'none' }}>🔗 LinkedIn</a>}
                        </div>
                        {cx.notes && <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10, marginTop: 4, fontStyle: 'italic' }}>{cx.notes}</div>}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        <style>{`.leaflet-container { background: #0a0a0a !important; }`}</style>
      </div>

      {/* Timeline scrubber */}
      {stops.length >= 2 && (
        <TripTimeline
          stops={stops}
          tripStartMs={tripStartMs} tripEndMs={tripEndMs}
          playheadMs={playheadMs} viewStartMs={viewStartMs} viewEndMs={viewEndMs}
          onPlayheadChange={setPlayheadMs}
          onViewChange={(s, e) => { setViewStartMs(s); setViewEndMs(e) }}
          accent={ACCENT}
        />
      )}
    </div>
  )
}

function SectionLabel({ label, color }: { label: string; color: string }) {
  return <div style={{ fontSize: 10, color, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{label}</div>
}
