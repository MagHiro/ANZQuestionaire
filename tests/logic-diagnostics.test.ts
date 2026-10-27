import { expect, it } from 'vitest'
import { blankDefinition } from '../src/core/questionnaire'
import { logicDiagnostics } from '../src/core/logic-diagnostics'

it('reports missing targets, conflicting rules and unreachable questions together', () => {
  const definition = blankDefinition()
  const first = definition.questions[0]
  definition.questions.push({ ...structuredClone(first), id: 'second' })
  first.next = '$end'
  first.branches = [
    { equals: 'yes', target: 'missing' },
    { equals: 'yes', target: '$end' },
  ]
  const messages = logicDiagnostics(definition).map((issue) => issue.message)
  expect(messages.some((message) => message.includes('missing'))).toBe(true)
  expect(messages.some((message) => message.includes('Duplicate'))).toBe(true)
  expect(messages.some((message) => message.includes('cannot be reached'))).toBe(true)
})

it('accepts the normal sequential path', () => {
  expect(logicDiagnostics(blankDefinition())).toEqual([])
})
