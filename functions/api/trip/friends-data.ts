/**
 * GET /api/trip/friends-data
 * Protected by trip_session cookie (set by /api/trip/friends-auth).
 * Returns full trip data including contacts.
 */

interface Env {
  PM_DATA: KVNamespace
  SESSION_SECRET: string
  TRIP_FRIENDS_PASSWORD: string
}

const COOKIE_NAME = 'trip_session'
const TTL = 7 * 24 * 60 * 60

function parseCookie(header: string, name: string): string | null {
  const match = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

function base64UrlDecode(str: string): Uint8Array {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/').padEnd(str.length + ((4 - (str.length % 4)) % 4), '=')
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0))
}

async function validateTripToken(token: string, secret: string): Promise<boolean> {
  const parts = token.split('.')
  if (parts.length !== 2) return false
  const [tsStr, sig] = parts
  const ts = parseInt(tsStr, 10)
  if (isNaN(ts)) return false
  if (Math.floor(Date.now() / 1000) - ts > TTL) return false
  try {
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify'],
    )
    return await crypto.subtle.verify('HMAC', key, base64UrlDecode(sig), new TextEncoder().encode(`trip.${tsStr}`))
  } catch {
    return false
  }
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const cookieHeader = context.request.headers.get('Cookie') ?? ''
  const token = parseCookie(cookieHeader, COOKIE_NAME)
  const secret = context.env.SESSION_SECRET ?? context.env.TRIP_FRIENDS_PASSWORD

  if (!token || !(await validateTripToken(token, secret))) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

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
