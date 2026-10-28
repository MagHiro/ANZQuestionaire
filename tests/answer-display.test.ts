import { describe, expect, it } from 'vitest'
import { answerLabels } from '../src/core/answer-display'
import { questionSchema } from '../src/core/questionnaire'

const question = questionSchema.parse({
  id: 'plans',
  title: 'Your plans',
  type: 'multiselect',
  options: [
    { value: 'job_offer_new_zealand', label: 'Job offer in New Zealand' },
    { value: 'family', label: 'Join family' },
  ],
})

describe('response answer labels', () => {
  it('shows readable labels instead of stored JSON arrays', () => {
    expect(answerLabels(question, '["job_offer_new_zealand","family"]')).toEqual([
      'Job offer in New Zealand',
      'Join family',
    ])
  })
  it('handles single choices, text, blank and unknown answers', () => {
    expect(answerLabels({ ...question, type: 'dropdown' }, 'family')).toEqual(['Join family'])
    expect(answerLabels(undefined, 'A multiline\nanswer')).toEqual(['A multiline\nanswer'])
    expect(answerLabels(question, '[]')).toEqual(['Not answered'])
    expect(answerLabels(question, '')).toEqual(['Not answered'])
    expect(answerLabels(question, '["old_value"]')).toEqual(['old_value'])
  })
})
