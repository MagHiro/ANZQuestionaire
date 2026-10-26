import { afterEach, expect, it, vi } from 'vitest'
import { blankDefinition } from '../src/core/questionnaire'
vi.mock('../src/server/ai-settings', () => ({
  getAiConfiguration: async () => ({
    baseUrl: 'https://provider.example/v1',
    model: 'test',
    apiKey: 'secret',
  }),
  validateBaseUrl: (url: string) => url,
}))
import { authorQuestionnaire } from '../src/server/ai-author'
afterEach(() => vi.unstubAllGlobals())
it('repairs one malformed result and carries selected-question and conversation context', async () => {
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(Response.json({ choices: [{ message: { content: 'invalid JSON' } }] }))
    .mockResolvedValueOnce(
      Response.json({
        choices: [
          {
            message: {
              content: JSON.stringify({ summary: 'Repaired.', definition: blankDefinition() }),
            },
          },
        ],
      }),
    )
  vi.stubGlobal('fetch', fetchMock)
  const result = await authorQuestionnaire(blankDefinition(), 'Make this clearer', {
    selectedQuestionId: 'q1',
    history: [{ role: 'user', content: 'Keep the wording short' }],
  })
  expect(result.summary).toBe('Repaired.')
  expect(fetchMock).toHaveBeenCalledTimes(2)
  expect(fetchMock.mock.calls[0][1].body).toContain('selectedQuestionId')
  expect(fetchMock.mock.calls[1][1].body).toContain('Repair the JSON')
})
it('leaves the draft alone after repeated invalid output', async () => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockImplementation(async () => Response.json({ choices: [{ message: { content: '{}' } }] })),
  )
  await expect(authorQuestionnaire(blankDefinition(), 'Rewrite', { history: [] })).rejects.toThrow(
    'draft is unchanged',
  )
})
