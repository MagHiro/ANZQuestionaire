import { defaultNext, type Definition } from './questionnaire'

export function logicDiagnostics(definition: Definition) {
  const issues: { questionId: string; message: string }[] = []
  const ids = definition.questions.map((q) => q.id)
  const reachable = new Set([ids[0]])
  definition.questions.forEach((q, index) => {
    const seen = new Set<string>()
    const choice = ['radio', 'dropdown', 'checkbox', 'multiselect'].includes(q.type)
    for (const branch of q.branches) {
      if (seen.has(branch.equals))
        issues.push({
          questionId: q.id,
          message: 'Duplicate answer rule: only the first match runs.',
        })
      seen.add(branch.equals)
      if (choice && !q.options.some((option) => option.value === branch.equals))
        issues.push({
          questionId: q.id,
          message: 'A rule uses an answer that is no longer an option.',
        })
    }
    for (const target of [defaultNext(definition, index), ...q.branches.map((b) => b.target)]) {
      if (target === '$end') continue
      const position = ids.indexOf(target)
      if (position < 0)
        issues.push({ questionId: q.id, message: 'A route points to a missing question.' })
      else if (position <= index)
        issues.push({
          questionId: q.id,
          message: 'A route points backward. Choose a later question or Finish.',
        })
      else if (reachable.has(q.id)) reachable.add(target)
    }
    if (!reachable.has(q.id))
      issues.push({ questionId: q.id, message: 'This question cannot be reached from the start.' })
  })
  return issues
}
