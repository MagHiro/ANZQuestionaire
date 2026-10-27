import { expect, it } from 'vitest'
import { blankDefinition } from '../src/core/questionnaire'
import { aiContextSchema, parseAiProposal } from '../src/core/ai-proposal'
import { describeChanges } from '../src/core/changes'
it('validates generated results and reports their actual changes', () => {
  const before = blankDefinition()
  const after = {
    ...before,
    results: [
      {
        id: 'result_one',
        title: 'Next steps',
        message: 'We can discuss your plans.',
        match: 'all' as const,
        conditions: [
          {
            questionId: before.questions[0].id,
            operator: 'equals' as const,
            value: 'Discuss plans',
          },
        ],
      },
    ],
  }
  const parsed = parseAiProposal(JSON.stringify({ summary: 'Added an outcome', definition: after }))
  expect(parsed.definition.results).toHaveLength(1)
  expect(describeChanges(before, parsed.definition)).toContain('Added result: Next steps')
  after.results[0].conditions[0].questionId = 'missing'
  expect(() =>
    parseAiProposal(JSON.stringify({ summary: 'Invalid result', definition: after })),
  ).toThrow()
})
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
