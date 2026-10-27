import { z } from 'zod'

export const searchPlanSchema = z.object({
  queries: z.array(z.string().trim().min(3).max(240)).max(3),
})
const resultsSchema = z.object({
  results: z.array(
    z.object({ url: z.string(), title: z.string(), content: z.string().optional() }),
  ),
})

export type SearchSource = { url: string; title: string; excerpt: string }

export async function searchWeb(queries: string[]): Promise<SearchSource[]> {
  const endpoint = process.env.WEB_SEARCH_URL
  if (!endpoint)
    throw new Error('Web search is not configured. Disable web search to continue without it.')
  const sources: SearchSource[] = []
  for (const query of searchPlanSchema.parse({ queries }).queries) {
    const url = new URL('/search', endpoint)
    url.searchParams.set('q', query)
    url.searchParams.set('format', 'json')
    const response = await fetch(url, { signal: AbortSignal.timeout(20000), redirect: 'error' })
    if (!response.ok)
      throw new Error('Web search is temporarily unavailable. Try again or disable web search.')
    const data = resultsSchema.parse(await response.json())
    for (const result of data.results.slice(0, 6)) {
      let parsed: URL
      try {
        parsed = new URL(result.url)
      } catch {
        continue
      }
      if (!['https:', 'http:'].includes(parsed.protocol) || parsed.username || parsed.password)
        continue
      if (sources.some((source) => source.url === parsed.href)) continue
      sources.push({
        url: parsed.href,
        title: result.title.slice(0, 300),
        excerpt: (result.content || '').slice(0, 1800),
      })
    }
  }
  if (!sources.length && queries.length)
    throw new Error(
      'Search returned no usable sources. Try a more specific request or disable web search.',
    )
  return sources
}
