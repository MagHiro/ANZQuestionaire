import type { Definition } from './questionnaire'

/** Object property order is not a draft edit; question/option array order is. */
export function definitionSnapshot(definition: Definition): string {
  return JSON.stringify(definition, (_key, value) => {
    if (value && typeof value === 'object' && !Array.isArray(value))
      return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)))
    return value
  })
}

export function needsClarification(clarification?: string): boolean {
  return Boolean(clarification?.trim())
}
