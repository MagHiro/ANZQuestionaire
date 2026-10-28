import { expect, it } from 'vitest'
import { definitionSnapshot, needsClarification } from '../src/core/proposal-state'
import type { Definition } from '../src/core/questionnaire'

it('ignores property order but preserves question sequence when comparing drafts', () => {
  const first = {
    title: 'Draft',
    questions: [
      { id: 'q1', title: 'First' },
      { id: 'q2', title: 'Second' },
    ],
  } as Definition
  const reorderedKeys = {
    questions: first.questions.map((q) => ({ title: q.title, id: q.id })),
    title: 'Draft',
  } as Definition
  expect(definitionSnapshot(first)).toBe(definitionSnapshot(reorderedKeys))
  expect(definitionSnapshot(first)).not.toBe(
    definitionSnapshot({ ...first, questions: [...first.questions].reverse() }),
  )
})

it('does not block application for whitespace-only clarification', () => {
  expect(needsClarification(' \n ')).toBe(false)
  expect(needsClarification()).toBe(false)
  expect(needsClarification('Which country?')).toBe(true)
})
