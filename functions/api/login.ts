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

  // Constant-time comparison (trim guards against accidental whitespace in env var)
  if (!timingSafeEqual(password, SITE_PASSWORD.trim())) {
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
 * Constant-time string comparison via XOR to prevent timing attacks.
 */
function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder()
  const aBytes = enc.encode(a)
  const bBytes = enc.encode(b)
  const len = Math.max(aBytes.length, bBytes.length)
  // XOR every byte — also folds in length mismatch
  let diff = aBytes.length ^ bBytes.length
  for (let i = 0; i < len; i++) {
    diff |= (aBytes[i] ?? 0) ^ (bBytes[i] ?? 0)
  }
  return diff === 0
}
