import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import { definitionSchema, validateDefinition, type Definition } from '@/core/questionnaire'
import { db } from './db'
import type { Staff } from './auth'

export type QuestionnaireRecord = {
  id: string
  slug: string
  draft: Definition
  revision: number
  published_release: string | null
  allowed_origins: string[]
  webhook_url: string | null
  updated_at: Date
}
export async function getQuestionnaire(id: string): Promise<QuestionnaireRecord> {
  z.uuid().parse(id)
  const result = await db().query<QuestionnaireRecord>(
    'SELECT * FROM questionnaires WHERE id=$1 AND NOT archived',
    [id],
  )
  if (!result.rows[0]) throw new Error('Questionnaire not found.')
  return {
    ...result.rows[0],
    draft: definitionSchema.parse(result.rows[0].draft),
  }
}
export async function saveDraft(id: string, revision: number, input: unknown, actor: Staff) {
  const definition = definitionSchema.parse(input)
  const client = await db().connect()
  try {
    await client.query('BEGIN')
    const updated = await client.query<{ revision: number }>(
      'UPDATE questionnaires SET draft=$1,revision=revision+1,updated_at=now() WHERE id=$2 AND revision=$3 RETURNING revision',
      [JSON.stringify(definition), id, revision],
    )
    if (!updated.rows.length)
      throw new Error('Another editor has changed this draft. Reload before saving.')
    await client.query(
      'INSERT INTO draft_history(questionnaire_id,definition,revision,actor_id) VALUES($1,$2,$3,$4)',
      [id, JSON.stringify(definition), updated.rows[0].revision, actor.id],
    )
    await client.query('INSERT INTO audit_log(actor_id,action,questionnaire_id) VALUES($1,$2,$3)', [
      actor.id,
      'draft.saved',
      id,
    ])
    await client.query('COMMIT')
    return updated.rows[0].revision
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
export async function publishQuestionnaire(id: string, revision: number, actor: Staff) {
  if (actor.role !== 'admin') throw new Error('Only administrators can publish.')
  const client = await db().connect()
  try {
    await client.query('BEGIN')
    const result = await client.query<QuestionnaireRecord>(
      'SELECT * FROM questionnaires WHERE id=$1 AND NOT archived FOR UPDATE',
      [id],
    )
    const record = result.rows[0]
    if (!record || record.revision !== revision)
      throw new Error('Save your latest draft before publishing.')
    const definition = validateDefinition(record.draft)
    const version = await client.query<{ version: number }>(
      'SELECT COALESCE(MAX(version),0)+1 AS version FROM releases WHERE questionnaire_id=$1',
      [id],
    )
    const releaseId = randomUUID()
    await client.query(
      'INSERT INTO releases(id,questionnaire_id,version,definition,published_by) VALUES($1,$2,$3,$4,$5)',
      [releaseId, id, version.rows[0].version, JSON.stringify(definition), actor.id],
    )
    await client.query(
      'UPDATE questionnaires SET published_release=$1,updated_at=now() WHERE id=$2',
      [releaseId, id],
    )
    await client.query('INSERT INTO audit_log(actor_id,action,questionnaire_id) VALUES($1,$2,$3)', [
      actor.id,
      'release.published',
      id,
    ])
    await client.query('COMMIT')
    return version.rows[0].version
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
