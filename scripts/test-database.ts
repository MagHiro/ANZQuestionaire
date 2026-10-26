/** Isolated browser-test database. Never reads DATABASE_URL or production credentials. */
import EmbeddedPostgres from 'embedded-postgres'
import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { hash } from 'bcryptjs'

const database = new EmbeddedPostgres({
  databaseDir: await mkdtemp(join(tmpdir(), 'questionnaire-e2e-')),
  user: 'test',
  password: 'test-local-only',
  port: 55439,
  persistent: false,
  postgresFlags: ['-h', '127.0.0.1'],
  onLog: () => {},
  onError: console.error,
})
await database.initialise()
await database.start()
const client = database.getPgClient()
await client.connect()
await client.query(await readFile('migrations/001_initial.sql', 'utf8'))
await client.query(await readFile('migrations/002_ai_settings.sql', 'utf8'))
await client.query(await readFile('migrations/003_outcomes_commerce_email.sql', 'utf8'))
await client.query('INSERT INTO staff(id,email,name,password_hash,role) VALUES($1,$2,$3,$4,$5)', [
  randomUUID(),
  'admin@example.test',
  'Test Reviewer',
  await hash('Browser-test-password-2026', 12),
  'admin',
])
await client.end()
console.log('Isolated browser-test database ready.')
for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.on(signal, async () => {
    await database.stop()
    process.exit(0)
  })
setInterval(() => {}, 60000)
