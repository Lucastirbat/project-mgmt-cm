/**
 * GET /api/og-image?url=<encoded-event-url>
 * Fetches the event page, extracts a cover image URL (og:image / twitter:image),
 * then proxies the image bytes back so the browser never touches the CDN directly
 * (avoids hotlink-protection on Luma and similar platforms).
 */

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

function extractImageUrl(html: string): string | null {
  const patterns = [
    /<meta[^>]+property=["']og:image:secure_url["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image:secure_url["']/i,
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i,
    /<meta[^>]+name=["']twitter:image:src["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image:src["']/i,
  ]
  for (const p of patterns) {
    const m = html.match(p)
    if (m?.[1] && m[1].startsWith('http')) return m[1]
  }
  return null
}

export const onRequestGet: PagesFunction = async (context) => {
  const rawUrl = new URL(context.request.url).searchParams.get('url')
  if (!rawUrl) return new Response(null, { status: 204 })

  try {
    // 1. Fetch event page
    const pageRes = await fetch(rawUrl, {
      headers: {
        'User-Agent': UA,
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
    })
    if (!pageRes.ok) return new Response(null, { status: 204 })

    // Only read enough HTML to find the og:image (first 64 KB is enough for <head>)
    const reader = pageRes.body?.getReader()
    if (!reader) return new Response(null, { status: 204 })
    let html = ''
    while (html.length < 65536) {
      const { done, value } = await reader.read()
      if (value) html += new TextDecoder().decode(value)
      if (done) break
      if (html.includes('</head>')) break
    }
    reader.cancel()

    const imageUrl = extractImageUrl(html)
    if (!imageUrl) return new Response(null, { status: 204 })

    // 2. Proxy the image bytes
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
