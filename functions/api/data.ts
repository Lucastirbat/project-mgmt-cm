/**
 * GET  /api/data  — read app data from KV
 * PUT  /api/data  — write app data to KV
 *
 * Auth is enforced by _middleware.ts (session cookie required).
 * KV binding: PM_DATA (configure in Cloudflare Pages dashboard)
 */

interface Env {
  PM_DATA: KVNamespace
}

const KV_KEY = 'app_data'

export const onRequestGet: PagesFunction<Env> = async (context) => {
  if (!context.env.PM_DATA) {
    // KV not bound yet (local dev without binding) — return empty so frontend uses seed
    return json({}, 200)
  }

  const value = await context.env.PM_DATA.get(KV_KEY)
  if (!value) {
    return json({}, 200) // first load — frontend will use seed and save on first edit
  }

  return new Response(value, {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

export const onRequestPut: PagesFunction<Env> = async (context) => {
  if (!context.env.PM_DATA) {
    return json({ error: 'KV not configured' }, 503)
  }

  let body: string
  try {
    body = await context.request.text()
    JSON.parse(body) // validate it's parseable JSON
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  await context.env.PM_DATA.put(KV_KEY, body)
  return json({ success: true }, 200)
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
