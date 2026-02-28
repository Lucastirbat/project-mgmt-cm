import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, CircleMarker, Polyline, Tooltip } from 'react-leaflet'
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

export default function TravelMapBlock({ block, onChange }: Props) {
  const stops: TripStop[] = block.tripStops ?? []
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    const cur = stops.find((s) => stopStatus(s) === 'current')
    return cur?.id ?? stops[0]?.id ?? null
  })
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  const selectedStop = stops.find((s) => s.id === selectedId) ?? null

  function updateStop(updated: TripStop) {
    onChange({
      ...block,
      tripStops: stops.map((s) => (s.id === updated.id ? updated : s)),
    })
  }

  const routePositions: [number, number][] = stops.map((s) => [s.lat, s.lng])

  const currentStop = stops.find((s) => stopStatus(s) === 'current')

  // Map center: current stop, or midpoint of Europe
  const mapCenter: [number, number] = currentStop
    ? [currentStop.lat, currentStop.lng]
    : [50.0, 20.0]

  return (
    <div className="flex flex-col gap-4">
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

      {/* Main layout: timeline + map */}
      <div className="flex gap-3" style={{ height: '460px' }}>
        {/* Timeline */}
        <div className="w-56 shrink-0 overflow-y-auto scrollbar-thin space-y-0.5 pr-1">
          {stops.map((stop) => {
            const status = stopStatus(stop)
            const isSelected = stop.id === selectedId
            return (
              <button
                key={stop.id}
                onClick={() => setSelectedId(stop.id)}
                className={[
                  'w-full text-left px-3 py-2 rounded-xl transition-all flex items-center gap-2.5 group',
                  isSelected
                    ? 'bg-white/10 text-white'
                    : 'text-white/50 hover:bg-white/5 hover:text-white/80',
                ].join(' ')}
              >
                {/* Status indicator */}
                <span className="shrink-0 text-base">{stop.flag}</span>
                <div className="flex-1 min-w-0">
                  <div
                    className={[
                      'text-sm font-medium truncate',
                      status === 'past' ? 'line-through opacity-40' : '',
                      status === 'current' ? 'text-accent' : '',
                    ].join(' ')}
                  >
                    {stop.capital}
                  </div>
                  <div className="text-[10px] text-white/25 mt-0.5">
                    {formatDateRange(stop.arrivalDate, stop.departureDate)}
                  </div>
                </div>
                {/* Indicators */}
                <div className="flex gap-1 shrink-0">
                  {stop.events.length > 0 && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/8 text-white/40">
                      {stop.events.length}ev
                    </span>
                  )}
                  {stop.contacts.length > 0 && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/8 text-white/40">
                      {stop.contacts.length}cx
                    </span>
                  )}
                </div>
              </button>
            )
          })}
        </div>

        {/* Map */}
        <div className="flex-1 rounded-xl overflow-hidden border border-surface-border">
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

              {/* Route polyline */}
              <Polyline
                positions={routePositions}
                pathOptions={{ color: '#ffffff', weight: 1.5, dashArray: '4 6', opacity: 0.2 }}
              />

              {/* City markers */}
              {stops.map((stop) => {
                const status = stopStatus(stop)
                const isSelected = stop.id === selectedId
                const color =
                  status === 'current'
                    ? '#6366f1'
                    : status === 'past'
                    ? '#4b5563'
                    : '#e5e7eb'
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
      </div>

      {/* Selected city detail panel */}
      {selectedStop && (
        <StopDetail stop={selectedStop} onUpdate={updateStop} />
      )}
    </div>
  )
}

// ─── Stop Detail Panel ────────────────────────────────────────────────────────

function StopDetail({ stop, onUpdate }: { stop: TripStop; onUpdate: (s: TripStop) => void }) {
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
      id: `cx-${uid()}`,
      name: '',
      role: '',
      company: '',
      linkedin: '',
      email: '',
      phone: '',
      notes: '',
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
    <div className="rounded-xl border border-surface-border bg-white/[0.02] p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="text-3xl">{stop.flag}</span>
        <div>
          <h3 className="text-white font-semibold text-lg leading-tight">
            {stop.capital}
            {status === 'current' && (
              <span className="ml-2 text-xs font-normal px-2 py-0.5 rounded-full bg-accent/20 text-accent">
                Here now
              </span>
            )}
          </h3>
          <p className="text-white/35 text-sm">
            {stop.country} · {formatDateRange(stop.arrivalDate, stop.departureDate)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Events */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-white/60 text-xs font-semibold uppercase tracking-wider">Events</h4>
            <button
              onClick={addEvent}
              className="text-xs text-accent hover:text-white/70 transition-colors flex items-center gap-1"
            >
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
            <button
              onClick={addContact}
              className="text-xs text-accent hover:text-white/70 transition-colors flex items-center gap-1"
            >
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

function EventCard({
  event,
  onUpdate,
  onDelete,
}: {
  event: TripEvent
  onUpdate: (e: TripEvent) => void
  onDelete: () => void
}) {
  return (
    <div className="group/ev rounded-lg border border-surface-border bg-white/[0.03] p-3 space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-white/30 text-xs">🎉</span>
        <input
          value={event.title}
          onChange={(e) => onUpdate({ ...event, title: e.target.value })}
          placeholder="Event name (e.g. Private Dinner)"
          className="flex-1 bg-transparent text-white/80 text-sm outline-none placeholder-white/20 border-b border-transparent focus:border-white/10 transition-colors"
        />
        <button
          onClick={onDelete}
          className="opacity-0 group-hover/ev:opacity-100 transition-opacity text-white/20 hover:text-red-400/60"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <input
        value={event.date ?? ''}
        onChange={(e) => onUpdate({ ...event, date: e.target.value })}
        placeholder="Date (e.g. Apr 14)"
        className="w-full bg-transparent text-white/40 text-xs outline-none placeholder-white/15 border-b border-transparent focus:border-white/10 transition-colors"
      />
      <input
        value={event.notes ?? ''}
        onChange={(e) => onUpdate({ ...event, notes: e.target.value })}
        placeholder="Notes"
        className="w-full bg-transparent text-white/40 text-xs outline-none placeholder-white/15 border-b border-transparent focus:border-white/10 transition-colors"
      />
    </div>
  )
}

// ─── Contact Card ─────────────────────────────────────────────────────────────

function ContactCard({
  contact,
  onUpdate,
  onDelete,
}: {
  contact: TripContact
  onUpdate: (c: TripContact) => void
  onDelete: () => void
}) {
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
        <button
          onClick={onDelete}
          className="opacity-0 group-hover/cx:opacity-100 transition-opacity text-white/20 hover:text-red-400/60"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {[
          { key: 'role', placeholder: 'Role' },
          { key: 'company', placeholder: 'Company' },
          { key: 'email', placeholder: 'Email' },
          { key: 'phone', placeholder: 'Phone' },
        ].map(({ key, placeholder }) => (
          <input
            key={key}
            value={(contact as unknown as Record<string, string>)[key] ?? ''}
            onChange={(e) => onUpdate({ ...contact, [key]: e.target.value })}
            placeholder={placeholder}
            className="bg-transparent text-white/45 text-xs outline-none placeholder-white/15 border-b border-transparent focus:border-white/10 transition-colors py-0.5"
          />
        ))}
      </div>
      <input
        value={contact.linkedin ?? ''}
        onChange={(e) => onUpdate({ ...contact, linkedin: e.target.value })}
        placeholder="LinkedIn URL"
        className="w-full bg-transparent text-white/35 text-xs outline-none placeholder-white/15 border-b border-transparent focus:border-white/10 transition-colors font-mono"
      />
      <input
        value={contact.notes ?? ''}
        onChange={(e) => onUpdate({ ...contact, notes: e.target.value })}
        placeholder="Notes"
        className="w-full bg-transparent text-white/35 text-xs outline-none placeholder-white/15 border-b border-transparent focus:border-white/10 transition-colors italic"
      />
    </div>
  )
}
