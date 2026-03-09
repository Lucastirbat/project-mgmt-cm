/**
 * /trip — Public, fan-facing standalone trip map.
 * No auth required. Fetches from /api/embed/trip (contacts stripped).
 */

import { useState, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, CircleMarker, Polyline, Tooltip, useMap, ZoomControl } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

// ─── Types ────────────────────────────────────────────────────────────────────

interface TripEvent {
  id: string
  title: string
  date?: string
  time?: string
  location?: string
  venueCoords?: [number, number]
  link?: string
  imageUrl?: string
  private?: boolean
}

interface TripStop {
  id: string
  country: string
  capital: string
  flag: string
  lat: number
  lng: number
  arrivalDate: string
  departureDate: string
  arrivalTime?: string
  departureTime?: string
  transport?: 'plane' | 'bus' | 'car'
  events: TripEvent[]
}

// ─── Timeline constants & helpers ─────────────────────────────────────────────

const MIN = 60_000
const HOUR = 3_600_000
const DAY = 86_400_000

function legMs(date: string, time?: string): number {
  if (time) return new Date(`${date}T${time}:00`).getTime()
  return new Date(date + 'T12:00:00').getTime()
}

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

// ─── Timeline helpers ─────────────────────────────────────────────────────────

const TRANSPORT_COLOR: Record<string, string> = { plane: 'rgba(99,102,241,0.55)', bus: 'rgba(16,185,129,0.55)', car: 'rgba(245,158,11,0.55)' }

function parseEventMs(date: string | undefined, time: string | undefined, stopYear: number): number | null {
  if (!date?.trim()) return null
  for (const attempt of [`${date} ${stopYear}`, date]) {
    const d = new Date(time ? `${attempt} ${time}` : attempt)
    if (!isNaN(d.getTime())) {
      if (!time) d.setHours(12, 0, 0, 0)
      return d.getTime()
    }
  }
  return null
}

function getStopAtPlayhead(stops: TripStop[], playheadMs: number): TripStop | null {
  if (!stops.length) return null
  let result = stops[0]
  for (const stop of stops) {
    if (legMs(stop.arrivalDate, stop.arrivalTime) <= playheadMs) result = stop
  }
  return result
}

function arcPoints(from: [number, number], to: [number, number], n = 40): [number, number][] {
  const midLat = (from[0] + to[0]) / 2
  const midLng = (from[1] + to[1]) / 2
  const dist = Math.hypot(to[0] - from[0], to[1] - from[1])
  const ctrlLat = midLat + dist * 0.35
  const ctrlLng = midLng
  const pts: [number, number][] = []
  for (let i = 0; i <= n; i++) {
    const t = i / n
    pts.push([
      (1 - t) * (1 - t) * from[0] + 2 * (1 - t) * t * ctrlLat + t * t * to[0],
      (1 - t) * (1 - t) * from[1] + 2 * (1 - t) * t * ctrlLng + t * t * to[1],
    ])
  }
  return pts
}

function getTravelerPos(stops: TripStop[], playheadMs: number): [number, number] | null {
  for (let i = 0; i < stops.length - 1; i++) {
    const curr = stops[i]
    const next = stops[i + 1]
    if (!curr.departureTime && !next.arrivalTime) continue
    const depMs = legMs(curr.departureDate, curr.departureTime)
    const arrMs = legMs(next.arrivalDate, next.arrivalTime)
    if (playheadMs < depMs || playheadMs > arrMs || arrMs <= depMs) continue
    const t = (playheadMs - depMs) / (arrMs - depMs)
    const from: [number, number] = [curr.lat, curr.lng]
    const to: [number, number] = [next.lat, next.lng]
    if (next.transport === 'plane') {
      const pts = arcPoints(from, to)
      const rawIdx = t * (pts.length - 1)
      const idx = Math.floor(rawIdx)
      const frac = rawIdx - idx
      const a = pts[Math.min(idx, pts.length - 1)]
      const b = pts[Math.min(idx + 1, pts.length - 1)]
      return [a[0] + frac * (b[0] - a[0]), a[1] + frac * (b[1] - a[1])]
    } else {
      return [curr.lat + t * (next.lat - curr.lat), curr.lng + t * (next.lng - curr.lng)]
    }
  }
  return null
}

// ─── Timeline component ───────────────────────────────────────────────────────

function TripTimeline({ stops, tripStartMs, tripEndMs, playheadMs, viewStartMs, viewEndMs, onPlayheadChange, onViewChange, accent }: {
  stops: TripStop[]
  tripStartMs: number; tripEndMs: number
  playheadMs: number; viewStartMs: number; viewEndMs: number
  onPlayheadChange: (ms: number) => void
  onViewChange: (s: number, e: number) => void
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
    function onTouchMove(e: TouchEvent) {
      if (!dragging.current || !containerRef.current) return
      e.preventDefault()
      const rect = containerRef.current.getBoundingClientRect()
      const x = e.touches[0].clientX - rect.left
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
    function onTouchEnd(e: TouchEvent) {
      if (dragging.current === 'pan' && panAnchor.current && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        const dist = Math.abs((e.changedTouches[0].clientX - rect.left) - panAnchor.current.mouseX)
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
    document.addEventListener('touchmove', onTouchMove, { passive: false })
    document.addEventListener('touchend', onTouchEnd)
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.removeEventListener('touchmove', onTouchMove)
      document.removeEventListener('touchend', onTouchEnd)
    }
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
  const { major, minor, fmt } = getTickConfig(visibleMs)
  const majorTicks = getTicks(viewStartMs, viewEndMs, major)
  const majorSet = new Set(majorTicks)
  const minorTicks = getTicks(viewStartMs, viewEndMs, minor).filter((t) => !majorSet.has(t))
  const playheadX = msToX(playheadMs)
  const todayX = msToX(Date.now())

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', height: 72, flexShrink: 0, backgroundColor: 'rgba(0,0,0,0.35)', borderTop: '1px solid rgba(255,255,255,0.06)', cursor: 'grab', userSelect: 'none', overflow: 'visible', touchAction: 'none' }}
      onWheel={handleWheel}
      onMouseDown={(e) => { const rect = containerRef.current!.getBoundingClientRect(); dragging.current = 'pan'; panAnchor.current = { mouseX: e.clientX - rect.left, viewStart: viewStartMs, viewEnd: viewEndMs }; e.preventDefault() }}
      onTouchStart={(e) => { const rect = containerRef.current!.getBoundingClientRect(); dragging.current = 'pan'; panAnchor.current = { mouseX: e.touches[0].clientX - rect.left, viewStart: viewStartMs, viewEnd: viewEndMs } }}
    >
      {/* Past zone */}
      <div style={{ position: 'absolute', top: 0, bottom: 0, left: Math.max(0, msToX(tripStartMs)), width: Math.max(0, Math.min(playheadX, containerWidth) - Math.max(0, msToX(tripStartMs))), backgroundColor: `${accent}10`, pointerEvents: 'none' }} />

      {/* Minor ticks */}
      {minorTicks.map((t) => { const x = msToX(t); if (x < 0 || x > containerWidth) return null; return <div key={t} style={{ position: 'absolute', bottom: 0, left: x, height: 10, borderLeft: '1px solid rgba(255,255,255,0.06)', pointerEvents: 'none' }} /> })}

      {/* Major ticks */}
      {majorTicks.map((t) => { const x = msToX(t); if (x < 0 || x > containerWidth) return null; return (
        <div key={t} style={{ position: 'absolute', top: 0, bottom: 0, left: x, pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', top: 0, bottom: 0, borderLeft: '1px solid rgba(255,255,255,0.12)' }} />
          <span style={{ position: 'absolute', top: 7, left: 4, fontSize: 9, color: 'rgba(255,255,255,0.3)', whiteSpace: 'nowrap', lineHeight: 1 }}>{fmt(new Date(t))}</span>
        </div>
      )})}

      {/* Today */}
      {todayX >= 0 && todayX <= containerWidth && <div style={{ position: 'absolute', top: 0, bottom: 0, left: todayX, borderLeft: '1px dashed rgba(255,255,255,0.22)', pointerEvents: 'none' }} />}

      {/* Stop flags */}
      {stops.map((stop) => { const x = msToX(legMs(stop.arrivalDate, stop.arrivalTime)); if (x < -20 || x > containerWidth + 20) return null; const reached = legMs(stop.arrivalDate, stop.arrivalTime) <= playheadMs; return (
        <div key={stop.id} style={{ position: 'absolute', top: 0, bottom: 0, left: x, pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', top: 0, bottom: 0, borderLeft: `1px solid ${reached ? `${accent}80` : 'rgba(255,255,255,0.18)'}` }} />
          <span style={{ position: 'absolute', bottom: 7, left: 4, fontSize: 12, lineHeight: 1, opacity: reached ? 1 : 0.3 }}>{stop.flag}</span>
        </div>
      )})}

      {/* Travel bands */}
      {stops.slice(0, -1).map((stop, i) => {
        const next = stops[i + 1]
        const x1 = msToX(legMs(stop.departureDate, stop.departureTime))
        const x2 = msToX(legMs(next.arrivalDate, next.arrivalTime))
        if (x2 < 0 || x1 > containerWidth) return null
        const color = TRANSPORT_COLOR[next.transport ?? ''] ?? 'rgba(148,163,184,0.4)'
        return <div key={`travel-${stop.id}`} title={`${stop.capital} → ${next.capital}`} style={{ position: 'absolute', bottom: 0, left: Math.max(0, x1), width: Math.max(2, Math.min(x2, containerWidth) - Math.max(0, x1)), height: 3, background: color, pointerEvents: 'none' }} />
      })}

      {/* Event dots */}
      {stops.flatMap(stop =>
        stop.events.filter(ev => !ev.private).map(ev => {
          const ms = parseEventMs(ev.date, ev.time, new Date(stop.arrivalDate + 'T12:00:00').getFullYear())
          if (ms === null) return null
          const x = msToX(ms)
          if (x < -6 || x > containerWidth + 6) return null
          const past = ms <= playheadMs
          return (
            <div key={ev.id} title={`${ev.title}${ev.time ? ' · ' + ev.time : ''}`} style={{ position: 'absolute', bottom: 22, left: x, transform: 'translateX(-50%)', pointerEvents: 'none' }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: past ? accent : 'rgba(255,255,255,0.25)', border: `1px solid ${past ? accent : 'rgba(255,255,255,0.35)'}`, boxShadow: past ? `0 0 4px ${accent}80` : 'none' }} />
            </div>
          )
        })
      )}

      {/* Playhead line */}
      <div style={{ position: 'absolute', top: 0, bottom: 0, left: playheadX, borderLeft: `2px solid ${accent}e6`, zIndex: 5, pointerEvents: 'none', transition: 'left 0.06s linear' }} />

      {/* Playhead label */}
      <span style={{ position: 'absolute', top: 20, left: playheadX + 6, fontSize: 8, color: 'rgba(255,255,255,0.7)', whiteSpace: 'nowrap', zIndex: 6, pointerEvents: 'none', lineHeight: 1 }}>{fmtPlayhead(playheadMs, visibleMs)}</span>

      {/* Draggable face handle */}
      {(() => {
        const progress = tripEndMs > tripStartMs ? (playheadMs - tripStartMs) / (tripEndMs - tripStartMs) : 0
        const faceSrc = progress < 1/3 ? '/face1.png' : progress < 2/3 ? '/face2.png' : '/face3.png'
        return (
          <div
            style={{ position: 'absolute', top: -34, left: playheadX - 24, width: 48, height: 48, borderRadius: '50%', border: `2.5px solid ${accent}`, cursor: 'ew-resize', boxShadow: `0 0 14px ${accent}c0`, zIndex: 2000, pointerEvents: 'auto', overflow: 'hidden', background: '#111' }}
            onMouseDown={(e) => { dragging.current = 'playhead'; e.preventDefault(); e.stopPropagation() }}
            onTouchStart={(e) => { dragging.current = 'playhead'; e.stopPropagation() }}
          >
            <img src={faceSrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          </div>
        )
      })()}

      <span style={{ position: 'absolute', bottom: 5, right: 7, fontSize: 8, color: 'rgba(255,255,255,0.15)', lineHeight: 1 }}>scroll to zoom · drag to pan</span>
    </div>
  )
}

// ─── Map effects ──────────────────────────────────────────────────────────────

const TODAY = new Date().toISOString().slice(0, 10)

function stopStatus(stop: TripStop): 'past' | 'current' | 'upcoming' {
  if (TODAY >= stop.departureDate) return 'past'
  if (TODAY >= stop.arrivalDate) return 'current'
  return 'upcoming'
}

function fmt(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en', { month: 'short', day: 'numeric' })
}

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
    style.id = 'pub-map-transitions'
    style.textContent = '.leaflet-overlay-pane path { transition: stroke 0.4s ease, stroke-opacity 0.35s ease, fill 0.4s ease, fill-opacity 0.35s ease; }'
    document.head.appendChild(style)
    return () => { container.removeEventListener('wheel', onWheel); document.getElementById('pub-map-transitions')?.remove() }
  }, [map])
  return null
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const ACCENT = '#6366f1'

export default function PublicTripPage() {
  const [stops, setStops] = useState<TripStop[]>([])
  const [loading, setLoading] = useState(true)
  const [isClient, setIsClient] = useState(false)
  const tripStartMs = stops.length ? legMs(stops[0].arrivalDate, stops[0].arrivalTime) : Date.now() - DAY
  const tripEndMs = stops.length ? legMs(stops[stops.length - 1].departureDate, stops[stops.length - 1].departureTime) : Date.now() + DAY

  const [playheadMs, setPlayheadMs] = useState<number>(() => Date.now())
  const [viewStartMs, setViewStartMs] = useState(tripStartMs)
  const [viewEndMs, setViewEndMs] = useState(tripEndMs)

  useEffect(() => {
    if (stops.length) {
      const s = legMs(stops[0].arrivalDate, stops[0].arrivalTime)
      const e = legMs(stops[stops.length - 1].departureDate, stops[stops.length - 1].departureTime)
      setPlayheadMs(Math.max(s, Math.min(e, Date.now())))
      setViewStartMs(s)
      setViewEndMs(e)
    }
  }, [stops.length])

  // Preload all face images so they're cached before the playhead crosses 33%/66%
  useEffect(() => {
    ;['/face1.png', '/face2.png', '/face3.png'].forEach((src) => { const img = new Image(); img.src = src })
  }, [])

  useEffect(() => {
    setIsClient(true)
    fetch('/api/embed/trip')
      .then((r) => r.json())
      .then((d: { stops: TripStop[] }) => {
        setStops(d.stops ?? [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const currentStop = stops.find((s) => stopStatus(s) === 'current')
  const panelStop = getStopAtPlayhead(stops, playheadMs)

  const mapCenter: [number, number] = currentStop ? [currentStop.lat, currentStop.lng] : [50.0, 20.0]
  const travelerPos = getTravelerPos(stops, playheadMs)

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: '#0a0a0a', fontFamily: 'Inter, sans-serif', overflow: 'hidden' }}>
      {/* Map */}
      <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
        {loading && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.25)', fontSize: 13 }}>Loading map…</div>}

        {isClient && stops.length > 0 && (
          <MapContainer center={mapCenter} zoom={4} scrollWheelZoom={false} style={{ height: '100%', width: '100%', background: '#0a0a0a' }} zoomControl={false} attributionControl={false}>
            <ZoomControl position="topright" />
            <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution='&copy; OpenStreetMap &copy; CARTO' />
            <MapEffects />

            {/* Route segments */}
            {stops.slice(1).map((stop, i) => {
              const prev = stops[i]
              const reached = legMs(stop.arrivalDate, stop.arrivalTime) <= playheadMs
              const isPlane = stop.transport === 'plane'
              const positions = isPlane
                ? arcPoints([prev.lat, prev.lng], [stop.lat, stop.lng])
                : [[prev.lat, prev.lng], [stop.lat, stop.lng]] as [number, number][]
              return <Polyline
                key={`seg-${i}`}
                positions={positions}
                pathOptions={{ color: reached ? ACCENT : '#ffffff', weight: reached ? 2.5 : 1.5, opacity: reached ? 0.7 : 0.15, dashArray: reached ? undefined : isPlane ? '3 5' : '4 6' }}
              />
            })}

            {/* City markers */}
            {stops.map((stop) => {
              const reached = legMs(stop.arrivalDate, stop.arrivalTime) <= playheadMs
              const isSelected = stop.id === panelStop?.id
              const isCurrent = stopStatus(stop) === 'current'
              const color = isCurrent ? ACCENT : reached ? '#a78bfa' : '#4b5563'
              return (
                <CircleMarker key={stop.id} center={[stop.lat, stop.lng]} radius={isCurrent ? 10 : isSelected ? 9 : 7} pathOptions={{ fillColor: color, fillOpacity: reached ? 0.9 : 0.4, color: isSelected ? '#ffffff' : color, weight: isSelected ? 2 : 1 }} eventHandlers={{ click: () => setPlayheadMs(Math.max(tripStartMs, Math.min(tripEndMs, legMs(stop.arrivalDate, stop.arrivalTime)))) }}>
                  <Tooltip direction="top" offset={[0, -8]} opacity={0.95}><span style={{ fontSize: 12, fontFamily: 'Inter, sans-serif' }}>{stop.flag} {stop.capital}</span></Tooltip>
                </CircleMarker>
              )
            })}

            {/* Animated traveler marker */}
            {travelerPos && (
              <CircleMarker center={travelerPos} radius={8} pathOptions={{ fillColor: ACCENT, fillOpacity: 1, color: '#fff', weight: 2.5 }}>
                <Tooltip direction="top" offset={[0, -10]} opacity={0.95} permanent={false}>
                  <span style={{ fontSize: 12, fontFamily: 'Inter, sans-serif' }}>✈️ In transit</span>
                </Tooltip>
              </CircleMarker>
            )}

            {/* Venue markers for current stop's events */}
            {panelStop?.events.filter(ev => !ev.private).map((ev) => ev.venueCoords ? (
              <CircleMarker key={`venue-${ev.id}`} center={ev.venueCoords} radius={6}
                pathOptions={{ fillColor: '#f59e0b', fillOpacity: 0.9, color: '#fff', weight: 1.5 }}>
                <Tooltip direction="top" offset={[0, -6]} opacity={0.95}>
                  <span style={{ fontSize: 12, fontFamily: 'Inter, sans-serif' }}>📍 {ev.title}</span>
                </Tooltip>
              </CircleMarker>
            ) : null)}
          </MapContainer>
        )}

        {/* Friends view button — top right floating */}
        <a href="/trip/friends" style={{ position: 'absolute', top: 12, right: 52, zIndex: 1000, fontSize: 11, color: 'rgba(255,255,255,0.4)', textDecoration: 'none', padding: '5px 11px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }}>Friends view →</a>

        {/* Left detail overlay — always visible, tracks playhead */}
        {panelStop && (
          <div className="trip-panel" style={{ position: 'absolute', top: 12, left: 12, bottom: 12, width: 280, zIndex: 1000, overflowY: 'auto', borderRadius: 14, background: 'rgba(10,10,10,0.94)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div style={{ padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 14 }}>
                <span style={{ fontSize: 26, lineHeight: 1 }}>{panelStop.flag}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#fff', fontSize: 15, fontWeight: 600, lineHeight: 1.2 }}>
                    {panelStop.capital}
                    {stopStatus(panelStop) === 'current' && <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 400, background: 'rgba(99,102,241,0.2)', color: '#818cf8', borderRadius: 20, padding: '2px 7px' }}>Here now</span>}
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11, marginTop: 2 }}>{panelStop.country} · {fmt(panelStop.arrivalDate)} – {fmt(panelStop.departureDate)}</div>
                  {panelStop.transport && (
                    <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: 10, marginTop: 1 }}>
                      {{ plane: '✈️', bus: '🚌', car: '🚗' }[panelStop.transport]} via {panelStop.transport}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Events</div>
              {panelStop.events.filter(ev => !ev.private).length === 0
                ? <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12, fontStyle: 'italic' }}>No events scheduled</div>
                : <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {panelStop.events.filter(ev => !ev.private).map((ev) => (
                      <div key={ev.id} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, overflow: 'hidden' }}>
                        {(ev.imageUrl || ev.link) && <img src={ev.imageUrl ?? `/api/og-image?url=${encodeURIComponent(ev.link!)}`} alt="" style={{ width: '100%', height: 100, objectFit: 'cover', display: 'block' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />}
                        <div style={{ padding: '9px 11px' }}>
                          <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: 500, marginBottom: 3 }}>{ev.title || 'Untitled event'}</div>
                          {(ev.date || ev.time || ev.location) && <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{[[ev.date, ev.time].filter(Boolean).join(' '), ev.location].filter(Boolean).join(' · ')}</div>}
                          {ev.link && <a href={ev.link} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', marginTop: 5, color: '#818cf8', fontSize: 10, textDecoration: 'none' }}>View event →</a>}
                        </div>
                      </div>
                    ))}
                  </div>
              }
            </div>
          </div>
        )}

        <style>{`
          .leaflet-container { background: #0a0a0a !important; }
          .trip-panel::-webkit-scrollbar { width: 3px; }
          .trip-panel::-webkit-scrollbar-track { background: transparent; }
          .trip-panel::-webkit-scrollbar-thumb { background: rgba(99,102,241,0.25); border-radius: 2px; }
          .trip-panel::-webkit-scrollbar-thumb:hover { background: rgba(99,102,241,0.45); }
          .trip-panel { scrollbar-width: thin; scrollbar-color: rgba(99,102,241,0.25) transparent; }
          @media (max-width: 639px) {
            .trip-panel {
              position: absolute !important;
              top: auto !important;
              left: 0 !important;
              right: 0 !important;
              bottom: 0 !important;
              width: 100% !important;
              height: 58% !important;
              border-radius: 16px 16px 0 0 !important;
              border-left: none !important;
              border-right: none !important;
              border-bottom: none !important;
            }
          }
        `}</style>
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
