'use server'
import { z } from 'zod'
import { requireStaff, rateLimit } from '@/server/auth'
import { db } from '@/server/db'
import { emailBlocksSchema, renderEmail } from '@/core/email-template'
import { emailTransport } from '@/server/email'

export async function saveEmailTemplate(kind: string, subject: string, blocks: unknown) {
  await requireStaff(true)
  z.enum(['submission', 'payment', 'report']).parse(kind)
  z.string()
    .min(1)
    .max(300)
    .regex(/^[^\r\n]+$/)
    .parse(subject)
  const parsed = emailBlocksSchema.parse(blocks)
  await db().query(
    'INSERT INTO email_templates(kind,subject,blocks) VALUES($1,$2,$3) ON CONFLICT(kind) DO UPDATE SET subject=$2,blocks=$3,updated_at=now()',
    [kind, subject, JSON.stringify(parsed)],
  )
  return 'Template saved.'
}
export async function testEmailTemplate(subject: string, blocks: unknown) {
  const staff = await requireStaff(true)
  await rateLimit(`email-test:${staff.id}`, 5, 300)
  const body = renderEmail(emailBlocksSchema.parse(blocks), {
    questionnaire_title: 'Preview questionnaire',
    message: 'This is a test message.',
    status_url: 'https://tf.anzmigrate.com',
  })
  await emailTransport().sendMail({
    from: process.env.SMTP_FROM,
    to: staff.email,
    subject: `[Test] ${z
      .string()
      .max(300)
      .regex(/^[^\r\n]+$/)
      .parse(subject)}`,
    ...body,
  })
  return `Test sent to your staff email (${staff.email}).`
}
