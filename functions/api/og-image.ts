/**
 * GET /api/og-image?url=<encoded-event-url>
 * Extracts a cover image and proxies the bytes back.
 *
 * Strategy (in order):
 * 1. Luma public API  — lu.ma/luma.com URLs → api.lu.ma/public/v1/event/get
 * 2. Direct HTML scrape (og:image / twitter:image / __NEXT_DATA__)
 * 3. microlink.io free API fallback
 * 4. Return 204 if nothing found
 */

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

// ─── Luma API ────────────────────────────────────────────────────────────────

function lumaSlug(rawUrl: string): string | null {
  try {
    const u = new URL(rawUrl)
    if (u.hostname === 'lu.ma' || u.hostname === 'luma.com' || u.hostname === 'www.lu.ma' || u.hostname === 'www.luma.com') {
      const slug = u.pathname.replace(/^\//, '').split('/')[0]
      return slug || null
    }
  } catch { /* ignore */ }
  return null
}

async function fetchViaLumaApi(slug: string): Promise<string | null> {
  try {
    const res = await fetch(`https://api.lu.ma/public/v1/event/get?url=${encodeURIComponent(slug)}`, {
      headers: { Accept: 'application/json', 'User-Agent': UA },
    })
    if (!res.ok) return null
    const data = await res.json() as { event?: { cover_url?: string; cover?: string }; cover_url?: string }
    return data?.event?.cover_url ?? data?.event?.cover ?? data?.cover_url ?? null
  } catch {
    return null
  }
}

// ─── HTML extraction ──────────────────────────────────────────────────────────

function extractFromHtml(html: string): string | null {
  const metaPatterns = [
    /<meta[^>]+property=["']og:image:secure_url["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image:secure_url["']/i,
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i,
  ]
  for (const p of metaPatterns) {
    const m = html.match(p)
    if (m?.[1]?.startsWith('http')) return m[1]
  }
  const nd = html.match(/<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/)
  if (nd) {
    try { return findImgInObj(JSON.parse(nd[1])) } catch { /* ignore */ }
  }
  return null
}

function findImgInObj(obj: unknown, depth = 0): string | null {
  if (depth > 8 || !obj || typeof obj !== 'object') return null
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (typeof v === 'string' && v.startsWith('http') && /\.(jpe?g|png|webp|gif)/i.test(v)) {
      if (/cover|image|photo|thumb|banner/i.test(k)) return v
    }
    if (typeof v === 'object') {
      const r = findImgInObj(v, depth + 1)
      if (r) return r
    }
  }
  return null
}

// ─── microlink.io fallback ─────────────────────────────────────────────────────

async function fetchViaMicrolink(eventUrl: string): Promise<string | null> {
  try {
    const res = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(eventUrl)}&screenshot=false`, {
      headers: { 'User-Agent': UA },
    })
    if (!res.ok) return null
    const data = await res.json() as { data?: { image?: { url?: string } } }
    return data?.data?.image?.url ?? null
  } catch {
    return null
  }
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export const onRequestGet: PagesFunction = async (context) => {
  const rawUrl = new URL(context.request.url).searchParams.get('url')
  if (!rawUrl) return new Response(null, { status: 204 })

  let imageUrl: string | null = null

  // 1. Luma-specific API (bypasses HTML scraping entirely)
  const slug = lumaSlug(rawUrl)
  if (slug) {
    imageUrl = await fetchViaLumaApi(slug)
  }

  // 2. Direct HTML scrape
  if (!imageUrl) {
    try {
      const pageRes = await fetch(rawUrl, {
        headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml,*/*;q=0.8', 'Accept-Language': 'en-US,en;q=0.9' },
        redirect: 'follow',
      })
      if (pageRes.ok) imageUrl = extractFromHtml(await pageRes.text())
    } catch { /* fall through */ }
  }

  // 3. microlink.io fallback
  if (!imageUrl) {
    imageUrl = await fetchViaMicrolink(rawUrl)
  }

  if (!imageUrl) return new Response(null, { status: 204 })

  // 4. Proxy the image bytes back to the browser
  try {
    const imgRes = await fetch(imageUrl, {
      headers: { 'User-Agent': UA, Referer: rawUrl },
      redirect: 'follow',
    })
    if (!imgRes.ok) return new Response(null, { status: 204 })

    return new Response(imgRes.body, {
      headers: {
        'Content-Type': imgRes.headers.get('Content-Type') ?? 'image/jpeg',
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch {
    return new Response(null, { status: 204 })
  }
}
