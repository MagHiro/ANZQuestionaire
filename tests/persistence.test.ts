import { PGlite } from '@electric-sql/pglite'
import { readFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { beforeAll, afterAll, describe, expect, it, vi } from 'vitest'
import { blankDefinition } from '../src/core/questionnaire'

const fixture = vi.hoisted(() => ({ query: vi.fn() }))
vi.mock('../src/server/db', () => ({
  db: () => ({
    query: fixture.query,
    connect: async () => ({ query: fixture.query, release() {} }),
  }),
}))
import { getQuestionnaire, publishQuestionnaire, saveDraft } from '../src/server/questionnaires'

const database = new PGlite()
const actor = {
  id: randomUUID(),
  name: 'Reviewer',
  email: 'reviewer@example.com',
  role: 'admin' as const,
}
const id = randomUUID()
beforeAll(async () => {
  await database.exec(await readFile('migrations/001_initial.sql', 'utf8'))
  fixture.query.mockImplementation((sql: string, values?: unknown[]) => database.query(sql, values))
  await database.query(
    'INSERT INTO staff(id,email,name,password_hash,role) VALUES($1,$2,$3,$4,$5)',
    [actor.id, actor.email, actor.name, 'not-a-login-hash', actor.role],
  )
  await database.query('INSERT INTO questionnaires(id,slug,draft,created_by) VALUES($1,$2,$3,$4)', [
    id,
    'test-form',
    JSON.stringify(blankDefinition()),
    actor.id,
  ])
})
afterAll(() => database.close())
describe('PostgreSQL persistence and release contracts', () => {
  it('loads a typed questionnaire', async () => {
    expect((await getQuestionnaire(id)).revision).toBe(1)
  })
  it('saves a draft with history and rejects stale editor revisions', async () => {
    expect(await saveDraft(id, 1, blankDefinition('Updated'), actor)).toBe(2)
    await expect(saveDraft(id, 1, blankDefinition('Stale'), actor)).rejects.toThrow(
      'Another editor',
    )
    const history = await database.query('SELECT * FROM draft_history WHERE questionnaire_id=$1', [
      id,
    ])
    expect(history.rows).toHaveLength(1)
  })
  it('prevents editors from publishing', async () => {
    await expect(publishQuestionnaire(id, 2, { ...actor, role: 'editor' })).rejects.toThrow(
      'administrators',
    )
  })
  it('publishes immutable snapshots and preserves previous releases', async () => {
    expect(await publishQuestionnaire(id, 2, actor)).toBe(1)
    await saveDraft(id, 2, blankDefinition('Next draft'), actor)
    const old = await database.query<{ definition: { title: string } }>(
      'SELECT definition FROM releases WHERE questionnaire_id=$1',
      [id],
    )
    expect(old.rows[0].definition.title).toBe('Updated')
    expect(await publishQuestionnaire(id, 3, actor)).toBe(2)
    expect(
      (await database.query('SELECT id FROM releases WHERE questionnaire_id=$1', [id])).rows,
    ).toHaveLength(2)
  })
  it('prevents publishing stale revisions', async () => {
    await expect(publishQuestionnaire(id, 1, actor)).rejects.toThrow('Save your latest')
  })
})
