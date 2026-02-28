/**
 * GET /api/embed/trip
 * Public (no auth) — returns the Eastern Europe Tour trip stops + events.
 * Contacts are stripped (private CRM data).
 */

interface Env {
  PM_DATA: KVNamespace
}

const KV_KEY = 'app_data'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
  'Cache-Control': 'public, max-age=60',
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  if (!context.env.PM_DATA) {
    return new Response(JSON.stringify({ error: 'KV not configured' }), { status: 503, headers: CORS })
  }

  const raw = await context.env.PM_DATA.get(KV_KEY)
  if (!raw) {
    return new Response(JSON.stringify({ stops: [] }), { headers: CORS })
  }

  try {
    const data = JSON.parse(raw) as {
      companies?: Array<{
        id: string
        projects?: Array<{
          id: string
          blocks?: Array<{
            type: string
            tripStops?: Array<{
              id: string; country: string; capital: string; flag: string
              lat: number; lng: number; arrivalDate: string; departureDate: string
              events?: Array<{ id: string; title: string; date?: string; location?: string; link?: string; sponsorSlot?: string; notes?: string }>
              contacts?: unknown[]
            }>
          }>
        }>
      }>
    }

    const rx = data.companies?.find((c) => c.id === 'reaktorx')
    const trip = rx?.projects?.find((p) => p.id === 'euro-trip-2025')
    const mapBlock = trip?.blocks?.find((b) => b.type === 'travelmap')
    const stops = (mapBlock?.tripStops ?? []).map(({ contacts: _c, ...stop }) => stop)

    return new Response(JSON.stringify({ stops }), { headers: CORS })
  } catch {
    return new Response(JSON.stringify({ error: 'Failed to parse data' }), { status: 500, headers: CORS })
  }
}
