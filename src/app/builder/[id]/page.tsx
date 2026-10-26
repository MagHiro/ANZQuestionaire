import { notFound } from 'next/navigation'
import { z } from 'zod'
import { requireStaff } from '@/server/auth'
import { getQuestionnaire } from '@/server/questionnaires'
import { Builder } from '@/components/builder/Builder'
export default async function BuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaff()
  const { id } = await params
  if (!z.uuid().safeParse(id).success) notFound()
  const record = await getQuestionnaire(id)
  return (
    <Builder
      id={id}
      initial={record.draft}
      initialRevision={record.revision}
      slug={record.slug}
      canPublish={staff.role === 'admin'}
      published={Boolean(record.published_release)}
      initialOrigins={record.allowed_origins}
      initialWebhook={record.webhook_url || ''}
    />
  )
}
