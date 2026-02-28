/**
 * POST /api/login
 * Validates the shared password and issues a signed session cookie.
 */

import { createToken } from '../_middleware'

interface Env {
  SITE_PASSWORD: string
  SESSION_SECRET: string
}

const SESSION_COOKIE = 'pm_session'
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60 // 7 days

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { SITE_PASSWORD, SESSION_SECRET } = context.env

  // Guard: env vars must be set in production
  if (!SITE_PASSWORD || !SESSION_SECRET) {
    return jsonResponse({ error: 'Server misconfiguration' }, 500)
  }

  let body: unknown
  try {
    body = await context.request.json()
  } catch {
    return jsonResponse({ error: 'Invalid request body' }, 400)
  }

  const password = (body as Record<string, unknown>)?.password
  if (typeof password !== 'string' || !password) {
    return jsonResponse({ error: 'Password is required' }, 400)
  }

  // Constant-time comparison to prevent timing attacks
  const correct = await timingSafeEqual(password, SITE_PASSWORD)
  if (!correct) {
    return jsonResponse({ error: 'Incorrect password' }, 401)
  }

  const token = await createToken(SESSION_SECRET)
  const cookieValue = `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_TTL_SECONDS}`

  return jsonResponse({ success: true }, 200, {
    'Set-Cookie': cookieValue,
  })
}

// Reject non-POST methods
export const onRequest: PagesFunction<Env> = async () => {
  return jsonResponse({ error: 'Method not allowed' }, 405)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function jsonResponse(body: unknown, status: number, extraHeaders?: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...extraHeaders,
    },
  })
}

/**
 * Constant-time string comparison using HMAC to avoid timing attacks.
 * Both values are HMAC'd with a random key so comparison time is fixed.
 */
async function timingSafeEqual(a: string, b: string): Promise<boolean> {
  const key = await crypto.subtle.generateKey({ name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const enc = new TextEncoder()
  const [sigA, sigB] = await Promise.all([
    crypto.subtle.sign('HMAC', key, enc.encode(a)),
    crypto.subtle.sign('HMAC', key, enc.encode(b)),
  ])
  // crypto.subtle.verify does a constant-time compare internally
  return crypto.subtle.verify('HMAC', key, sigA, enc.encode(b)).then(() => {
    // If b's HMAC matches a's HMAC, they're equal
    const viewA = new Uint8Array(sigA)
    const viewB = new Uint8Array(sigB)
    if (viewA.length !== viewB.length) return false
    let diff = 0
    for (let i = 0; i < viewA.length; i++) {
      diff |= viewA[i] ^ viewB[i]
    }
    return diff === 0
  }).catch(() => false)
}
