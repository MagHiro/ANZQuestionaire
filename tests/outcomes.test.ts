import { expect, it } from 'vitest'
import {
  blankDefinition,
  validateDefinition,
  responseResult,
  answerError,
  nextQuestion,
  questionSchema,
} from '../src/core/questionnaire'
import { renderEmail } from '../src/core/email-template'
import { responseToken, validResponseToken } from '../src/server/respondent-access'

it('supports optional results and first matching compound rules', () => {
  const d = blankDefinition()
  d.questions[0].type = 'number'
  d.results = [
    {
      id: 'adult',
      title: 'Adult',
      message: 'Example result',
      match: 'all',
      conditions: [{ questionId: 'q1', operator: 'gte', value: '18' }],
    },
  ]
  expect(responseResult(validateDefinition(d), { q1: '20' })?.id).toBe('adult')
  expect(responseResult(d, { q1: '17' })).toBeNull()
  d.payment = {
    enabled: true,
    amountMinor: 100,
    currency: 'sgd',
    emailQuestionId: 'q1',
    reportExpected: true,
  }
  expect(responseResult(d, { q1: '20' })).toBeNull()
  d.payment.enabled = false
  expect(responseResult(d, { q1: '20' })?.id).toBe('adult')
  delete d.results
  expect(responseResult(d, { q1: '20' })).toBeNull()
})
it('rejects invalid result references and missing paid email configuration', () => {
  const d = blankDefinition()
  d.results = [
    {
      id: 'r',
      title: 'Result',
      message: '',
      match: 'all',
      conditions: [{ questionId: 'missing', operator: 'equals', value: 'x' }],
    },
  ]
  expect(() => validateDefinition(d)).toThrow('does not exist')
  delete d.results
  d.payment = {
    enabled: true,
    amountMinor: 100,
    currency: 'sgd',
    emailQuestionId: 'q1',
    reportExpected: true,
  }
  expect(() => validateDefinition(d)).toThrow('required email')
})
it('rejects paid flows whose branches skip the required respondent email', () => {
  const d = blankDefinition()
  d.questions[0].branches = [{ equals: 'skip', target: '$end' }]
  d.questions.push(questionSchema.parse({ id: 'email', title: 'Your email', type: 'email' }))
  d.payment = {
    enabled: true,
    amountMinor: 100,
    currency: 'sgd',
    emailQuestionId: 'email',
    reportExpected: true,
  }
  expect(() => validateDefinition(d)).toThrow('Every paid submission path')
  d.questions[0].branches = []
  expect(() => validateDefinition(d)).not.toThrow()
})

it('validates calendar dates and multiple selections', () => {
  const q = questionSchema.parse({ id: 'date', title: 'Date', type: 'date' })
  expect(answerError(q, '2026-02-30')).toBeTruthy()
  expect(answerError(q, '2026-02-28')).toBeNull()
  const multi = questionSchema.parse({
    id: 'm',
    title: 'Multiple',
    type: 'checkbox',
    options: [
      { value: 'a', label: 'A' },
      { value: 'b', label: 'B' },
    ],
  })
  expect(answerError(multi, '["a","b"]')).toBeNull()
  expect(answerError(multi, '["a","a"]')).toBeTruthy()
  multi.branches = [{ equals: 'b', target: '$end' }]
  const d = blankDefinition()
  d.questions = [multi, questionSchema.parse({ id: 'followup', title: 'More', type: 'text' })]
  expect(nextQuestion(d, multi, '["a","b"]')).toBe('$end')
  expect(nextQuestion(d, multi, '["a"]')).toBe('followup')
})
it('escapes email variables and rejects unsafe button URLs', () => {
  const result = renderEmail(
    [
      { type: 'text', text: '{{message}}', url: '' },
      { type: 'button', text: 'Open', url: 'javascript:alert(1)' },
    ],
    { message: '<script>bad</script>' },
  )
  expect(result.html).toContain('&lt;script&gt;')
  expect(result.html).not.toContain('href=')
})
it('binds private confirmation tokens to their response', () => {
  process.env.RESPONSE_ACCESS_SECRET = 'test-only-secret'
  expect(validResponseToken('one', responseToken('one'))).toBe(true)
  expect(validResponseToken('two', responseToken('one'))).toBe(false)
  expect(validResponseToken('one', 'invalid')).toBe(false)
})
