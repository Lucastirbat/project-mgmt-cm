/**
 * /trip — Public, fan-facing standalone trip map.
 * No auth required. Fetches from /api/embed/trip (contacts stripped).
 * Shows: map + route + marker click → events overlay.
 */

import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, CircleMarker, Polyline, Tooltip, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

// ─── Types ────────────────────────────────────────────────────────────────────

interface TripEvent {
  id: string
  title: string
  date?: string
  location?: string
  link?: string
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
  events: TripEvent[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TODAY = new Date().toISOString().slice(0, 10)

function stopStatus(stop: TripStop): 'past' | 'current' | 'upcoming' {
  if (TODAY >= stop.departureDate) return 'past'
  if (TODAY >= stop.arrivalDate) return 'current'
  return 'upcoming'
}

function fmt(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en', { month: 'short', day: 'numeric' })
}

// ─── Map effects ──────────────────────────────────────────────────────────────

function MapEffects() {
  const map = useMap()
  useEffect(() => {
    let busy = false
    const container = map.getContainer()
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      if (busy) return
      busy = true
      map.setZoom(map.getZoom() + (e.deltaY > 0 ? -1 : 1))
      setTimeout(() => { busy = false }, 350)
    }
    container.addEventListener('wheel', onWheel, { passive: false })
    const style = document.createElement('style')
    style.id = 'pub-map-transitions'
    style.textContent =
      '.leaflet-overlay-pane path { transition: stroke 0.4s ease, stroke-opacity 0.35s ease, fill 0.4s ease, fill-opacity 0.35s ease; }'
    document.head.appendChild(style)
    return () => {
      container.removeEventListener('wheel', onWheel)
      document.getElementById('pub-map-transitions')?.remove()
    }
  }, [map])
  return null
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function PublicTripPage() {
  const [stops, setStops] = useState<TripStop[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
    fetch('/api/embed/trip')
      .then((r) => r.json())
      .then((d: { stops: TripStop[] }) => {
        const loaded = d.stops ?? []
        setStops(loaded)
        const cur = loaded.find((s) => stopStatus(s) === 'current')
        setSelectedId(cur?.id ?? loaded[0]?.id ?? null)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const currentStop = stops.find((s) => stopStatus(s) === 'current')
  const selectedStop = stops.find((s) => s.id === selectedId) ?? null
  const mapCenter: [number, number] = currentStop ? [currentStop.lat, currentStop.lng] : [50.0, 20.0]

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: '#0a0a0a', fontFamily: 'Inter, sans-serif', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 18px', borderBottom: '1px solid #1f1f1f', flexShrink: 0, background: '#0d0d0d' }}>
        <span style={{ fontSize: 22 }}>🗺️</span>
        <div style={{ flex: 1 }}>
          <div style={{ color: '#fff', fontSize: 15, fontWeight: 600, letterSpacing: '-0.02em' }}>Eastern Europe Tour 2026</div>
          <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, marginTop: 1 }}>
            {stops.length} cities · Mar – May 2026 · ReaktorX
          </div>
        </div>
        {currentStop && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 20, padding: '5px 12px', fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#6366f1', display: 'inline-block', boxShadow: '0 0 8px #6366f1', animation: 'pulse 2s infinite' }} />
            {currentStop.flag} {currentStop.capital}
          </div>
        )}
        <a
          href="/trip/friends"
          style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', textDecoration: 'none', padding: '4px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)' }}
        >
          Friends view →
        </a>
      </div>

      {/* Map — fills remaining height */}
      <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
        {loading && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.25)', fontSize: 13 }}>
            Loading map…
          </div>
        )}

        {isClient && stops.length > 0 && (
          <MapContainer
            center={mapCenter}
            zoom={4}
            scrollWheelZoom={false}
            style={{ height: '100%', width: '100%', background: '#0a0a0a' }}
            zoomControl={true}
            attributionControl={false}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; OpenStreetMap &copy; CARTO'
            />
            <MapEffects />

            {/* Route segments */}
            {stops.slice(1).map((stop, i) => {
              const prev = stops[i]
              const reached = stopStatus(stop) !== 'upcoming'
              return (
                <Polyline
                  key={`seg-${i}`}
                  positions={[[prev.lat, prev.lng], [stop.lat, stop.lng]]}
                  pathOptions={{
                    color: reached ? '#6366f1' : '#ffffff',
                    weight: reached ? 2.5 : 1.5,
                    opacity: reached ? 0.7 : 0.15,
                    dashArray: reached ? undefined : '4 6',
                  }}
                />
              )
            })}

            {/* City markers */}
            {stops.map((stop) => {
              const status = stopStatus(stop)
              const isSelected = stop.id === selectedId
              const color = status === 'current' ? '#6366f1' : status === 'past' ? '#a78bfa' : '#4b5563'
              return (
                <CircleMarker
                  key={stop.id}
                  center={[stop.lat, stop.lng]}
                  radius={status === 'current' ? 10 : isSelected ? 9 : 7}
                  pathOptions={{
                    fillColor: color,
                    fillOpacity: status !== 'upcoming' ? 0.9 : 0.4,
                    color: isSelected ? '#ffffff' : color,
                    weight: isSelected ? 2 : 1,
                  }}
                  eventHandlers={{ click: () => setSelectedId(stop.id) }}
                >
                  <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
                    <span style={{ fontSize: 12, fontFamily: 'Inter, sans-serif' }}>
                      {stop.flag} {stop.capital}
                    </span>
                  </Tooltip>
                </CircleMarker>
              )
            })}
          </MapContainer>
        )}

        {/* Left detail overlay */}
        {selectedStop && (
          <div
            style={{
              position: 'absolute', top: 12, left: 12, bottom: 12, width: 280,
              zIndex: 1000, overflowY: 'auto', borderRadius: 14,
              background: 'rgba(10,10,10,0.94)', backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.07)',
            }}
          >
            <div style={{ padding: 16 }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 14 }}>
                <span style={{ fontSize: 26, lineHeight: 1 }}>{selectedStop.flag}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#fff', fontSize: 15, fontWeight: 600, lineHeight: 1.2 }}>
                    {selectedStop.capital}
                    {stopStatus(selectedStop) === 'current' && (
                      <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 400, background: 'rgba(99,102,241,0.2)', color: '#818cf8', borderRadius: 20, padding: '2px 7px' }}>
                        Here now
                      </span>
                    )}
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, marginTop: 2 }}>
                    {selectedStop.country} · {fmt(selectedStop.arrivalDate)} – {fmt(selectedStop.departureDate)}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedId(null)}
                  style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.2)', cursor: 'pointer', padding: 2, fontSize: 16, lineHeight: 1 }}
                >
                  ×
                </button>
              </div>

              {/* Events */}
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                Events
              </div>
              {selectedStop.events.length === 0 ? (
                <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12, fontStyle: 'italic' }}>No events scheduled</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {selectedStop.events.map((ev) => (
                    <div key={ev.id} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: '9px 11px' }}>
                      <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: 500, marginBottom: 3 }}>
                        {ev.title || 'Untitled event'}
                      </div>
                      {(ev.date || ev.location) && (
                        <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>
                          {[ev.date, ev.location].filter(Boolean).join(' · ')}
                        </div>
                      )}
                      {ev.link && (
                        <a
                          href={ev.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ display: 'inline-block', marginTop: 5, color: '#818cf8', fontSize: 10, textDecoration: 'none' }}
                        >
                          View event →
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* All stops mini-list at bottom */}
        <div style={{
          position: 'absolute', bottom: 12, left: selectedStop ? 308 : 12, right: 12,
          zIndex: 1000, display: 'flex', gap: 6, overflowX: 'auto',
          padding: '8px 10px', borderRadius: 12,
          background: 'rgba(10,10,10,0.82)', backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}>
          {stops.map((stop) => {
            const status = stopStatus(stop)
            const isSelected = stop.id === selectedId
            return (
              <button
                key={stop.id}
                onClick={() => setSelectedId(stop.id)}
                style={{
                  background: isSelected ? 'rgba(99,102,241,0.2)' : 'transparent',
                  border: isSelected ? '1px solid rgba(99,102,241,0.4)' : '1px solid transparent',
                  borderRadius: 8, padding: '4px 8px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0,
                  opacity: status === 'past' ? 0.45 : 1,
                }}
              >
                <span style={{ fontSize: 13 }}>{stop.flag}</span>
                <span style={{ color: isSelected ? '#a5b4fc' : 'rgba(255,255,255,0.5)', fontSize: 11, whiteSpace: 'nowrap' }}>
                  {stop.capital}
                </span>
              </button>
            )
          })}
        </div>

        <style>{`
          @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
          .leaflet-container { background: #0a0a0a !important; }
        `}</style>
      </div>
    </div>
  )
}
