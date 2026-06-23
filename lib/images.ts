export async function getPexelsImage(query: string) {
  if (!process.env.PEXELS_API_KEY) return null

  try {
    const url = new URL('https://api.pexels.com/v1/search')
    url.searchParams.set('query', query)
    url.searchParams.set('per_page', '1')
    url.searchParams.set('orientation', 'landscape')

    const response = await fetch(url, {
      headers: { Authorization: process.env.PEXELS_API_KEY },
      next: { revalidate: 86400 },
    })

    if (!response.ok) return null
    const payload = (await response.json()) as {
      photos?: Array<{ src?: { large2x?: string; large?: string; landscape?: string } }>
    }
    const photo = payload.photos?.[0]
    return photo?.src?.landscape ?? photo?.src?.large2x ?? photo?.src?.large ?? null
  } catch {
    return null
  }
}
