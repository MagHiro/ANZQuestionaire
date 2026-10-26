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
    type: z.enum([
      'radio',
      'dropdown',
      'text',
      'textarea',
      'email',
      'number',
      'date',
      'checkbox',
      'multiselect',
      'tel',
      'url',
    ]),
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
    results: z
      .array(
        z
          .object({
            id: identifier,
            title: z.string().min(1).max(300),
            message: z.string().max(4000),
            match: z.enum(['all', 'any']),
            conditions: z
              .array(
                z
                  .object({
                    questionId: identifier,
                    operator: z.enum(['equals', 'notEquals', 'contains', 'gte', 'lte']),
                    value: z.string().min(1).max(1000),
                  })
                  .strict(),
              )
              .min(1)
              .max(50),
          })
          .strict(),
      )
      .max(50)
      .optional(),
    payment: z
      .object({
        enabled: z.boolean(),
        amountMinor: z.number().int().min(100).max(10000000),
        currency: z.enum(['sgd', 'aud', 'nzd', 'usd']),
        emailQuestionId: identifier,
        reportExpected: z.boolean(),
      })
      .strict()
      .optional(),
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
    const choice = ['radio', 'dropdown', 'checkbox', 'multiselect'].includes(q.type)
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
  if (
    definition.payment?.enabled &&
    !definition.questions.some(
      (q) => q.id === definition.payment?.emailQuestionId && q.type === 'email' && q.required,
    )
  )
    throw new Error('Paid questionnaires need a required email question.')
  if (definition.payment?.enabled) {
    // A required email is not sufficient if branching can skip it. Traverse the
    // forward-only graph with that node removed; Finish must be unreachable.
    const emailId = definition.payment.emailQuestionId
    const pending = [ids[0]]
    const visited = new Set<string>()
    while (pending.length) {
      const id = pending.pop()!
      if (id === emailId || visited.has(id)) continue
      if (id === '$end')
        throw new Error('Every paid submission path must include the required email question.')
      visited.add(id)
      const index = ids.indexOf(id)
      pending.push(
        defaultNext(definition, index),
        ...definition.questions[index].branches.map((b) => b.target),
      )
    }
  }
  if (new Set(definition.results?.map((r) => r.id)).size !== (definition.results?.length || 0))
    throw new Error('Result IDs must be unique.')
  for (const result of definition.results || [])
    for (const condition of result.conditions) {
      const q = definition.questions.find((q) => q.id === condition.questionId)
      if (!q) throw new Error(`Result ${result.id}: question does not exist.`)
      if (
        ['gte', 'lte'].includes(condition.operator) &&
        (q.type !== 'number' || !Number.isFinite(Number(condition.value)))
      )
        throw new Error(`Result ${result.id}: numeric conditions need a number question and value.`)
      if (condition.operator === 'contains' && !['checkbox', 'multiselect'].includes(q.type))
        throw new Error(`Result ${result.id}: contains needs a multiple-selection question.`)
    }
  return definition
}

export function selectedValues(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value)
    return z.array(z.string()).parse(parsed)
  } catch {
    return []
  }
}

/** Results are ordered; first matching result wins. Unvisited/blank answers never match. */
export function responseResult(definition: Definition, input: Answers) {
  const evaluation = evaluateResponse(definition, input)
  if (!evaluation.complete) return null
  return (
    definition.results?.find((result) => {
      const matches = result.conditions.map((c) => {
        const answer = evaluation.answers[c.questionId]
        if (!answer?.trim()) return false
        if (c.operator === 'equals') return answer === c.value
        if (c.operator === 'notEquals') return answer !== c.value
        if (c.operator === 'contains') return selectedValues(answer).includes(c.value)
        return c.operator === 'gte'
          ? Number(answer) >= Number(c.value)
          : Number(answer) <= Number(c.value)
      })
      return result.match === 'all' ? matches.every(Boolean) : matches.some(Boolean)
    }) || null
  )
}

export function answerError(q: Question, value: string | undefined): string | null {
  if (!value?.trim()) return q.required ? 'Please answer this question to continue.' : null
  if (value.length > 10000) return 'Your answer is too long.'
  if ((q.type === 'radio' || q.type === 'dropdown') && !q.options.some((o) => o.value === value))
    return 'Choose one of the available answers.'
  if (q.type === 'email' && !z.email().safeParse(value).success)
    return 'Enter a valid email address.'
  if (q.type === 'number' && !Number.isFinite(Number(value))) return 'Enter a valid number.'
  if (['checkbox', 'multiselect'].includes(q.type)) {
    const parsed = z.array(z.string()).safeParse(
      (() => {
        try {
          return JSON.parse(value)
        } catch {
          return null
        }
      })(),
    )
    if (!parsed.success) return 'Choose valid answers.'
    const selected = selectedValues(value)
    if (!selected.length) return q.required ? 'Select at least one answer.' : null
    if (
      new Set(selected).size !== selected.length ||
      selected.some((v) => !q.options.some((o) => o.value === v))
    )
      return 'Choose valid answers.'
  }
  if (
    q.type === 'date' &&
    (!/^\d{4}-\d{2}-\d{2}$/.test(value) ||
      !Number.isFinite(Date.parse(value)) ||
      new Date(value).toISOString().slice(0, 10) !== value)
  )
    return 'Choose a valid date.'
  if (q.type === 'url' && !z.url({ protocol: /^https?$/ }).safeParse(value).success)
    return 'Enter a valid HTTP or HTTPS URL.'
  if (q.type === 'tel' && !/^[+\d][\d ()-]{5,30}$/.test(value)) return 'Enter a valid phone number.'
  return null
}

export function nextQuestion(definition: Definition, q: Question, answer: string): string {
  return (
    q.branches.find((b) =>
      ['checkbox', 'multiselect'].includes(q.type)
        ? selectedValues(answer).includes(b.equals)
        : b.equals === answer,
    )?.target ||
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
