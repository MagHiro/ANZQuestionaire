import { expect, it } from 'vitest'
import { blankDefinition } from '../src/core/questionnaire'
import { describeChanges } from '../src/core/changes'
it('derives branch and wording changes independently from AI summaries', () => {
  const before = blankDefinition()
  const after = structuredClone(before)
  after.questions[0].title = 'A shorter question?'
  after.questions[0].next = '$end'
  expect(describeChanges(before, after)).toContain(
    'Changed wording: What would you like us to know?',
  )
  expect(describeChanges(before, after)).toContain('Changed branching: A shorter question?')
})
