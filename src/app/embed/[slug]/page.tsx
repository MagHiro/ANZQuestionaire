import { notFound } from 'next/navigation'
import { db } from '@/server/db'
import { validateDefinition } from '@/core/questionnaire'
import { Runner } from '@/components/Runner'
export const dynamic = 'force-dynamic'
export default async function EmbedPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) notFound()
  const result = await db().query<{
    id: string
    definition: unknown
    allowed_origins: string[]
  }>(
    'SELECT r.id,r.definition,q.allowed_origins FROM questionnaires q JOIN releases r ON r.id=q.published_release WHERE q.slug=$1 AND NOT q.archived',
    [slug],
  )
  const record = result.rows[0]
  if (!record) notFound()
  return (
    <Runner
      definition={validateDefinition(record.definition)}
      releaseId={record.id}
      parentOrigins={record.allowed_origins}
    />
  )
}
