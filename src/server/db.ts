import { Pool } from 'pg'

const globalPool = globalThis as typeof globalThis & {
  questionnairePool?: Pool
}
export function db(): Pool {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not configured.')
  globalPool.questionnairePool ??= new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  })
  return globalPool.questionnairePool
}
