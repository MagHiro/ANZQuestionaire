import Link from 'next/link'
import {
  ArrowUpRight,
  Plus,
  Layers,
  CircleCheck,
  MessageSquare,
  ArrowRight,
} from '@/components/Icons'
import { WorkspaceSidebar } from '@/components/WorkspaceSidebar'
import { SubmitButton } from '@/components/SubmitButton'
import { requireStaff } from '@/server/auth'
import { db } from '@/server/db'
import { createQuestionnaire } from './actions'

export const dynamic = 'force-dynamic'
type Summary = {
  id: string
  slug: string
  title: string
  question_count: number
  published_release: string | null
  response_count: string
  updated_at: Date
}
export default async function Dashboard() {
  const staff = await requireStaff()
  const result = await db().query<Summary>(
    `SELECT q.id,q.slug,q.draft->>'title' AS title,jsonb_array_length(q.draft->'questions') AS question_count,q.published_release,q.updated_at,(SELECT count(*) FROM responses r JOIN releases v ON v.id=r.release_id WHERE v.questionnaire_id=q.id) AS response_count FROM questionnaires q WHERE NOT archived ORDER BY q.updated_at DESC LIMIT 100`,
  )
  const forms = result.rows
  return (
    <div className="workspace">
      <WorkspaceSidebar staff={staff} active="questionnaires" />
      <main className="dashboard">
        <header className="workspace-top">
          <span>
            Workspace <span className="muted">/ Questionnaires</span>
          </span>
          {staff.role === 'admin' ? (
            <Link href="/settings/ai" className="workspace-badge">
              AI settings
            </Link>
          ) : (
            <span className="workspace-badge">ANZ workspace</span>
          )}
        </header>
        <section className="dashboard-heading">
          <div>
            <h1>Questionnaires</h1>
          </div>
          <a href="#new-questionnaire" className="button primary">
            <Plus size={18} />
            New questionnaire
          </a>
        </section>
        <section className="stats">
          <div>
            <Layers size={19} />
            <strong>{forms.length}</strong>
            <span>Questionnaires</span>
          </div>
          <div>
            <CircleCheck size={19} />
            <strong>{forms.filter((f) => f.published_release).length}</strong>
            <span>Published</span>
          </div>
          <div>
            <MessageSquare size={19} />
            <strong>{forms.reduce((sum, f) => sum + Number(f.response_count), 0)}</strong>
            <span>Responses</span>
          </div>
        </section>
        <section className="forms-section">
          <div className="section-heading">
            <h2>
              All questionnaires <span className="count">{forms.length}</span>
            </h2>
            <span className="small muted">Recently updated</span>
          </div>
          <div className="form-grid">
            {forms.map((form, index) => (
              <article className="form-card" key={form.id}>
                <Link
                  href={`/builder/${form.id}`}
                  className="form-art"
                  style={{
                    background: ['#eef4ff', '#e4ecfc', '#f1f5fc'][index % 3],
                  }}
                >
                  <span className="art-lines">
                    <i />
                    <i />
                    <i />
                  </span>
                  <span className="art-number">{String(index + 1).padStart(2, '0')}</span>
                  <ArrowUpRight size={20} />
                </Link>
                <div className="form-card-body">
                  <span className={`status ${form.published_release ? 'live' : ''}`}>
                    <i />
                    {form.published_release ? 'Published' : 'Draft'}
                  </span>
                  <h3>
                    <Link href={`/builder/${form.id}`}>{form.title}</Link>
                  </h3>
                  <p className="small muted">
                    {form.question_count} questions <span>·</span> {form.response_count} responses
                  </p>
                  <div className="card-footer">
                    <span className="small muted">
                      {new Intl.DateTimeFormat('en', {
                        day: 'numeric',
                        month: 'short',
                      }).format(form.updated_at)}
                    </span>
                    <Link href={`/builder/${form.id}`}>
                      Open builder <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              </article>
            ))}
            <form id="new-questionnaire" action={createQuestionnaire} className="create-card">
              <span className="create-icon">
                <Plus size={25} />
              </span>
              <h3>New questionnaire</h3>
              <label className="sr-only" htmlFor="new-title">
                Questionnaire title
              </label>
              <input
                id="new-title"
                name="title"
                placeholder="Give your questionnaire a name"
                required
                maxLength={160}
              />
              <SubmitButton className="button secondary">
                Create questionnaire
                <ArrowRight size={16} />
              </SubmitButton>
            </form>
          </div>
          {forms.length === 100 && (
            <p className="small muted">Showing the 100 most recently updated questionnaires.</p>
          )}
        </section>
      </main>
    </div>
  )
}
