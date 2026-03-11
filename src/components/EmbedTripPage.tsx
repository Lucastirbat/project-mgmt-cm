/**
 * /embed/trip — Public, standalone read-only travel map.
 * No auth, no DataProvider, no sidebar. Fetches from /api/embed/trip.
 * Designed to be iframed on external sites (e.g. reaktorx.com).
 */

import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, CircleMarker, Polyline, Tooltip } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

// ─── Types (contacts omitted — public data only) ──────────────────────────────

interface EmbedTripEvent {
  id: string
  title: string
  date?: string
  location?: string
  link?: string
  sponsorSlot?: string
  notes?: string
}

interface EmbedTripStop {
  id: string
  country: string
  capital: string
  flag: string
  lat: number
  lng: number
  arrivalDate: string
  departureDate: string
  events: EmbedTripEvent[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TODAY = new Date().toISOString().slice(0, 10)

function stopStatus(stop: EmbedTripStop): 'past' | 'current' | 'upcoming' {
  if (TODAY >= stop.departureDate) return 'past'
  if (TODAY >= stop.arrivalDate) return 'current'
  return 'upcoming'
}

function formatDateRange(arrival: string, departure: string): string {
  const fmt = (d: string) =>
    new Date(d + 'T12:00:00').toLocaleDateString('en', { month: 'short', day: 'numeric' })
  return `${fmt(arrival)} – ${fmt(departure)}`
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function EmbedTripPage() {
  const [stops, setStops] = useState<EmbedTripStop[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    document.title = 'RX CEE Trip'
    const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]') ?? document.createElement('link')
    link.rel = 'icon'
    link.href = 'https://reaktorx.com/wp-content/uploads/2022/10/cropped-Group-1-5-1.png.webp'
    document.head.appendChild(link)
    return () => { document.title = 'Creative Motion — Project Management' }
  }, [])

  useEffect(() => {
    setIsClient(true)
    fetch('/api/embed/trip')
      .then((r) => r.json())
      .then((d: { stops: EmbedTripStop[] }) => {
        const loaded = d.stops ?? []
        setStops(loaded)
        const current = loaded.find((s) => stopStatus(s) === 'current')
        setSelectedId(current?.id ?? loaded[0]?.id ?? null)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const currentStop = stops.find((s) => stopStatus(s) === 'current')
  const selectedStop = stops.find((s) => s.id === selectedId) ?? null
  const routePositions: [number, number][] = stops.map((s) => [s.lat, s.lng])
  const mapCenter: [number, number] = currentStop
    ? [currentStop.lat, currentStop.lng]
    : [50.0, 20.0]

  if (loading) {
    return (
      <div
        style={{
          height: '100vh',
          background: '#0f0f0f',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'rgba(255,255,255,0.3)',
          fontFamily: 'Inter, sans-serif',
          fontSize: 14,
        }}
      >
        Loading map…
      </div>
    )
  }

  return (
    <div
      style={{
        height: '100vh',
        background: '#0f0f0f',
        fontFamily: 'Inter, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '12px 16px',
          borderBottom: '1px solid #2a2a2a',
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 18 }}>🗺</span>
        <div style={{ flex: 1 }}>
          <div style={{ color: '#fff', fontSize: 14, fontWeight: 600, lineHeight: 1.2 }}>
            Eastern Europe Tour 2026
          </div>
          <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, marginTop: 2 }}>
            Mar 23 – May 2 · 15 cities · ReaktorX
          </div>
        </div>
        {currentStop && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'rgba(99,102,241,0.1)',
              border: '1px solid rgba(99,102,241,0.2)',
              borderRadius: 20,
              padding: '4px 10px',
              fontSize: 12,
              color: 'rgba(255,255,255,0.7)',
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: '#6366f1',
                display: 'inline-block',
                boxShadow: '0 0 6px #6366f1',
              }}
            />
            {currentStop.flag} {currentStop.capital}
          </div>
        )}
      </div>

      {/* Body: timeline + map */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Timeline */}
        <div
          style={{
            width: 200,
            flexShrink: 0,
            overflowY: 'auto',
            borderRight: '1px solid #2a2a2a',
            padding: '8px 4px',
          }}
        >
          {stops.map((stop) => {
            const status = stopStatus(stop)
            const isSelected = stop.id === selectedId
            return (
              <button
                key={stop.id}
                onClick={() => setSelectedId(stop.id)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '7px 10px',
                  borderRadius: 8,
                  border: 'none',
                  cursor: 'pointer',
                  background: isSelected ? 'rgba(255,255,255,0.08)' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  marginBottom: 1,
                  transition: 'background 0.15s',
                }}
              >
                <span style={{ fontSize: 14, flexShrink: 0 }}>{stop.flag}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 500,
                      color:
                        status === 'current'
                          ? '#818cf8'
                          : status === 'past'
                          ? 'rgba(255,255,255,0.2)'
                          : isSelected
                          ? '#fff'
                          : 'rgba(255,255,255,0.55)',
                      textDecoration: status === 'past' ? 'line-through' : 'none',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {stop.capital}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: 'rgba(255,255,255,0.2)',
                      marginTop: 1,
                    }}
                  >
                    {formatDateRange(stop.arrivalDate, stop.departureDate)}
                  </div>
                </div>
                {stop.events.length > 0 && (
                  <span
                    style={{
                      fontSize: 9,
                      color: 'rgba(255,255,255,0.3)',
                      background: 'rgba(255,255,255,0.06)',
                      borderRadius: 4,
                      padding: '1px 5px',
                      flexShrink: 0,
                    }}
                  >
                    {stop.events.length}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Right: map + detail */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Map */}
          <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
            {isClient && (
              <MapContainer
                center={mapCenter}
                zoom={4}
                style={{ height: '100%', width: '100%', background: '#0f0f0f' }}
                zoomControl={true}
                attributionControl={false}
              >
                <TileLayer
                  url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                />
                <Polyline
                  positions={routePositions}
                  pathOptions={{ color: '#ffffff', weight: 1.5, dashArray: '4 6', opacity: 0.18 }}
                />
                {stops.map((stop) => {
                  const status = stopStatus(stop)
                  const isSelected = stop.id === selectedId
                  const color =
                    status === 'current' ? '#6366f1' : status === 'past' ? '#4b5563' : '#e5e7eb'
                  const radius = status === 'current' ? 10 : isSelected ? 9 : 7
                  return (
                    <CircleMarker
                      key={stop.id}
                      center={[stop.lat, stop.lng]}
                      radius={radius}
                      pathOptions={{
                        fillColor: color,
                        fillOpacity: isSelected ? 1 : 0.75,
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
              </MapContainer>
            )}
          </div>

          {/* Selected city events (read-only) */}
          {selectedStop && (
            <div
              style={{
                flexShrink: 0,
                borderTop: '1px solid #2a2a2a',
                padding: '12px 16px',
                background: '#0f0f0f',
                maxHeight: 180,
                overflowY: 'auto',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span style={{ fontSize: 22 }}>{selectedStop.flag}</span>
                <div>
                  <div style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>
                    {selectedStop.capital}
                    {stopStatus(selectedStop) === 'current' && (
                      <span
                        style={{
                          marginLeft: 8,
                          fontSize: 10,
                          fontWeight: 400,
                          background: 'rgba(99,102,241,0.2)',
                          color: '#818cf8',
                          borderRadius: 20,
                          padding: '2px 8px',
                        }}
                      >
                        Here now
                      </span>
                    )}
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, marginTop: 1 }}>
                    {selectedStop.country} · {formatDateRange(selectedStop.arrivalDate, selectedStop.departureDate)}
                  </div>
                </div>
              </div>

              {selectedStop.events.length === 0 ? (
                <div style={{ color: 'rgba(255,255,255,0.2)', fontSize: 12, fontStyle: 'italic' }}>
                  No events scheduled
                </div>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {selectedStop.events.map((ev) => (
                    <EmbedEventCard key={ev.id} event={ev} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Read-only Event Card ─────────────────────────────────────────────────────

function EmbedEventCard({ event }: { event: EmbedTripEvent }) {
  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid #2a2a2a',
        borderRadius: 8,
        padding: '8px 12px',
        minWidth: 180,
        maxWidth: 260,
      }}
    >
      <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, fontWeight: 500 }}>
        {event.title || 'Untitled event'}
      </div>
      {(event.date || event.location) && (
        <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11, marginTop: 3 }}>
          {[event.date, event.location].filter(Boolean).join(' · ')}
        </div>
      )}
      {event.sponsorSlot && (
        <div style={{ color: '#818cf8', fontSize: 10, marginTop: 3 }}>{event.sponsorSlot}</div>
      )}
      {event.link && (
        <a
          href={event.link}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-block',
            marginTop: 4,
            color: 'rgba(255,255,255,0.4)',
            fontSize: 10,
            textDecoration: 'none',
          }}
        >
          View event →
        </a>
      )}
    </div>
  )
}
