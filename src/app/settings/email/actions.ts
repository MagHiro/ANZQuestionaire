'use server'
import { z } from 'zod'
import { requireStaff, rateLimit } from '@/server/auth'
import { db } from '@/server/db'
import { emailDocumentSchema, emailPreviewVariables } from '@/core/react-email-document'
import { renderReactEmail } from '@/server/react-email'
import { emailTransport } from '@/server/email'

export async function saveEmailTemplate(kind: string, subject: string, document: unknown) {
  await requireStaff(true)
  z.enum(['submission', 'payment', 'report']).parse(kind)
  z.string()
    .min(1)
    .max(300)
    .regex(/^[^\r\n]+$/)
    .parse(subject)
  const parsed = emailDocumentSchema.parse(document)
  await renderReactEmail(parsed, emailPreviewVariables)
  await db().query(
    "INSERT INTO email_templates(kind,subject,blocks,document) VALUES($1,$2,'[]'::jsonb,$3) ON CONFLICT(kind) DO UPDATE SET subject=$2,document=$3,updated_at=now()",
    [kind, subject, JSON.stringify(parsed)],
  )
  return 'Template saved.'
}
export async function previewEmailTemplate(document: unknown) {
  const staff = await requireStaff(true)
  await rateLimit(`email-preview:${staff.id}`, 120, 300)
  return renderReactEmail(document, emailPreviewVariables)
}
export async function testEmailTemplate(subject: string, document: unknown) {
  const staff = await requireStaff(true)
  await rateLimit(`email-test:${staff.id}`, 5, 300)
  const body = await renderReactEmail(document, {
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
