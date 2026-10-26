import Link from 'next/link'
import { ArrowLeft, Download } from 'lucide-react'
import { requireStaff } from '@/server/auth'
import { getQuestionnaire } from '@/server/questionnaires'
import { db } from '@/server/db'
import { answersSchema, definitionSchema } from '@/core/questionnaire'
export default async function ResponsesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ page?: string }>
}) {
  await requireStaff()
  const { id } = await params
  const record = await getQuestionnaire(id)
  const page = Math.max(1, Math.min(100000, Number((await searchParams).page) || 1))
  const result = await db().query<{
    id: string
    answers: unknown
    created_at: Date
    version: number
    definition: unknown
  }>(
    'SELECT r.id,r.answers,r.created_at,v.version,v.definition FROM responses r JOIN releases v ON v.id=r.release_id WHERE v.questionnaire_id=$1 ORDER BY r.created_at DESC,r.id DESC LIMIT 26 OFFSET $2',
    [id, (Math.floor(page) - 1) * 25],
  )
  return (
    <main className="results-main">
      <Link href={`/builder/${id}`} className="text-button">
        <ArrowLeft size={15} />
        Back to builder
      </Link>
      <div className="results-top">
        <div>
          <span className="eyebrow">THE OTHER SIDE OF CURIOSITY</span>
          <h1>{record.draft.title}</h1>
          <p className="muted">Responses stay linked to the version each person completed.</p>
        </div>
        <a href={`/api/export/${id}`} className="button secondary">
          <Download size={16} />
          Export responses (JSON)
        </a>
      </div>
      {result.rows.slice(0, 25).map((row) => {
        const answers = answersSchema.parse(row.answers)
        const definition = definitionSchema.parse(row.definition)
        return (
          <details className="response-detail" key={row.id}>
            <summary>
              <span>
                {row.created_at.toLocaleString('en-AU')} · Version {row.version}
              </span>
              <span className="small muted">{row.id}</span>
            </summary>
            <dl className="review-list">
              {Object.entries(answers).map(([key, value]) => {
                const q = definition.questions.find((q) => q.id === key)
                return (
                  <div key={key}>
                    <dt>{q?.title || key}</dt>
                    <dd>
                      {q?.options.find((o) => o.value === value)?.label || value || 'Not answered'}
                    </dd>
                  </div>
                )
              })}
            </dl>
          </details>
        )
      })}
      {!result.rows.length && (
        <div className="empty-state">
          No responses yet. Publish and share your questionnaire to start listening.
        </div>
      )}
      <div className="button-row" style={{ marginTop: 25 }}>
        {page > 1 && (
          <Link className="button secondary" href={`?page=${page - 1}`}>
            Previous
          </Link>
        )}
        {result.rows.length > 25 && (
          <Link className="button secondary" href={`?page=${page + 1}`}>
            Next page
          </Link>
        )}
      </div>
    </main>
  )
}
