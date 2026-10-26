import { expect, it } from 'vitest'
import { blankDefinition } from '../src/core/questionnaire'
import { aiContextSchema, parseAiProposal } from '../src/core/ai-proposal'
it('accepts validated JSON and common fenced JSON wrappers', () => {
  const value = JSON.stringify({ summary: 'Shortened the wording.', definition: blankDefinition() })
  expect(parseAiProposal(value).definition.questions).toHaveLength(1)
  expect(parseAiProposal('```json\n' + value + '\n```').summary).toContain('Shortened')
})
it('supports explicit clarification without inventing decision criteria', () => {
  expect(
    parseAiProposal(
      JSON.stringify({
        summary: 'Need clarification.',
        clarification: 'What are the approved criteria?',
        definition: blankDefinition(),
      }),
    ).clarification,
  ).toContain('approved')
})
it('rejects invalid flows and oversized conversation histories', () => {
  const d = blankDefinition()
  d.questions[0].next = 'missing'
  expect(() => parseAiProposal(JSON.stringify({ summary: 'Invalid', definition: d }))).toThrow()
  expect(() =>
    aiContextSchema.parse({
      history: Array.from({ length: 9 }, () => ({ role: 'user', content: 'test' })),
    }),
  ).toThrow()
})
