/**
 * POST /api/logout
 * Clears the session cookie.
 */

const SESSION_COOKIE = 'pm_session'

export const onRequestPost: PagesFunction = async () => {
  // Expire the cookie immediately
  const clearCookie = `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': clearCookie,
    },
  })
}
