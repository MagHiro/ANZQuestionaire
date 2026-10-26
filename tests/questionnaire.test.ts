import { describe, expect, it } from 'vitest'
import {
  answerError,
  blankDefinition,
  evaluateResponse,
  validateDefinition,
  type Definition,
} from '../src/core/questionnaire'

function example(): Definition {
  const d = blankDefinition('Learning pathways')
  d.questions = [
    {
      ...d.questions[0],
      id: 'attended',
      title: 'Did you attend?',
      type: 'radio',
      options: [
        { value: 'yes', label: 'Yes' },
        { value: 'no', label: 'No' },
      ],
      branches: [{ equals: 'no', target: 'reason' }],
    },
    {
      ...d.questions[0],
      id: 'presenter',
      title: 'How was the presenter?',
      next: '$end',
    },
    { ...d.questions[0], id: 'reason', title: 'What got in the way?' },
  ]
  return d
}
describe('questionnaire engine', () => {
  it('accepts reusable branching definitions', () => {
    expect(validateDefinition(example()).title).toBe('Learning pathways')
  })
  it('follows branches and strips answers from skipped questions', () => {
    expect(
      evaluateResponse(example(), {
        attended: 'no',
        presenter: 'Stale answer',
        reason: 'Work',
      }),
    ).toEqual({
      complete: true,
      answers: { attended: 'no', reason: 'Work' },
      path: ['attended', 'reason'],
    })
  })
  it('uses default flow and explicit completion', () => {
    expect(
      evaluateResponse(example(), {
        attended: 'yes',
        presenter: 'Great',
        reason: 'ignored',
      }).path,
    ).toEqual(['attended', 'presenter'])
  })
  it('rejects missing required answers', () => {
    expect(evaluateResponse(example(), { attended: 'yes' }).complete).toBe(false)
  })
  it('rejects forged choice values', () => {
    expect(evaluateResponse(example(), { attended: 'maybe' }).complete).toBe(false)
  })
  it('rejects backward branches and cycles', () => {
    const d = example()
    d.questions[1].next = 'attended'
    expect(() => validateDefinition(d)).toThrow('later question')
  })
  it('rejects dangling targets', () => {
    const d = example()
    d.questions[0].branches[0].target = 'missing'
    expect(() => validateDefinition(d)).toThrow()
  })
  it('rejects duplicate IDs', () => {
    const d = example()
    d.questions[1].id = 'attended'
    expect(() => validateDefinition(d)).toThrow('unique')
  })
  it('rejects duplicate conditions', () => {
    const d = example()
    d.questions[0].branches.push({ equals: 'no', target: '$end' })
    expect(() => validateDefinition(d)).toThrow('duplicate')
  })
  it('rejects duplicate option values', () => {
    const d = example()
    d.questions[0].options[1].value = 'yes'
    expect(() => validateDefinition(d)).toThrow('unique')
  })
  it('rejects impossible choice conditions', () => {
    const d = example()
    d.questions[0].branches[0].equals = 'maybe'
    expect(() => validateDefinition(d)).toThrow('not a choice')
  })
  it('rejects unreachable questions', () => {
    const d = example()
    d.questions[0].next = '$end'
    expect(() => validateDefinition(d)).toThrow('cannot be reached')
  })
  it('validates email and number boundaries', () => {
    const q = blankDefinition().questions[0]
    expect(answerError({ ...q, type: 'email' }, 'no')).toBeTruthy()
    expect(answerError({ ...q, type: 'email' }, 'person@example.com')).toBeNull()
    expect(answerError({ ...q, type: 'number' }, 'Infinity')).toBeTruthy()
  })
  it('allows optional empty answers while still traversing the question', () => {
    const d = blankDefinition()
    d.questions[0].required = false
    expect(evaluateResponse(d, { q1: '' }).complete).toBe(true)
  })
  it('rejects executable or unknown properties', () => {
    expect(() => validateDefinition({ ...blankDefinition(), script: 'alert(1)' })).toThrow()
  })
})
