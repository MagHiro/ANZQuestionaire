import { afterEach, expect, it, vi } from 'vitest'
import { providerModels } from '../src/server/ai-settings'

afterEach(() => vi.unstubAllGlobals())

it('loads provider models server-side and returns only model information', async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValue(
      Response.json({
        data: [{ id: 'gpt-5', owned_by: 'openai', secret: 'never-return' }, { id: 'gpt-4.1' }],
      }),
    )
  vi.stubGlobal('fetch', fetchMock)
  const models = await providerModels('https://api.openai.com/v1', 'private-key')
  expect(models.find((model) => model.id === 'gpt-5')?.thinkingLevels).toContain('high')
  expect(JSON.stringify(models)).not.toContain('private-key')
  expect(JSON.stringify(models)).not.toContain('never-return')
  expect(fetchMock).toHaveBeenCalledWith(
    'https://api.openai.com/v1/models',
    expect.objectContaining({
      redirect: 'error',
      headers: { Authorization: 'Bearer private-key' },
    }),
  )
})

it('fails explicitly when the provider rejects model discovery', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 401 })))
  await expect(providerModels('https://api.openai.com/v1', 'bad-key')).rejects.toThrow('HTTP 401')
})
