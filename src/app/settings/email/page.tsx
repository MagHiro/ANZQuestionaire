import Link from 'next/link'
import { requireStaff } from '@/server/auth'
import { db } from '@/server/db'
import { emailBlocksSchema } from '@/core/email-template'
import { EmailBuilder } from '@/components/EmailBuilder'

export default async function EmailSettings() {
  await requireStaff(true)
  const result = await db().query<{ kind: string; subject: string; blocks: unknown }>(
    'SELECT * FROM email_templates',
  )
  return (
    <main className="email-page">
      <Link href="/" className="text-button">
        ← Workspace
      </Link>
      <h1>Email builder</h1>
      <EmailBuilder
        initial={result.rows.map((row) => ({
          ...row,
          blocks: emailBlocksSchema.parse(row.blocks),
        }))}
      />
    </main>
  )
}
