import 'dotenv/config'
import { readdir, readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { db } from '../src/server/db'

async function migrate() {
  const client = await db().connect()
  try {
    await client.query('SELECT pg_advisory_lock(847201)')
    await client.query(
      'CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())',
    )
    for (const name of (await readdir('migrations')).filter((n) => n.endsWith('.sql')).sort()) {
      const sql = await readFile(`migrations/${name}`, 'utf8')
      const checksum = createHash('sha256').update(sql).digest('hex')
      const prior = await client.query<{ checksum: string }>(
        'SELECT checksum FROM schema_migrations WHERE name=$1',
        [name],
      )
      if (prior.rows.length) {
        if (prior.rows[0].checksum !== checksum)
          throw new Error(`Applied migration modified: ${name}`)
        continue
      }
      await client.query('BEGIN')
      try {
        await client.query(sql)
        await client.query('INSERT INTO schema_migrations(name, checksum) VALUES($1,$2)', [
          name,
          checksum,
        ])
        await client.query('COMMIT')
        console.log(`Applied ${name}`)
      } catch (error) {
        await client.query('ROLLBACK')
        throw error
      }
    }
  } finally {
    await client.query('SELECT pg_advisory_unlock(847201)')
    client.release()
    await db().end()
  }
}
migrate().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
