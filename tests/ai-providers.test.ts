import { expect, it } from 'vitest'
import { aiProviders, thinkingLevels, reasoningParameters } from '../src/core/ai-providers'

it('provides HTTPS presets and only supported thinking controls', () => {
  expect(aiProviders.every((provider) => provider.url.startsWith('https://'))).toBe(true)
  expect(thinkingLevels('https://api.openai.com/v1', 'gpt-5')).toEqual(['low', 'medium', 'high'])
  expect(thinkingLevels('https://api.openai.com/v1', 'gpt-4.1')).toEqual([])
  expect(thinkingLevels('https://api.deepseek.com/v1', 'deepseek-chat')).toEqual([])
  expect(thinkingLevels('https://openrouter.ai/api/v1', 'vendor/model', ['reasoning'])).toContain(
    'high',
  )
  expect(reasoningParameters('https://openrouter.ai/api/v1', 'high')).toEqual({
    reasoning: { effort: 'high' },
  })
})
