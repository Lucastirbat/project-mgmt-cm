/**
 * GET /api/og-image?url=<encoded-event-url>
 * Fetches the event page, extracts a cover image URL, then proxies the bytes.
 * Tries og:image / twitter:image meta tags AND Next.js __NEXT_DATA__ JSON
 * (Luma stores the cover in __NEXT_DATA__ when meta tags are JS-rendered).
 */

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

function extractImageUrl(html: string): string | null {
  // Standard meta tag patterns (property/name in either order)
  const metaPatterns = [
    /<meta[^>]+property=["']og:image:secure_url["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image:secure_url["']/i,
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i,
    /<meta[^>]+name=["']twitter:image:src["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image:src["']/i,
  ]
  for (const p of metaPatterns) {
    const m = html.match(p)
    if (m?.[1]?.startsWith('http')) return m[1]
  }

  // Next.js __NEXT_DATA__ JSON — Luma renders og:image via JS so it's in here
  const ndMatch = html.match(/<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/)
  if (ndMatch) {
    try {
      const url = findImageInObj(JSON.parse(ndMatch[1]))
      if (url) return url
    } catch { /* ignore */ }
  }

  return null
}

// Recursively find a cover/image URL in an arbitrary object
function findImageInObj(obj: unknown, depth = 0): string | null {
  if (depth > 8 || !obj || typeof obj !== 'object') return null
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (typeof v === 'string' && v.startsWith('http') && /\.(jpg|jpeg|png|webp|gif)/i.test(v)) {
      if (/cover|image|photo|thumbnail|banner/i.test(k)) return v
    }
    if (typeof v === 'object') {
      const found = findImageInObj(v, depth + 1)
      if (found) return found
    }
  }
  return null
}

export const onRequestGet: PagesFunction = async (context) => {
  const rawUrl = new URL(context.request.url).searchParams.get('url')
  if (!rawUrl) return new Response(null, { status: 204 })

  try {
    // 1. Fetch event page HTML
    const pageRes = await fetch(rawUrl, {
      headers: {
        'User-Agent': UA,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
    })
    if (!pageRes.ok) return new Response(null, { status: 204 })

    const html = await pageRes.text()
    const imageUrl = extractImageUrl(html)
    if (!imageUrl) return new Response(null, { status: 204 })

    // 2. Proxy the image bytes back to the browser
    const imgRes = await fetch(imageUrl, {
      headers: { 'User-Agent': UA, Referer: rawUrl },
      redirect: 'follow',
    })
    if (!imgRes.ok) return new Response(null, { status: 204 })

    const contentType = imgRes.headers.get('Content-Type') ?? 'image/jpeg'
    return new Response(imgRes.body, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch {
    return new Response(null, { status: 204 })
  }
}
