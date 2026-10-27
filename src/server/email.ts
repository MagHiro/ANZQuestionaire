import nodemailer from 'nodemailer'
import { randomUUID } from 'node:crypto'
import type { PoolClient } from 'pg'
import { db } from './db'
import { renderReactEmail } from './react-email'
import { defaultEmailBlocks, emailBlocksSchema, templateText } from '@/core/email-template'
import { migrateEmailBlocks } from '@/core/email-migration'

export async function queueEmail(
  client: PoolClient,
  id: string,
  kind: 'submission' | 'payment' | 'report',
  recipient: string,
  variables: Record<string, string>,
) {
  await client.query(
    'INSERT INTO email_jobs(id,response_id,kind,recipient,variables) VALUES($1,$2,$3,$4,$5) ON CONFLICT(response_id,kind) DO NOTHING',
    [randomUUID(), id, kind, recipient, JSON.stringify(variables)],
  )
}
export function emailTransport() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_FROM)
    throw new Error('SMTP_HOST and SMTP_FROM must be configured.')
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
    connectionTimeout: 15000,
    socketTimeout: 30000,
  })
}
export async function processEmailJobs() {
  // One transaction-scoped worker lock prevents concurrent delivery of the same jobs.
  const client = await db().connect()
  try {
    await client.query('BEGIN')
    const lock = await client.query<{ locked: boolean }>(
      'SELECT pg_try_advisory_xact_lock(903721) AS locked',
    )
    if (!lock.rows[0].locked) {
      await client.query('ROLLBACK')
      return 0
    }
    const jobs = await client.query<{
      id: string
      recipient: string
      kind: string
      variables: Record<string, string>
      attempts: number
    }>(
      "SELECT * FROM email_jobs WHERE state='pending' AND next_attempt_at<=now() ORDER BY created_at LIMIT 10 FOR UPDATE SKIP LOCKED",
    )
    for (const job of jobs.rows) {
      try {
        const template = await client.query<{
          subject: string
          blocks: unknown
          document: unknown
        }>('SELECT subject,blocks,document FROM email_templates WHERE kind=$1', [job.kind])
        const row = template.rows[0]
        const body = await renderReactEmail(
          row?.document ||
            migrateEmailBlocks(
              row ? emailBlocksSchema.parse(row.blocks) : defaultEmailBlocks(job.kind),
            ),
          job.variables,
        )
        await emailTransport().sendMail({
          from: process.env.SMTP_FROM,
          to: job.recipient,
          subject: templateText(
            row?.subject || 'Questionnaire: {{questionnaire_title}}',
            job.variables,
          ).replace(/[\r\n]/g, ''),
          ...body,
          messageId: `<${job.id}@questionnaire.anzmigrate.com>`,
        })
        await client.query(
          "UPDATE email_jobs SET state='sent',attempts=attempts+1,last_error=NULL WHERE id=$1",
          [job.id],
        )
      } catch {
        await client.query(
          "UPDATE email_jobs SET attempts=attempts+1,state=CASE WHEN attempts>=7 THEN 'failed' ELSE 'pending' END,next_attempt_at=now()+interval '15 minutes',last_error='Delivery failed. Check SMTP configuration and recipient.' WHERE id=$1",
          [job.id],
        )
      }
    }
    await client.query('COMMIT')
    return jobs.rows.length
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
