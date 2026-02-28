/**
 * Cloudflare Pages Middleware
 * Runs on every request. Enforces password auth via signed session cookie.
 */

interface Env {
  SESSION_SECRET: string
}

const SESSION_COOKIE = 'pm_session'
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60 // 7 days

// Paths that bypass auth entirely
const PUBLIC_PATHS = new Set(['/login', '/api/login'])

// Static asset extensions that don't need auth checks
const STATIC_EXT = /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|map|webp|avif)$/i

export const onRequest: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url)
  const path = url.pathname

  // Let public paths and static assets through unconditionally
  if (PUBLIC_PATHS.has(path) || STATIC_EXT.test(path)) {
    return context.next()
  }

  const secret = context.env.SESSION_SECRET

  // In local dev without secrets configured, warn and allow through
  if (!secret) {
    console.warn('[auth] SESSION_SECRET not set — allowing request in dev mode')
    return context.next()
  }

  const cookieHeader = context.request.headers.get('Cookie') ?? ''
  const token = parseCookie(cookieHeader, SESSION_COOKIE)

  if (token && (await validateToken(token, secret))) {
    return context.next()
  }

  // Not authenticated — redirect to /login with the original path as ?redirect=
  const loginUrl = new URL('/login', context.request.url)
  if (path !== '/') {
    loginUrl.searchParams.set('redirect', path)
  }
  return Response.redirect(loginUrl.toString(), 302)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseCookie(header: string, name: string): string | null {
  const match = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`))
  return match ? decodeURIComponent(match[1]) : null
}

export async function validateToken(token: string, secret: string): Promise<boolean> {
  const parts = token.split('.')
  if (parts.length !== 2) return false

  const [timestampStr, providedSig] = parts
  const timestamp = parseInt(timestampStr, 10)
  if (isNaN(timestamp)) return false

  // Check TTL
  const now = Math.floor(Date.now() / 1000)
  if (now - timestamp > SESSION_TTL_SECONDS) return false

  try {
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify'],
    )
    const sigBytes = base64UrlDecode(providedSig)
    return await crypto.subtle.verify(
      'HMAC',
      key,
      sigBytes,
      new TextEncoder().encode(timestampStr),
    )
  } catch {
    return false
  }
}

export async function createToken(secret: string): Promise<string> {
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(timestamp))
  return `${timestamp}.${base64UrlEncode(sig)}`
}

function base64UrlEncode(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

function base64UrlDecode(str: string): Uint8Array {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/').padEnd(str.length + ((4 - (str.length % 4)) % 4), '=')
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0))
}
