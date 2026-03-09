/**
 * GET /api/og-image?url=<encoded-event-url>
 * Fetches the event page, extracts og:image / twitter:image, proxies the bytes.
 * If the site blocks server-side scraping, set imageUrl manually on the event.
 */

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

function extractFromHtml(html: string): string | null {
  const patterns = [
    /<meta[^>]+property=["']og:image:secure_url["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image:secure_url["']/i,
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i,
  ]
  for (const p of patterns) {
    const m = html.match(p)
    if (m?.[1]?.startsWith('http')) return m[1]
  }
  return null
}

export const onRequestGet: PagesFunction = async (context) => {
  const rawUrl = new URL(context.request.url).searchParams.get('url')
  if (!rawUrl) return new Response(null, { status: 204 })

  try {
    const pageRes = await fetch(rawUrl, {
      headers: {
        'User-Agent': UA,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
      },
      redirect: 'follow',
    })
    if (!pageRes.ok) return new Response(null, { status: 204 })

    const imageUrl = extractFromHtml(await pageRes.text())
    if (!imageUrl) return new Response(null, { status: 204 })

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
