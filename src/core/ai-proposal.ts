import { z } from 'zod'
import { definitionSchema, validateDefinition } from './questionnaire'

export const aiContextSchema = z
  .object({
    selectedQuestionId: z.string().max(64).optional(),
    history: z
      .array(
        z.object({ role: z.enum(['user', 'assistant']), content: z.string().max(12000) }).strict(),
      )
      .max(8)
      .default([]),
  })
  .strict()
export type AiContext = z.infer<typeof aiContextSchema>
export const proposalSchema = z
  .object({
    summary: z.string().min(1).max(4000),
    clarification: z.string().max(2000).optional(),
    definition: definitionSchema,
  })
  .strict()
export function parseAiProposal(content: string) {
  // Some compatible providers wrap JSON despite JSON-mode; accept only the wrapper, not arbitrary prose.
  const cleaned = content
    .trim()
    .replace(/^```(?:json)?\s*\n?/, '')
    .replace(/\n?```$/, '')
  const proposal = proposalSchema.parse(JSON.parse(cleaned))
  validateDefinition(proposal.definition)
  return proposal
}
