import { selectedValues, type Question } from './questionnaire'

/** Resolve stored option values against the release the respondent completed. */
export function answerLabels(question: Question | undefined, value: string): string[] {
  if (!value.trim()) return ['Not answered']
  const values =
    question && ['checkbox', 'multiselect'].includes(question.type)
      ? selectedValues(value)
      : [value]
  if (!values.length) return ['Not answered']
  return values.map(
    (item) => question?.options.find((option) => option.value === item)?.label || item,
  )
}
