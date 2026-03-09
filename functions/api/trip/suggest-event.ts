/**
 * POST /api/trip/suggest-event  — public, friends submit event suggestions
 * GET  /api/trip/suggest-event  — session-gated, admin reads suggestions
 * DELETE /api/trip/suggest-event?id=  — session-gated, dismiss a suggestion
 */

interface Env { PM_DATA: KVNamespace }

export interface SuggestedEvent {
  id: string
  stopId: string
  stopLabel: string   // "{flag} {capital}"
  title: string
  date?: string
  location?: string
  link?: string
  notes?: string
  submittedBy: string
  contact?: string
  submittedAt: string
}

const KV_KEY = 'trip_suggested_events'

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  })
}

function hasSession(request: Request) {
  const cookie = request.headers.get('Cookie') ?? ''
  return /pm_session=/.test(cookie)
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  let body: Partial<SuggestedEvent>
  try { body = await context.request.json() } catch { return json({ error: 'Invalid JSON' }, 400) }

  if (!body.stopId || !body.title?.trim() || !body.submittedBy?.trim()) {
    return json({ error: 'Missing required fields: stopId, title, submittedBy' }, 400)
  }

  const existing: SuggestedEvent[] = JSON.parse(await context.env.PM_DATA.get(KV_KEY) ?? '[]')
  const entry: SuggestedEvent = {
    id: Math.random().toString(36).slice(2, 9),
    stopId: body.stopId,
    stopLabel: body.stopLabel ?? '',
    title: body.title.trim(),
    date: body.date?.trim() || undefined,
    location: body.location?.trim() || undefined,
    link: body.link?.trim() || undefined,
    notes: body.notes?.trim() || undefined,
    submittedBy: body.submittedBy.trim(),
    contact: body.contact?.trim() || undefined,
    submittedAt: new Date().toISOString(),
  }
  existing.push(entry)
  await context.env.PM_DATA.put(KV_KEY, JSON.stringify(existing))
  return json({ ok: true, id: entry.id }, 201)
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  if (!hasSession(context.request)) return json({ error: 'Unauthorized' }, 401)
  const raw = await context.env.PM_DATA.get(KV_KEY) ?? '[]'
  return new Response(raw, { headers: { 'Content-Type': 'application/json' } })
}

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  if (!hasSession(context.request)) return json({ error: 'Unauthorized' }, 401)
  const id = new URL(context.request.url).searchParams.get('id')
  if (!id) return json({ error: 'Missing id' }, 400)
  const existing: SuggestedEvent[] = JSON.parse(await context.env.PM_DATA.get(KV_KEY) ?? '[]')
  await context.env.PM_DATA.put(KV_KEY, JSON.stringify(existing.filter(e => e.id !== id)))
  return json({ ok: true })
}
