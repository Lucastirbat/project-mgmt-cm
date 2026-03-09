/**
 * GET /api/trip/friends-data
 * Currently open (no auth) — returns full trip data including contacts.
 */

interface Env {
  PM_DATA: KVNamespace
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  if (!context.env.PM_DATA) {
    return new Response(JSON.stringify({ stops: [] }), { headers: { 'Content-Type': 'application/json' } })
  }

  const raw = await context.env.PM_DATA.get('app_data')
  if (!raw) return new Response(JSON.stringify({ stops: [] }), { headers: { 'Content-Type': 'application/json' } })

  try {
    const data = JSON.parse(raw) as {
      companies?: Array<{
        id: string
        projects?: Array<{
          id: string
          blocks?: Array<{ type: string; tripStops?: unknown[] }>
        }>
      }>
    }
    const rx = data.companies?.find((c) => c.id === 'reaktorx')
    const trip = rx?.projects?.find((p) => p.id === 'euro-trip-2025')
    const mapBlock = trip?.blocks?.find((b) => b.type === 'travelmap')
    const stops = mapBlock?.tripStops ?? []

    return new Response(JSON.stringify({ stops }), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'private, no-store' },
    })
  } catch {
    return new Response(JSON.stringify({ error: 'Parse error' }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
}
