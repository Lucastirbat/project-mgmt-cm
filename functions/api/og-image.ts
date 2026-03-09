/**
 * GET /api/og-image?url=<encoded-url>
 * Server-side proxy: fetches a page and extracts og:image meta tag.
 * Used by trip pages to show Luma (and other) event cover images.
 */

export const onRequestGet: PagesFunction = async (context) => {
  const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600', 'Access-Control-Allow-Origin': '*' }
  const rawUrl = new URL(context.request.url).searchParams.get('url')
  if (!rawUrl) return new Response(JSON.stringify({ imageUrl: null }), { headers })

  try {
    const res = await fetch(rawUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; bot/1.0)', Accept: 'text/html' },
      redirect: 'follow',
    })
    if (!res.ok) return new Response(JSON.stringify({ imageUrl: null }), { headers })

    const html = await res.text()
    const match =
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/) ??
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/)

    return new Response(JSON.stringify({ imageUrl: match?.[1] ?? null }), { headers })
  } catch {
    return new Response(JSON.stringify({ imageUrl: null }), { headers })
  }
}
