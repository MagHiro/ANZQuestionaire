import type { Definition } from './questionnaire'

/** Generate the review summary from actual definitions, not the model's claims. */
export function describeChanges(before: Definition, after: Definition): string[] {
  const changes: string[] = []
  for (const field of ['title', 'description', 'completionTitle', 'completionMessage'] as const) {
    if (before[field] !== after[field])
      changes.push(`Updated ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}.`)
  }
  for (const q of before.questions) {
    const next = after.questions.find((item) => item.id === q.id)
    if (!next) {
      changes.push(`Removed question: ${q.title}`)
      continue
    }
    if (q.title !== next.title || q.description !== next.description)
      changes.push(`Changed wording: ${q.title}`)
    if (
      q.type !== next.type ||
      q.required !== next.required ||
      JSON.stringify(q.options) !== JSON.stringify(next.options)
    )
      changes.push(`Changed answer settings: ${next.title}`)
    if (q.next !== next.next || JSON.stringify(q.branches) !== JSON.stringify(next.branches))
      changes.push(`Changed branching: ${next.title}`)
  }
  for (const q of after.questions)
    if (!before.questions.some((item) => item.id === q.id))
      changes.push(`Added question: ${q.title}`)
  if (before.questions.map((q) => q.id).join(',') !== after.questions.map((q) => q.id).join(','))
    changes.push(
      'Question sequence changed. Sequential routing may also change; check the Logic view.',
    )
  return changes.length ? changes : ['No changes detected.']
}
