import { z } from 'zod'

const identifier = z.string().regex(/^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/)
const option = z
  .object({
    value: z.string().min(1).max(120),
    label: z.string().min(1).max(300),
  })
  .strict()
const branch = z
  .object({
    equals: z.string().max(10000),
    target: z.union([identifier, z.literal('$end')]),
  })
  .strict()
export const questionSchema = z
  .object({
    id: identifier,
    title: z.string().min(1).max(500),
    description: z.string().max(2000).default(''),
    page: z.string().min(1).max(120).default('Your answers'),
    type: z.enum(['radio', 'dropdown', 'text', 'textarea', 'email', 'number']),
    required: z.boolean().default(true),
    options: z.array(option).max(100).default([]),
    branches: z.array(branch).max(100).default([]),
    next: z.union([identifier, z.literal('$end'), z.literal('')]).default(''),
  })
  .strict()
export const definitionSchema = z
  .object({
    schemaVersion: z.literal(1),
    title: z.string().min(1).max(160),
    description: z.string().max(2000),
    completionTitle: z.string().min(1).max(300),
    completionMessage: z.string().max(2000),
    questions: z.array(questionSchema).min(1).max(200),
  })
  .strict()
export type Definition = z.infer<typeof definitionSchema>
export type Question = Definition['questions'][number]
export type Answers = Record<string, string>
export const answersSchema = z.record(z.string().max(64), z.string().max(10000))

export function defaultNext(definition: Definition, index: number): string {
  return definition.questions[index].next || definition.questions[index + 1]?.id || '$end'
}

/** Only forward edges are allowed: guarantees termination and unambiguous answer invalidation. */
export function validateDefinition(input: unknown): Definition {
  const definition = definitionSchema.parse(input)
  const ids = definition.questions.map((q) => q.id)
  if (new Set(ids).size !== ids.length) throw new Error('Question IDs must be unique.')
  const reachable = new Set([ids[0]])
  definition.questions.forEach((q, index) => {
    const choice = q.type === 'radio' || q.type === 'dropdown'
    if (choice && q.options.length < 2) throw new Error(`${q.id}: add at least two choices.`)
    if (!choice && q.options.length)
      throw new Error(`${q.id}: only choice questions can have options.`)
    const values = q.options.map((o) => o.value)
    if (new Set(values).size !== values.length)
      throw new Error(`${q.id}: choice values must be unique.`)
    if (new Set(q.branches.map((b) => b.equals)).size !== q.branches.length)
      throw new Error(`${q.id}: duplicate branch conditions.`)
    for (const rule of q.branches) {
      if (choice && !values.includes(rule.equals))
        throw new Error(`${q.id}: branch answer is not a choice.`)
    }
    const targets = [defaultNext(definition, index), ...q.branches.map((b) => b.target)]
    for (const target of targets) {
      if (target === '$end') continue
      const position = ids.indexOf(target)
      if (position <= index)
        throw new Error(`${q.id}: branches must point to a later question or Finish.`)
      if (reachable.has(q.id)) reachable.add(target)
    }
  })
  for (const id of ids)
    if (!reachable.has(id)) throw new Error(`${id}: this question cannot be reached.`)
  return definition
}

export function answerError(q: Question, value: string | undefined): string | null {
  if (!value?.trim()) return q.required ? 'Please answer this question to continue.' : null
  if (value.length > 10000) return 'Your answer is too long.'
  if ((q.type === 'radio' || q.type === 'dropdown') && !q.options.some((o) => o.value === value))
    return 'Choose one of the available answers.'
  if (q.type === 'email' && !z.email().safeParse(value).success)
    return 'Enter a valid email address.'
  if (q.type === 'number' && !Number.isFinite(Number(value))) return 'Enter a valid number.'
  return null
}

export function nextQuestion(definition: Definition, q: Question, answer: string): string {
  return (
    q.branches.find((b) => b.equals === answer)?.target ||
    defaultNext(
      definition,
      definition.questions.findIndex((item) => item.id === q.id),
    )
  )
}

/** Replays the actual path; hidden/stale answers never reach scoring or persistence. */
export function evaluateResponse(
  definition: Definition,
  input: Answers,
): { answers: Answers; path: string[]; complete: boolean } {
  const answers: Answers = {}
  const path: string[] = []
  let id = definition.questions[0].id
  while (id !== '$end') {
    const q = definition.questions.find((item) => item.id === id)
    if (!q || path.includes(id)) throw new Error('Invalid questionnaire flow.')
    path.push(id)
    if (!(id in input) || answerError(q, input[id])) return { answers, path, complete: false }
    answers[id] = input[id]
    id = nextQuestion(definition, q, input[id])
  }
  return { answers, path, complete: true }
}

export function blankDefinition(title = 'Untitled questionnaire'): Definition {
  return {
    schemaVersion: 1,
    title,
    description: 'A few thoughtful questions. One step at a time.',
    completionTitle: 'Thank you. You’re all done.',
    completionMessage: 'Your answers have been received.',
    questions: [
      {
        id: 'q1',
        title: 'What would you like us to know?',
        description: '',
        page: 'Getting started',
        type: 'text',
        required: true,
        options: [],
        branches: [],
        next: '',
      },
    ],
  }
}
