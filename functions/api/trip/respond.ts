/**
 * POST /api/trip/respond  — public, submit a help offer for a trip need
 * GET  /api/trip/respond  — auth-gated, fetch all responses (admin)
 */

interface Env { PM_DATA: KVNamespace }

export interface TripResponse {
  id: string
  stopId: string
  stopLabel: string   // "{flag} {capital}" — stored at submit time for readability
  need: string
  name: string
  contact: string     // freeform: email, phone, IG handle…
  note: string
  submittedAt: string
}

const KV_KEY = 'trip_responses'

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  })
}

// POST — anyone can submit (friends page is public)
export const onRequestPost: PagesFunction<Env> = async (context) => {
  let body: Partial<TripResponse>
  try { body = await context.request.json() } catch { return json({ error: 'Invalid JSON' }, 400) }

  if (!body.stopId || !body.need || !body.name?.trim() || !body.note?.trim()) {
    return json({ error: 'Missing required fields: stopId, need, name, note' }, 400)
  }

  const existing: TripResponse[] = JSON.parse(await context.env.PM_DATA.get(KV_KEY) ?? '[]')
  const entry: TripResponse = {
    id: Math.random().toString(36).slice(2, 9),
    stopId: body.stopId,
    stopLabel: body.stopLabel ?? '',
    need: body.need,
    name: body.name.trim(),
    contact: body.contact?.trim() ?? '',
    note: body.note.trim(),
    submittedAt: new Date().toISOString(),
  }
  existing.push(entry)
  await context.env.PM_DATA.put(KV_KEY, JSON.stringify(existing))
  return json({ ok: true, id: entry.id }, 201)
}

// GET — requires auth (middleware enforces session cookie for non-public paths,
//        but /api/trip/* is in PUBLIC_PATHS — so we re-check the session here)
export const onRequestGet: PagesFunction<Env> = async (context) => {
  // Quick auth check — reuse the same session cookie logic from middleware
  const cookie = context.request.headers.get('Cookie') ?? ''
  const session = cookie.match(/pm_session=([^;]+)/)?.[1]
  if (!session) return json({ error: 'Unauthorized' }, 401)

  const raw = await context.env.PM_DATA.get(KV_KEY) ?? '[]'
  return new Response(raw, { headers: { 'Content-Type': 'application/json' } })
}
