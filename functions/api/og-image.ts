/**
 * GET /api/og-image?url=<encoded-event-url>
 * Fetches the event page, extracts og:image, then proxies the image bytes.
 * Returns the actual image so the browser never touches the CDN URL directly
 * (avoids hotlink-protection issues on Luma and similar platforms).
 */

export const onRequestGet: PagesFunction = async (context) => {
  const rawUrl = new URL(context.request.url).searchParams.get('url')
  if (!rawUrl) return new Response(null, { status: 204 })

  try {
    // 1. Fetch event page and extract og:image URL
    const pageRes = await fetch(rawUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; bot/1.0)', Accept: 'text/html' },
      redirect: 'follow',
    })
    if (!pageRes.ok) return new Response(null, { status: 204 })

    const html = await pageRes.text()
    const match =
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/) ??
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/)

    const imageUrl = match?.[1]
    if (!imageUrl) return new Response(null, { status: 204 })

    // 2. Proxy the image bytes back to the browser
    const imgRes = await fetch(imageUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; bot/1.0)', Referer: rawUrl },
    })
    if (!imgRes.ok) return new Response(null, { status: 204 })

    const contentType = imgRes.headers.get('Content-Type') ?? 'image/jpeg'
    return new Response(imgRes.body, {
      status: 200,
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
