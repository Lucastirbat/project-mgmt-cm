import { useState, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, CircleMarker, Polyline, Tooltip, useMap, ZoomControl } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import type { Block, TripStop, TripEvent, TripContact } from '../../data/schema'

interface Props {
  block: Block
  onChange: (updated: Block) => void
}

const TODAY = new Date().toISOString().slice(0, 10)

function stopStatus(stop: TripStop): 'past' | 'current' | 'upcoming' {
  if (TODAY >= stop.departureDate) return 'past'
  if (TODAY >= stop.arrivalDate) return 'current'
  return 'upcoming'
}

function formatDateRange(arrival: string, departure: string): string {
  const fmt = (d: string) =>
    new Date(d + 'T12:00:00').toLocaleDateString('en', { month: 'short', day: 'numeric' })
  return `${fmt(arrival)} – ${fmt(departure)}`
}

function uid() {
  return Math.random().toString(36).slice(2, 9)
}

function legMs(date: string, time?: string): number {
  if (time) return new Date(`${date}T${time}:00`).getTime()
  return new Date(date + 'T12:00:00').getTime()
}

function arcPoints(from: [number, number], to: [number, number], n = 40): [number, number][] {
  const midLat = (from[0] + to[0]) / 2
  const midLng = (from[1] + to[1]) / 2
  const dist = Math.hypot(to[0] - from[0], to[1] - from[1])
  const ctrlLat = midLat + dist * 0.35
  const pts: [number, number][] = []
  for (let i = 0; i <= n; i++) {
    const t = i / n
    pts.push([
      (1 - t) * (1 - t) * from[0] + 2 * (1 - t) * t * ctrlLat + t * t * to[0],
      (1 - t) * (1 - t) * from[1] + 2 * (1 - t) * t * midLng + t * t * to[1],
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

// ─── Timeline constants ───────────────────────────────────────────────────────

const MIN = 60_000
const HOUR = 3_600_000
const DAY = 86_400_000

// ─── Timeline helpers ─────────────────────────────────────────────────────────

function getTickConfig(visibleMs: number): {
  major: number
  minor: number
  formatMajor: (d: Date) => string
} {
  if (visibleMs > 30 * DAY)
    return { major: 7 * DAY, minor: DAY, formatMajor: (d) => d.toLocaleDateString('en', { month: 'short', day: 'numeric' }) }
  if (visibleMs > 5 * DAY)
    return { major: DAY, minor: 6 * HOUR, formatMajor: (d) => d.toLocaleDateString('en', { month: 'short', day: 'numeric' }) }
  if (visibleMs > DAY)
    return { major: 6 * HOUR, minor: HOUR, formatMajor: (d) => d.toLocaleDateString('en', { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: false }) }
  if (visibleMs > 4 * HOUR)
    return { major: HOUR, minor: 15 * MIN, formatMajor: (d) => d.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: false }) }
  return {
    major: 30 * MIN, minor: 5 * MIN,
    formatMajor: (d) => d.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: false }),
  }
}

function getTicks(start: number, end: number, interval: number): number[] {
  const first = Math.ceil(start / interval) * interval
  const result: number[] = []
  for (let t = first; t <= end; t += interval) result.push(t)
  return result
}

function formatPlayheadLabel(ms: number, visibleMs: number): string {
  const d = new Date(ms)
  if (visibleMs > 3 * DAY) return d.toLocaleDateString('en', { month: 'short', day: 'numeric' })
  if (visibleMs > HOUR)
    return d.toLocaleDateString('en', { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: false })
  return d.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: false })
}

// ─── TripTimeline ─────────────────────────────────────────────────────────────

function TripTimeline({
  stops,
  tripStartMs,
  tripEndMs,
  playheadMs,
  viewStartMs,
  viewEndMs,
  onPlayheadChange,
  onViewChange,
}: {
  stops: TripStop[]
  tripStartMs: number
  tripEndMs: number
  playheadMs: number
  viewStartMs: number
  viewEndMs: number
  onPlayheadChange: (ms: number) => void
  onViewChange: (start: number, end: number) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(800)

  // Keep callbacks and view state in refs so event listeners don't go stale
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

  // Global mouse events for drag
  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!dragging.current || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const { viewStartMs: vs, viewEndMs: ve, containerWidth: w } = viewRef.current

      if (dragging.current === 'playhead') {
        const ms = Math.max(tripStartMs, Math.min(tripEndMs, vs + (x / w) * (ve - vs)))
        cbRef.current.onPlayheadChange(ms)
      } else if (dragging.current === 'pan' && panAnchor.current) {
        const { mouseX, viewStart, viewEnd } = panAnchor.current
        const msPerPx = (viewEnd - viewStart) / w
        const delta = (mouseX - x) * msPerPx
        let ns = viewStart + delta
        let ne = viewEnd + delta
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
          // It was a click — jump playhead to that position
          const { viewStartMs: vs, viewEndMs: ve, containerWidth: w } = viewRef.current
          const ms = vs + (panAnchor.current.mouseX / w) * (ve - vs)
          cbRef.current.onPlayheadChange(Math.max(tripStartMs, Math.min(tripEndMs, ms)))
        }
      }
      dragging.current = null
      panAnchor.current = null
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
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
    let ns = mouseMs - ratio * newDuration
    let ne = mouseMs + (1 - ratio) * newDuration
    if (ns < tripStartMs) { ne += tripStartMs - ns; ns = tripStartMs }
    if (ne > tripEndMs) { ns -= ne - tripEndMs; ne = tripEndMs }
    onViewChange(Math.max(tripStartMs, ns), Math.min(tripEndMs, ne))
  }

  function handleContainerMouseDown(e: React.MouseEvent) {
    const rect = containerRef.current!.getBoundingClientRect()
    dragging.current = 'pan'
    panAnchor.current = { mouseX: e.clientX - rect.left, viewStart: viewStartMs, viewEnd: viewEndMs }
    e.preventDefault()
  }

  function handlePlayheadMouseDown(e: React.MouseEvent) {
    dragging.current = 'playhead'
    e.preventDefault()
    e.stopPropagation()
  }

  // Helpers that use current state (for render)
  const visibleMs = viewEndMs - viewStartMs

  function msToX(ms: number): number {
    return ((ms - viewStartMs) / visibleMs) * containerWidth
  }

  const { major, minor, formatMajor } = getTickConfig(visibleMs)
  const majorTicks = getTicks(viewStartMs, viewEndMs, major)
  const majorSet = new Set(majorTicks)
  const minorTicks = getTicks(viewStartMs, viewEndMs, minor).filter((t) => !majorSet.has(t))

  const playheadX = msToX(playheadMs)
  const todayX = msToX(Date.now())

  return (
    <div
      ref={containerRef}
      className="relative select-none overflow-hidden rounded-xl border border-surface-border"
      style={{ height: 72, backgroundColor: 'rgba(0,0,0,0.35)', cursor: 'grab' }}
      onWheel={handleWheel}
      onMouseDown={handleContainerMouseDown}
    >
      {/* Past zone shading */}
      <div
        className="absolute inset-y-0 pointer-events-none"
        style={{
          left: Math.max(0, msToX(tripStartMs)),
          width: Math.max(0, Math.min(playheadX, containerWidth) - Math.max(0, msToX(tripStartMs))),
          backgroundColor: 'rgba(99,102,241,0.07)',
        }}
      />

      {/* Minor ticks */}
      {minorTicks.map((t) => {
        const x = msToX(t)
        if (x < 0 || x > containerWidth) return null
        return (
          <div
            key={t}
            className="absolute bottom-0 pointer-events-none"
            style={{ left: x, height: 10, borderLeft: '1px solid rgba(255,255,255,0.06)' }}
          />
        )
      })}

      {/* Major ticks + labels */}
      {majorTicks.map((t) => {
        const x = msToX(t)
        if (x < 0 || x > containerWidth) return null
        return (
          <div key={t} className="absolute inset-y-0 pointer-events-none" style={{ left: x }}>
            <div className="absolute inset-y-0" style={{ borderLeft: '1px solid rgba(255,255,255,0.12)' }} />
            <span
              className="absolute text-white/30"
              style={{ top: 7, left: 4, fontSize: 9, whiteSpace: 'nowrap', lineHeight: 1 }}
            >
              {formatMajor(new Date(t))}
            </span>
          </div>
        )
      })}

      {/* Today marker */}
      {todayX >= 0 && todayX <= containerWidth && (
        <div
          className="absolute inset-y-0 pointer-events-none"
          style={{ left: todayX, borderLeft: '1px dashed rgba(255,255,255,0.22)' }}
        />
      )}

      {/* Stop arrival markers */}
      {stops.map((stop) => {
        const x = msToX(legMs(stop.arrivalDate, stop.arrivalTime))
        if (x < -20 || x > containerWidth + 20) return null
        const reached = legMs(stop.arrivalDate, stop.arrivalTime) <= playheadMs
        return (
          <div key={stop.id} className="absolute inset-y-0 pointer-events-none" style={{ left: x }}>
            <div
              className="absolute inset-y-0"
              style={{ borderLeft: `1px solid ${reached ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.18)'}` }}
            />
            <span
              style={{
                position: 'absolute',
                bottom: 7,
                left: 4,
                fontSize: 12,
                lineHeight: 1,
                opacity: reached ? 1 : 0.3,
              }}
            >
              {stop.flag}
            </span>
          </div>
        )
      })}

      {/* Playhead line */}
      <div
        className="absolute inset-y-0 pointer-events-none"
        style={{ left: playheadX, borderLeft: '2px solid rgba(99,102,241,0.9)', zIndex: 5, transition: 'left 0.06s linear' }}
      />

      {/* Playhead label */}
      <span
        className="absolute text-white/70 pointer-events-none"
        style={{ top: 20, left: playheadX + 6, fontSize: 8, whiteSpace: 'nowrap', lineHeight: 1, zIndex: 6 }}
      >
        {formatPlayheadLabel(playheadMs, visibleMs)}
      </span>

      {/* Draggable circle handle */}
      <div
        className="absolute pointer-events-auto"
        title="Drag to scrub"
        style={{
          top: 0,
          left: playheadX - 7,
          width: 14,
          height: 14,
          borderRadius: '50%',
          backgroundColor: '#6366f1',
          border: '2.5px solid rgba(255,255,255,0.85)',
          cursor: 'ew-resize',
          boxShadow: '0 0 10px rgba(99,102,241,0.7)',
          zIndex: 10,
        }}
        onMouseDown={handlePlayheadMouseDown}
      />

      {/* Hint */}
      <span
        className="absolute text-white/15 pointer-events-none"
        style={{ bottom: 5, right: 7, fontSize: 8, lineHeight: 1 }}
      >
        scroll to zoom · drag to pan
      </span>
    </div>
  )
}

// ─── Map effects: slower scroll zoom + CSS path transitions ──────────────────

function MapEffects({ styleId }: { styleId: string }) {
  const map = useMap()
  useEffect(() => {
    // Debounced scroll zoom: collect all wheel events within 100ms, apply ±1 step once
    let accDir = 0
    let timer: ReturnType<typeof setTimeout> | null = null
    const container = map.getContainer()
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      accDir += e.deltaY > 0 ? -1 : 1
      if (timer !== null) clearTimeout(timer)
      timer = setTimeout(() => {
        if (accDir !== 0) map.setZoom(map.getZoom() + Math.sign(accDir))
        accDir = 0
        timer = null
      }, 100)
    }
    container.addEventListener('wheel', onWheel, { passive: false })

    // CSS transitions for smooth route colour changes
    const style = document.createElement('style')
    style.id = styleId
    style.textContent =
      '.leaflet-overlay-pane path { transition: stroke 0.4s ease, stroke-opacity 0.35s ease, stroke-width 0.25s ease, fill 0.4s ease, fill-opacity 0.35s ease; }'
    document.head.appendChild(style)

    return () => {
      container.removeEventListener('wheel', onWheel)
      document.getElementById(styleId)?.remove()
    }
  }, [map, styleId])
  return null
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function TravelMapBlock({ block, onChange }: Props) {
  const stops: TripStop[] = block.tripStops ?? []
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    const cur = stops.find((s) => stopStatus(s) === 'current')
    return cur?.id ?? stops[0]?.id ?? null
  })
  const [isClient, setIsClient] = useState(false)

  // Timeline state
  const tripStartMs = stops.length ? legMs(stops[0].arrivalDate, stops[0].arrivalTime) : Date.now() - DAY
  const tripEndMs = stops.length ? legMs(stops[stops.length - 1].departureDate, stops[stops.length - 1].departureTime) : Date.now() + DAY

  const [playheadMs, setPlayheadMs] = useState<number>(() =>
    Math.max(tripStartMs, Math.min(tripEndMs, Date.now())),
  )
  const travelerPos = getTravelerPos(stops, playheadMs)
  const [viewStartMs, setViewStartMs] = useState(tripStartMs)
  const [viewEndMs, setViewEndMs] = useState(tripEndMs)

  function handleViewChange(start: number, end: number) {
    setViewStartMs(start)
    setViewEndMs(end)
  }

  useEffect(() => {
    setIsClient(true)
  }, [])

  const selectedStop = stops.find((s) => s.id === selectedId) ?? null
  const currentStop = stops.find((s) => stopStatus(s) === 'current')
  const mapCenter: [number, number] = currentStop ? [currentStop.lat, currentStop.lng] : [50.0, 20.0]

  function updateStop(updated: TripStop) {
    onChange({ ...block, tripStops: stops.map((s) => (s.id === updated.id ? updated : s)) })
  }

  function addStop() {
    // Insert after selected stop, or at end if none selected
    const insertIdx = selectedId ? stops.findIndex((s) => s.id === selectedId) + 1 : stops.length
    const prevStop = stops[insertIdx - 1]
    const nextStop = stops[insertIdx]
    const arrivalDate = prevStop?.departureDate ?? new Date().toISOString().slice(0, 10)
    const departureDate = nextStop?.arrivalDate
      ?? new Date(new Date(arrivalDate).getTime() + 3 * 86400000).toISOString().slice(0, 10)
    const newStop: TripStop = {
      id: `stop-${uid()}`,
      country: 'Country',
      capital: 'City',
      flag: '🏳️',
      lat: prevStop && nextStop
        ? (prevStop.lat + nextStop.lat) / 2
        : prevStop ? prevStop.lat + 2 : 48.8566,
      lng: prevStop && nextStop
        ? (prevStop.lng + nextStop.lng) / 2
        : prevStop ? prevStop.lng + 2 : 2.3522,
      arrivalDate,
      departureDate,
      events: [],
      contacts: [],
    }
    const newStops = [...stops.slice(0, insertIdx), newStop, ...stops.slice(insertIdx)]
    onChange({ ...block, tripStops: newStops })
    setSelectedId(newStop.id)
  }

  function deleteStop(id: string) {
    const newStops = stops.filter((s) => s.id !== id)
    onChange({ ...block, tripStops: newStops })
    if (selectedId === id) setSelectedId(newStops[0]?.id ?? null)
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Live status banner */}
      {currentStop && (
        <div
          className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm"
          style={{ backgroundColor: '#6366f115', border: '1px solid #6366f130' }}
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
          </span>
          <span className="text-white/70">
            Currently in{' '}
            <span className="text-white font-medium">
              {currentStop.flag} {currentStop.capital}, {currentStop.country}
            </span>
          </span>
          <span className="ml-auto text-white/30 text-xs">
            {formatDateRange(currentStop.arrivalDate, currentStop.departureDate)}
          </span>
        </div>
      )}

      {/* Map */}
      <div className="relative rounded-xl overflow-hidden border border-surface-border" style={{ height: 390 }}>
        {isClient && (
          <MapContainer
            center={mapCenter}
            zoom={4}
            scrollWheelZoom={false}
            style={{ height: '100%', width: '100%', background: '#0f0f0f' }}
            zoomControl={false}
            attributionControl={false}
          >
            <ZoomControl position="topright" />
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; OpenStreetMap &copy; CARTO'
            />
            <MapEffects styleId="trip-map-transitions" />

            {/* Route segments: highlight those reached by the playhead */}
            {stops.slice(1).map((stop, i) => {
              const prev = stops[i]
              const reached = legMs(stop.arrivalDate, stop.arrivalTime) <= playheadMs
              const isPlane = stop.transport === 'plane'
              const positions = isPlane
                ? arcPoints([prev.lat, prev.lng], [stop.lat, stop.lng])
                : [[prev.lat, prev.lng], [stop.lat, stop.lng]] as [number, number][]
              return (
                <Polyline
                  key={`seg-${i}`}
                  positions={positions}
                  pathOptions={{
                    color: reached ? '#6366f1' : '#ffffff',
                    weight: reached ? 2.5 : 1.5,
                    opacity: reached ? 0.75 : 0.18,
                    dashArray: reached ? undefined : isPlane ? '3 5' : '4 6',
                  }}
                />
              )
            })}

            {/* Animated traveler marker */}
            {travelerPos && (
              <CircleMarker center={travelerPos} radius={8} pathOptions={{ fillColor: '#6366f1', fillOpacity: 1, color: '#fff', weight: 2.5 }}>
                <Tooltip direction="top" offset={[0, -10]} opacity={0.95}>
                  <span style={{ fontSize: 12, fontFamily: 'Inter, sans-serif' }}>✈️ In transit</span>
                </Tooltip>
              </CircleMarker>
            )}

            {/* City markers */}
            {stops.map((stop) => {
              const status = stopStatus(stop)
              const isSelected = stop.id === selectedId
              const reached = legMs(stop.arrivalDate, stop.arrivalTime) <= playheadMs
              const color =
                status === 'current' ? '#6366f1' : reached ? '#a78bfa' : '#4b5563'
              const radius = status === 'current' ? 10 : isSelected ? 9 : 7

              return (
                <CircleMarker
                  key={stop.id}
                  center={[stop.lat, stop.lng]}
                  radius={radius}
                  pathOptions={{
                    fillColor: color,
                    fillOpacity: reached ? 0.9 : 0.4,
                    color: isSelected ? '#ffffff' : color,
                    weight: isSelected ? 2 : 1,
                  }}
                  eventHandlers={{ click: () => setSelectedId(stop.id) }}
                >
                  <Tooltip direction="top" offset={[0, -8]} opacity={0.9}>
                    <span style={{ fontSize: 12, fontFamily: 'Inter, sans-serif' }}>
                      {stop.flag} {stop.capital}
                    </span>
                  </Tooltip>
                </CircleMarker>
              )
            })}
            {/* Venue markers for selected stop's events */}
            {selectedStop?.events.map((ev) => ev.venueCoords ? (
              <CircleMarker key={`venue-${ev.id}`} center={ev.venueCoords} radius={6}
                pathOptions={{ fillColor: '#f59e0b', fillOpacity: 0.9, color: '#fff', weight: 1.5 }}>
                <Tooltip direction="top" offset={[0, -6]} opacity={0.95}>
                  <span style={{ fontSize: 12, fontFamily: 'Inter, sans-serif' }}>📍 {ev.title}</span>
                </Tooltip>
              </CircleMarker>
            ) : null)}
          </MapContainer>
        )}

        {/* Left detail card overlay */}
        {selectedStop && (
          <div
            className="absolute top-3 left-3 bottom-3 w-72 z-[1000] overflow-y-auto rounded-xl"
            style={{
              background: 'rgba(15,15,15,0.93)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <StopDetail stop={selectedStop} onUpdate={updateStop} onDelete={() => deleteStop(selectedStop.id)} onClose={() => setSelectedId(null)} />
          </div>
        )}
      </div>

      {/* Timeline scrubber */}
      {stops.length >= 2 && (
        <TripTimeline
          stops={stops}
          tripStartMs={tripStartMs}
          tripEndMs={tripEndMs}
          playheadMs={playheadMs}
          viewStartMs={viewStartMs}
          viewEndMs={viewEndMs}
          onPlayheadChange={setPlayheadMs}
          onViewChange={handleViewChange}
        />
      )}

      {/* Add stop */}
      <button
        onClick={addStop}
        className="self-start flex items-center gap-1.5 text-xs text-white/30 hover:text-accent transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        {selectedId ? `Insert stop after ${stops.find(s => s.id === selectedId)?.capital ?? 'selected'}` : 'Add stop'}
      </button>

    </div>
  )
}

// ─── Stop Detail Panel ────────────────────────────────────────────────────────

function StopDetail({ stop, onUpdate, onDelete, onClose }: { stop: TripStop; onUpdate: (s: TripStop) => void; onDelete?: () => void; onClose?: () => void }) {
  const status = stopStatus(stop)

  function addEvent() {
    const newEvent: TripEvent = { id: `ev-${uid()}`, title: '', date: '', notes: '' }
    onUpdate({ ...stop, events: [...stop.events, newEvent] })
  }

  function updateEvent(updated: TripEvent) {
    onUpdate({ ...stop, events: stop.events.map((e) => (e.id === updated.id ? updated : e)) })
  }

  function deleteEvent(id: string) {
    onUpdate({ ...stop, events: stop.events.filter((e) => e.id !== id) })
  }

  function addContact() {
    const newContact: TripContact = {
      id: `cx-${uid()}`, name: '', role: '', company: '', linkedin: '', email: '', phone: '', notes: '',
    }
    onUpdate({ ...stop, contacts: [...stop.contacts, newContact] })
  }

  function updateContact(updated: TripContact) {
    onUpdate({ ...stop, contacts: stop.contacts.map((c) => (c.id === updated.id ? updated : c)) })
  }

  function deleteContact(id: string) {
    onUpdate({ ...stop, contacts: stop.contacts.filter((c) => c.id !== id) })
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-start gap-3">
        <input
          value={stop.flag}
          onChange={(e) => onUpdate({ ...stop, flag: e.target.value })}
          className="text-2xl mt-0.5 bg-transparent outline-none w-10 shrink-0"
          maxLength={2}
          title="Flag emoji"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <input
              value={stop.capital}
              onChange={(e) => onUpdate({ ...stop, capital: e.target.value })}
              className="bg-transparent text-white font-semibold text-base outline-none border-b border-transparent focus:border-white/20 transition-colors flex-1 min-w-0"
              placeholder="City"
            />
            {status === 'current' && (
              <span className="text-[10px] font-normal px-1.5 py-0.5 rounded-full bg-accent/20 text-accent shrink-0">
                Here now
              </span>
            )}
          </div>
          <input
            value={stop.country}
            onChange={(e) => onUpdate({ ...stop, country: e.target.value })}
            className="bg-transparent text-white/35 text-xs mt-0.5 outline-none border-b border-transparent focus:border-white/15 transition-colors w-full"
            placeholder="Country"
          />
        </div>
        <div className="flex items-center gap-1 shrink-0 mt-0.5">
          {onDelete && (
            <button
              onClick={onDelete}
              title="Delete stop"
              className="text-white/20 hover:text-red-400/70 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="text-white/25 hover:text-white/60 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Dates */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 flex-1">
          <span className="text-white/30 text-[10px] w-16 shrink-0">Arrival date</span>
          <input
            type="date"
            value={stop.arrivalDate}
            onChange={(e) => onUpdate({ ...stop, arrivalDate: e.target.value })}
            className="bg-transparent text-white/60 text-xs outline-none border-b border-white/10 focus:border-white/25 transition-colors w-full"
            style={{ colorScheme: 'dark' }}
          />
        </div>
        <div className="flex items-center gap-2 flex-1">
          <span className="text-white/30 text-[10px] w-16 shrink-0">Depart date</span>
          <input
            type="date"
            value={stop.departureDate}
            onChange={(e) => onUpdate({ ...stop, departureDate: e.target.value })}
            className="bg-transparent text-white/60 text-xs outline-none border-b border-white/10 focus:border-white/25 transition-colors w-full"
            style={{ colorScheme: 'dark' }}
          />
        </div>
      </div>

      {/* Coordinates */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 flex-1">
          <span className="text-white/30 text-[10px] w-16 shrink-0">Latitude</span>
          <input
            type="number"
            step="0.0001"
            value={stop.lat}
            onChange={(e) => onUpdate({ ...stop, lat: parseFloat(e.target.value) || 0 })}
            className="bg-transparent text-white/60 text-xs outline-none border-b border-white/10 focus:border-white/25 transition-colors w-full"
          />
        </div>
        <div className="flex items-center gap-2 flex-1">
          <span className="text-white/30 text-[10px] w-16 shrink-0">Longitude</span>
          <input
            type="number"
            step="0.0001"
            value={stop.lng}
            onChange={(e) => onUpdate({ ...stop, lng: parseFloat(e.target.value) || 0 })}
            className="bg-transparent text-white/60 text-xs outline-none border-b border-white/10 focus:border-white/25 transition-colors w-full"
          />
        </div>
      </div>

      {/* Transport + times */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-white/35 text-[10px] font-semibold uppercase tracking-wider w-16">Arrives via</span>
          <div className="flex gap-1">
            {(['plane', 'bus', 'car'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => onUpdate({ ...stop, transport: stop.transport === mode ? undefined : mode })}
                className="text-xs px-2 py-0.5 rounded-md border transition-colors"
                style={{
                  background: stop.transport === mode ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.03)',
                  borderColor: stop.transport === mode ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.08)',
                  color: stop.transport === mode ? '#a5b4fc' : 'rgba(255,255,255,0.3)',
                }}
              >
                {{ plane: '✈️ plane', bus: '🚌 bus', car: '🚗 car' }[mode]}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 flex-1">
            <span className="text-white/30 text-[10px] w-16">Arrival time</span>
            <input
              type="time"
              value={stop.arrivalTime ?? ''}
              onChange={(e) => onUpdate({ ...stop, arrivalTime: e.target.value || undefined })}
              className="bg-transparent text-white/50 text-xs outline-none border-b border-white/10 focus:border-white/25 transition-colors"
              style={{ colorScheme: 'dark' }}
            />
          </div>
          <div className="flex items-center gap-2 flex-1">
            <span className="text-white/30 text-[10px] w-16">Depart time</span>
            <input
              type="time"
              value={stop.departureTime ?? ''}
              onChange={(e) => onUpdate({ ...stop, departureTime: e.target.value || undefined })}
              className="bg-transparent text-white/50 text-xs outline-none border-b border-white/10 focus:border-white/25 transition-colors"
              style={{ colorScheme: 'dark' }}
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {/* Events */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-white/60 text-xs font-semibold uppercase tracking-wider">Events</h4>
            <button onClick={addEvent} className="text-xs text-accent hover:text-white/70 transition-colors flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add event
            </button>
          </div>
          {stop.events.length === 0 ? (
            <p className="text-white/20 text-xs italic">No events yet</p>
          ) : (
            <div className="space-y-2">
              {stop.events.map((ev) => (
                <EventCard key={ev.id} event={ev} onUpdate={updateEvent} onDelete={() => deleteEvent(ev.id)} />
              ))}
            </div>
          )}
        </div>

        {/* Contacts */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-white/60 text-xs font-semibold uppercase tracking-wider">Contacts</h4>
            <button onClick={addContact} className="text-xs text-accent hover:text-white/70 transition-colors flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add contact
            </button>
          </div>
          {stop.contacts.length === 0 ? (
            <p className="text-white/20 text-xs italic">No contacts yet</p>
          ) : (
            <div className="space-y-2">
              {stop.contacts.map((cx) => (
                <ContactCard key={cx.id} contact={cx} onUpdate={updateContact} onDelete={() => deleteContact(cx.id)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Event Card ───────────────────────────────────────────────────────────────

function EventCard({ event, onUpdate, onDelete }: { event: TripEvent; onUpdate: (e: TripEvent) => void; onDelete: () => void }) {
  const [geocoding, setGeocoding] = useState(false)

  async function geocode() {
    if (!event.location) return
    setGeocoding(true)
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(event.location)}&format=json&limit=1`, {
        headers: { 'User-Agent': 'CreativeMotionPM/1.0' },
      })
      const data = await res.json() as Array<{ lat: string; lon: string }>
      if (data[0]) onUpdate({ ...event, venueCoords: [parseFloat(data[0].lat), parseFloat(data[0].lon)] })
    } finally {
      setGeocoding(false)
    }
  }

  return (
    <div className="group/ev rounded-lg border border-surface-border bg-white/[0.03] p-3 space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-white/30 text-xs">🎉</span>
        <input value={event.title} onChange={(e) => onUpdate({ ...event, title: e.target.value })} placeholder="Event name" className="flex-1 bg-transparent text-white/80 text-sm outline-none placeholder-white/20 border-b border-transparent focus:border-white/10 transition-colors" />
        <button onClick={onDelete} className="opacity-0 group-hover/ev:opacity-100 transition-opacity text-white/20 hover:text-red-400/60">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input value={event.date ?? ''} onChange={(e) => onUpdate({ ...event, date: e.target.value })} placeholder="Date" className="bg-transparent text-white/40 text-xs outline-none placeholder-white/15 border-b border-transparent focus:border-white/10 transition-colors py-0.5" />
        <div className="flex items-center gap-1">
          <input value={event.location ?? ''} onChange={(e) => onUpdate({ ...event, location: e.target.value })} placeholder="Location / Venue" className="flex-1 min-w-0 bg-transparent text-white/40 text-xs outline-none placeholder-white/15 border-b border-transparent focus:border-white/10 transition-colors py-0.5" />
          <button onClick={geocode} disabled={!event.location || geocoding} title="Geocode venue onto map" className="flex-shrink-0 text-xs opacity-40 hover:opacity-80 disabled:opacity-20 transition-opacity cursor-pointer">
            {geocoding ? '⏳' : event.venueCoords ? '📍' : '🗺️'}
          </button>
        </div>
      </div>
      <input value={event.link ?? ''} onChange={(e) => onUpdate({ ...event, link: e.target.value })} placeholder="Luma / event link" className="w-full bg-transparent text-white/35 text-xs outline-none placeholder-white/15 border-b border-transparent focus:border-white/10 transition-colors font-mono py-0.5" />
      <input value={event.imageUrl ?? ''} onChange={(e) => onUpdate({ ...event, imageUrl: e.target.value })} placeholder="🖼  Cover image URL" className="w-full bg-transparent text-white/35 text-xs outline-none placeholder-white/15 border-b border-transparent focus:border-white/10 transition-colors font-mono py-0.5" />
      <input value={event.sponsorSlot ?? ''} onChange={(e) => onUpdate({ ...event, sponsorSlot: e.target.value })} placeholder="Sponsor slot" className="w-full bg-transparent text-white/35 text-xs outline-none placeholder-white/15 border-b border-transparent focus:border-white/10 transition-colors py-0.5" />
      <input value={event.notes ?? ''} onChange={(e) => onUpdate({ ...event, notes: e.target.value })} placeholder="Notes" className="w-full bg-transparent text-white/30 text-xs outline-none placeholder-white/15 border-b border-transparent focus:border-white/10 transition-colors italic py-0.5" />
    </div>
  )
}

// ─── Contact Card ─────────────────────────────────────────────────────────────

function ContactCard({ contact, onUpdate, onDelete }: { contact: TripContact; onUpdate: (c: TripContact) => void; onDelete: () => void }) {
  return (
    <div className="group/cx rounded-lg border border-surface-border bg-white/[0.03] p-3 space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-white/30 text-xs">👤</span>
        <input
          value={contact.name}
          onChange={(e) => onUpdate({ ...contact, name: e.target.value })}
          placeholder="Full name"
          className="flex-1 bg-transparent text-white/80 text-sm font-medium outline-none placeholder-white/20 border-b border-transparent focus:border-white/10 transition-colors"
        />
        <button onClick={onDelete} className="opacity-0 group-hover/cx:opacity-100 transition-opacity text-white/20 hover:text-red-400/60">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {(['role', 'company', 'email', 'phone'] as const).map((key) => (
          <input
            key={key}
            value={(contact as unknown as Record<string, string>)[key] ?? ''}
            onChange={(e) => onUpdate({ ...contact, [key]: e.target.value })}
            placeholder={key.charAt(0).toUpperCase() + key.slice(1)}
            className="bg-transparent text-white/45 text-xs outline-none placeholder-white/15 border-b border-transparent focus:border-white/10 transition-colors py-0.5"
          />
        ))}
      </div>
      <input value={contact.linkedin ?? ''} onChange={(e) => onUpdate({ ...contact, linkedin: e.target.value })} placeholder="LinkedIn URL" className="w-full bg-transparent text-white/35 text-xs outline-none placeholder-white/15 border-b border-transparent focus:border-white/10 transition-colors font-mono" />
      <input value={contact.notes ?? ''} onChange={(e) => onUpdate({ ...contact, notes: e.target.value })} placeholder="Notes" className="w-full bg-transparent text-white/35 text-xs outline-none placeholder-white/15 border-b border-transparent focus:border-white/10 transition-colors italic" />
    </div>
  )
}
