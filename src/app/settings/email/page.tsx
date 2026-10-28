import { requireStaff } from '@/server/auth'
import { db } from '@/server/db'
import { emailBlocksSchema } from '@/core/email-template'
import { migrateEmailBlocks } from '@/core/email-migration'
import { emailDocumentSchema } from '@/core/react-email-document'
import { EmailBuilder } from '@/components/EmailBuilder'
import { WorkspaceSidebar } from '@/components/WorkspaceSidebar'

export default async function EmailSettings() {
  const staff = await requireStaff(true)
  const result = await db().query<{
    kind: string
    subject: string
    blocks: unknown
    document: unknown
  }>('SELECT * FROM email_templates')
  return (
    <div className="workspace settings-workspace">
      <WorkspaceSidebar staff={staff} active="email" />
      <main className="email-page settings-page">
        <h1>Email builder</h1>
        <EmailBuilder
          initial={result.rows.map((row) => ({
            kind: row.kind,
            subject: row.subject,
            content: row.document
              ? emailDocumentSchema.parse(row.document)
              : migrateEmailBlocks(emailBlocksSchema.parse(row.blocks)),
          }))}
        />
      </main>
    </div>
  )
}
