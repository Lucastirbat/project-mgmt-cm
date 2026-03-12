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
const PUBLIC_PATHS = new Set(['/login', '/api/login', '/trip', '/trip/friends', '/api/og-image'])
// Embed paths are always public (iframed on external sites)
const isPublicEmbed = (path: string) =>
  path.startsWith('/embed/') || path.startsWith('/api/embed/') || path.startsWith('/api/trip/')

// Static asset extensions that don't need auth checks
const STATIC_EXT = /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|map|webp|avif)$/i

// Social preview meta tags injected server-side for crawler compatibility
const SOCIAL_META: Record<string, { title: string; description: string }> = {
  '/trip': {
    title: 'RX CEE Trip',
    description: 'Follow the ReaktorX CEE trip in real time.',
  },
  '/trip/friends': {
    title: 'RX Friends Trip',
    description: 'The friends view of the ReaktorX CEE trip.',
  },
}
const RX_OG_IMAGE = 'https://reaktorx.com/wp-content/uploads/2022/10/cropped-Group-1-5-1.png.webp'

async function injectSocialMeta(response: Response, meta: { title: string; description: string }): Promise<Response> {
  const html = await response.text()
  const tags = [
    `<title>${meta.title}</title>`,
    `<meta property="og:title" content="${meta.title}" />`,
    `<meta property="og:description" content="${meta.description}" />`,
    `<meta property="og:image" content="${RX_OG_IMAGE}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta name="twitter:card" content="summary" />`,
    `<meta name="twitter:title" content="${meta.title}" />`,
    `<meta name="twitter:image" content="${RX_OG_IMAGE}" />`,
  ].join('\n    ')
  const modified = html.replace(
    /<title>[^<]*<\/title>/,
    tags,
  )
  const headers = new Headers(response.headers)
  headers.set('content-type', 'text/html; charset=utf-8')
  return new Response(modified, { status: response.status, headers })
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url)
  const path = url.pathname

  // Let public paths, embed paths, and static assets through unconditionally
  if (PUBLIC_PATHS.has(path) || isPublicEmbed(path) || STATIC_EXT.test(path)) {
    const response = await context.next()
    const meta = SOCIAL_META[path]
    if (meta && (response.headers.get('content-type') ?? '').includes('text/html')) {
      return injectSocialMeta(response, meta)
    }
    return response
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
