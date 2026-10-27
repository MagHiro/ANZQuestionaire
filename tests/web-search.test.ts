import { afterEach, expect, it, vi } from 'vitest'
import { searchPlanSchema, searchWeb } from '../src/server/web-search'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

it('bounds research queries', () => {
  expect(() => searchPlanSchema.parse({ queries: ['a', 'b', 'c', 'd'] })).toThrow()
})

it('filters unsafe links, deduplicates sources and bounds excerpts', async () => {
  vi.stubEnv('WEB_SEARCH_URL', 'http://search:8080')
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      Response.json({
        results: [
          { title: 'Official source', url: 'https://example.gov/rules', content: 'x'.repeat(3000) },
          { title: 'Duplicate', url: 'https://example.gov/rules' },
          { title: 'Unsafe', url: 'javascript:alert(1)' },
        ],
      }),
    ),
  )
  const sources = await searchWeb(['official visa criteria'])
  expect(sources).toHaveLength(1)
  expect(sources[0].excerpt).toHaveLength(1800)
  expect(fetch).toHaveBeenCalledWith(
    expect.any(URL),
    expect.objectContaining({ redirect: 'error' }),
  )
})

it('fails explicitly when research is unavailable', async () => {
  vi.stubEnv('WEB_SEARCH_URL', '')
  await expect(searchWeb(['visa criteria'])).rejects.toThrow('not configured')
})
