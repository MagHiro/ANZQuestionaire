import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { db } from '@/server/db'
import { rateLimit } from '@/server/auth'
import { answersSchema, evaluateResponse, validateDefinition } from '@/core/questionnaire'

const schema = z
  .object({
    releaseId: z.uuid(),
    submissionId: z.uuid(),
    answers: answersSchema,
  })
  .strict()
export async function POST(request: Request) {
  try {
    if (!request.headers.get('content-type')?.includes('application/json'))
      return Response.json({ error: 'JSON required.' }, { status: 415 })
    const text = await request.text()
    if (text.length > 500000) return Response.json({ error: 'Request too large.' }, { status: 413 })
    const input = schema.parse(JSON.parse(text))
    await rateLimit(`response:${input.releaseId}`, 300, 60)
    const record = await db().query<{
      definition: unknown
      webhook_url: string | null
    }>(
      `SELECT r.definition,q.webhook_url FROM releases r JOIN questionnaires q ON q.id=r.questionnaire_id WHERE r.id=$1 AND NOT q.archived`,
      [input.releaseId],
    )
    if (!record.rows[0])
      return Response.json({ error: 'Questionnaire unavailable.' }, { status: 404 })
    const evaluation = evaluateResponse(
      validateDefinition(record.rows[0].definition),
      input.answers,
    )
    if (!evaluation.complete)
      return Response.json({ error: 'Please complete all applicable questions.' }, { status: 400 })
    const client = await db().connect()
    try {
      await client.query('BEGIN')
      const result = await client.query<{ id: string }>(
        'INSERT INTO responses(id,release_id,answers,path) VALUES($1,$2,$3,$4) ON CONFLICT(id) DO NOTHING RETURNING id',
        [
          input.submissionId,
          input.releaseId,
          JSON.stringify(evaluation.answers),
          JSON.stringify(evaluation.path),
        ],
      )
      if (!result.rows.length) {
        const previous = await client.query<{
          release_id: string
          answers: unknown
        }>('SELECT release_id,answers FROM responses WHERE id=$1', [input.submissionId])
        if (
          previous.rows[0]?.release_id !== input.releaseId ||
          JSON.stringify(previous.rows[0].answers) !== JSON.stringify(evaluation.answers)
        ) {
          // JSONB key order can differ; compare canonically below.
          const canonical = (value: unknown) =>
            JSON.stringify(
              Object.entries(answersSchema.parse(value)).sort(([a], [b]) => a.localeCompare(b)),
            )
          if (
            previous.rows[0]?.release_id !== input.releaseId ||
            canonical(previous.rows[0].answers) !== canonical(evaluation.answers)
          )
            throw new Error('Submission identifier already used.')
        }
      } else if (record.rows[0].webhook_url) {
        const event = {
          id: randomUUID(),
          type: 'questionnaire.completed',
          responseId: input.submissionId,
          releaseId: input.releaseId,
          createdAt: new Date().toISOString(),
        }
        await client.query(
          'INSERT INTO webhook_deliveries(id,response_id,url,payload) VALUES($1,$2,$3,$4)',
          [event.id, input.submissionId, record.rows[0].webhook_url, JSON.stringify(event)],
        )
      }
      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
    return Response.json({ id: input.submissionId }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof SyntaxError)
      return Response.json({ error: 'Invalid submission.' }, { status: 400 })
    return Response.json(
      { error: 'Unable to accept submission. Please retry later.' },
      { status: 503 },
    )
  }
}
