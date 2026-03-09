/**
 * POST /api/trip/friends-auth
 * Public endpoint — checks TRIP_FRIENDS_PASSWORD, sets trip_session cookie.
 */

interface Env {
  TRIP_FRIENDS_PASSWORD: string
  SESSION_SECRET: string
}

const COOKIE_NAME = 'trip_session'
const TTL = 7 * 24 * 60 * 60 // 7 days

function base64UrlEncode(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

async function createTripToken(secret: string): Promise<string> {
  const ts = Math.floor(Date.now() / 1000).toString()
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`trip.${ts}`))
  return `${ts}.${base64UrlEncode(sig)}`
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const json = await context.request.json() as { password?: string }
  const pass = context.env.TRIP_FRIENDS_PASSWORD

  if (!pass || json.password !== pass) {
    return new Response(JSON.stringify({ ok: false }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Use SESSION_SECRET if available, fall back to the friends password as key
  const secret = context.env.SESSION_SECRET ?? pass
  const token = await createTripToken(secret)
  const cookie = `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${TTL}`

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json', 'Set-Cookie': cookie },
  })
}
