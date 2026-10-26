'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  Play,
  Upload,
  Download,
  Undo2,
  Sparkles,
  Trash2,
  GripVertical,
  Check,
  X,
} from 'lucide-react'
import {
  definitionSchema,
  validateDefinition,
  type Definition,
  type Question,
} from '@/core/questionnaire'
import {
  generateProposal,
  loadHistory,
  publishAction,
  saveQuestionnaire,
  updateIntegration,
} from '@/app/actions'
import { Runner } from '@/components/Runner'
import { QuestionEditor } from './QuestionEditor'
import { describeChanges } from '@/core/changes'

type Props = {
  id: string
  initial: Definition
  initialRevision: number
  slug: string
  canPublish: boolean
  published: boolean
  initialOrigins: string[]
  initialWebhook: string
}
type Tab = 'create' | 'logic' | 'share' | 'settings'
export function Builder({
  id,
  initial,
  initialRevision,
  slug,
  canPublish,
  published,
  initialOrigins,
  initialWebhook,
}: Props) {
  const [definition, setDefinition] = useState(initial)
  const [revision, setRevision] = useState(initialRevision)
  const [selected, setSelected] = useState(initial.questions[0].id)
  const [tab, setTab] = useState<Tab>('create')
  const [preview, setPreview] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [instruction, setInstruction] = useState('')
  const [proposal, setProposal] = useState<{
    summary: string
    definition: Definition
  } | null>(null)
  const [undo, setUndo] = useState<Definition[]>([])
  const [saved, setSaved] = useState(JSON.stringify(initial))
  const [origins, setOrigins] = useState(initialOrigins.join('\n'))
  const [webhook, setWebhook] = useState(initialWebhook)
  const [history, setHistory] = useState<Awaited<ReturnType<typeof loadHistory>>>([])
  const current = definition.questions.find((q) => q.id === selected) || definition.questions[0]
  const dirty = saved !== JSON.stringify(definition)
  const previewRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault()
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])
  useEffect(() => {
    if (!preview) return
    const previous = document.activeElement
    previewRef.current?.querySelector<HTMLButtonElement>('button')?.focus()
    return () => {
      if (previous instanceof HTMLElement) previous.focus()
    }
  }, [preview])
  let issue = ''
  try {
    validateDefinition(definition)
  } catch (error) {
    issue = error instanceof Error ? error.message : 'Check your questions.'
  }
  function edit(next: Definition) {
    setUndo((prior) => [...prior.slice(-29), definition])
    setDefinition(next)
    setMessage('')
  }
  function changeQuestion(q: Question) {
    edit({
      ...definition,
      questions: definition.questions.map((item) => (item.id === q.id ? q : item)),
    })
  }
  async function save() {
    setBusy(true)
    try {
      const result = await saveQuestionnaire(id, revision, definition)
      if (result.error) setMessage(result.error)
      else if (result.revision) {
        setRevision(result.revision)
        setSaved(JSON.stringify(definition))
        setMessage('Draft saved. Your published questionnaire is unchanged.')
      }
    } catch {
      setMessage('Unable to save. Please try again.')
    } finally {
      setBusy(false)
    }
  }
  async function publish() {
    if (dirty) {
      setMessage('Save the draft before publishing.')
      return
    }
    if (
      !window.confirm(
        'Publish this version? New visitors will see it; existing submissions keep their original version.',
      )
    )
      return
    setBusy(true)
    try {
      const result = await publishAction(id, revision)
      setMessage(result.error || `Version ${result.version} published. Your embed is ready.`)
    } catch {
      setMessage('Unable to publish. Check your permissions and try again.')
    } finally {
      setBusy(false)
    }
  }
  function addQuestion() {
    const q: Question = {
      id: `q_${crypto.randomUUID().slice(0, 8)}`,
      title: 'Your next question',
      description: '',
      page: current.page,
      type: 'radio',
      required: true,
      options: [
        { value: 'yes', label: 'Yes' },
        { value: 'no', label: 'No' },
      ],
      branches: [],
      next: '',
    }
    edit({ ...definition, questions: [...definition.questions, q] })
    setSelected(q.id)
  }
  function removeQuestion() {
    if (definition.questions.length === 1) return
    if (
      definition.questions.some(
        (q) => q.next === current.id || q.branches.some((b) => b.target === current.id),
      )
    ) {
      setMessage('Remove rules pointing to this question before deleting it.')
      return
    }
    edit({
      ...definition,
      questions: definition.questions.filter((q) => q.id !== current.id),
    })
    setSelected(definition.questions.find((q) => q.id !== current.id)!.id)
  }
  function move(direction: number) {
    const questions = [...definition.questions]
    const index = questions.findIndex((q) => q.id === current.id)
    if (index + direction < 0 || index + direction >= questions.length) return
    ;[questions[index], questions[index + direction]] = [
      questions[index + direction],
      questions[index],
    ]
    edit({ ...definition, questions })
  }
  async function askAI() {
    setBusy(true)
    setMessage('')
    try {
      const result = await generateProposal(id, definition, instruction)
      if (result.proposal) setProposal(result.proposal)
      else setMessage(result.error || 'No proposal returned.')
    } catch {
      setMessage('Unable to contact the AI. Your draft has not changed.')
    } finally {
      setBusy(false)
    }
  }
  function exportDefinition() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(definition, null, 2)], {
        type: 'application/json',
      }),
    )
    const a = document.createElement('a')
    a.href = url
    a.download = `${slug}.json`
    a.click()
    URL.revokeObjectURL(url)
  }
  const embed = `<iframe src="${typeof window === 'undefined' ? '' : window.location.origin}/embed/${slug}" title="Questionnaire" style="width:100%;height:760px;border:0" loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe>\n<script src="${typeof window === 'undefined' ? '' : window.location.origin}/embed.js" defer></script>`
  return (
    <div className="builder">
      <header className="builder-header" inert={preview}>
        <div className="builder-breadcrumb">
          <Link href="/" aria-label="Back to workspace">
            <ArrowLeft size={18} />
          </Link>
          <span className="muted">Workspace /</span>
          <span>{definition.title}</span>
          <span className="status">
            <i />
            {dirty ? 'Unsaved' : 'Draft saved'}
          </span>
        </div>
        <nav aria-label="Builder views">
          {(['create', 'logic', 'share', 'settings'] as Tab[]).map((t) => (
            <button key={t} className={tab === t ? 'selected-tab' : ''} onClick={() => setTab(t)}>
              {t === 'settings' ? 'Settings' : t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
          <Link href={`/responses/${id}`}>Results</Link>
        </nav>
        <div className="header-actions">
          <button className="button secondary compact" disabled={busy || !dirty} onClick={save}>
            Save draft
          </button>
          {canPublish && (
            <button
              className="button primary compact"
              disabled={busy || !!issue || dirty}
              onClick={publish}
            >
              <Upload size={14} />
              Publish
            </button>
          )}
        </div>
      </header>
      {message && (
        <div className="notice" role="status">
          {message}
          <button
            className="icon-button"
            onClick={() => setMessage('')}
            aria-label="Dismiss message"
          >
            <X size={16} />
          </button>
        </div>
      )}
      <div className="builder-body" inert={preview}>
        <aside className="question-nav">
          <div className="panel-heading">
            <span className="eyebrow">YOUR QUESTIONS</span>
            <span className="count">{definition.questions.length}</span>
          </div>
          <div className="question-nav-list">
            {definition.questions.map((q, index) => (
              <button
                className={`question-nav-item ${q.id === current.id ? 'selected' : ''}`}
                key={q.id}
                onClick={() => {
                  setSelected(q.id)
                  setTab('create')
                }}
              >
                <span className={`type-chip type-${q.type}`}>
                  {q.type === 'radio' || q.type === 'dropdown' ? '☷' : 'T'}
                  <small>{index + 1}</small>
                </span>
                <span>{q.title || 'Untitled question'}</span>
              </button>
            ))}
          </div>
          <button
            className="button secondary add-question"
            disabled={definition.questions.length >= 200}
            onClick={addQuestion}
          >
            <Plus size={16} />
            Add question
          </button>
          <div className="nav-ending">
            <Check size={16} />
            <span>{definition.completionTitle}</span>
          </div>
          <div className="nav-bottom">
            <button
              className="text-button"
              disabled={!undo.length}
              onClick={() => {
                const prior = undo[undo.length - 1]
                if (prior) {
                  setDefinition(prior)
                  setUndo(undo.slice(0, -1))
                }
              }}
            >
              <Undo2 size={15} />
              Undo edit
            </button>
            <button
              className="text-button"
              onClick={async () => {
                try {
                  setHistory(await loadHistory(id))
                  setTab('settings')
                } catch {
                  setMessage('Unable to load history.')
                }
              }}
            >
              Version history
            </button>
          </div>
        </aside>
        <main className="builder-canvas">
          {tab === 'create' ? (
            <>
              <div className="canvas-toolbar">
                <span>
                  <span className="canvas-dot" />
                  Question {definition.questions.findIndex((q) => q.id === current.id) + 1}
                </span>
                <div>
                  <button
                    className="icon-button"
                    aria-label="Move question earlier"
                    onClick={() => move(-1)}
                  >
                    <ArrowLeft size={16} />
                  </button>
                  <button
                    className="icon-button"
                    aria-label="Move question later"
                    onClick={() => move(1)}
                  >
                    <ArrowRight size={16} />
                  </button>
                  <button
                    className="icon-button"
                    aria-label="Delete question"
                    onClick={removeQuestion}
                    disabled={definition.questions.length < 2}
                  >
                    <Trash2 size={16} />
                  </button>
                  <button
                    className="button secondary compact"
                    disabled={!!issue}
                    onClick={() => setPreview(true)}
                  >
                    <Play size={14} />
                    Try it out
                  </button>
                </div>
              </div>
              <div className="question-stage">
                <span className="eyebrow">{current.page}</span>
                <div className="stage-question">
                  <span className="stage-number">
                    {definition.questions.findIndex((q) => q.id === current.id) + 1}
                    <ArrowRight size={15} />
                  </span>
                  <div>
                    <h1>{current.title || 'Your question goes here'}</h1>
                    <p className="muted">
                      {current.description || 'A little context can make all the difference.'}
                    </p>
                    <div className="stage-options">
                      {current.type === 'radio' || current.type === 'dropdown' ? (
                        current.options.map((o, i) => (
                          <div className="stage-option" key={o.value}>
                            <span>{String.fromCharCode(65 + i)}</span>
                            {o.label}
                          </div>
                        ))
                      ) : (
                        <div className="stage-placeholder">
                          {current.type === 'email' ? 'you@example.com' : 'Type your answer here…'}
                        </div>
                      )}
                    </div>
                    <span className="stage-button">
                      Continue <ArrowRight size={15} />
                    </span>
                  </div>
                </div>
              </div>
              <div className="canvas-caption">
                <GripVertical size={14} />
                Edit on the right. Preview the full conversation above.
              </div>
              {issue && (
                <p className="validation-note" role="status">
                  Before publishing: {issue}
                </p>
              )}
              <section className="ai-composer">
                <div className="ai-title">
                  <Sparkles size={19} />
                  <div>
                    <h3>A second pair of hands.</h3>
                    <p>Describe a change. Review it before it touches your draft.</p>
                  </div>
                </div>
                <label className="sr-only" htmlFor="ai-instruction">
                  Instructions for AI
                </label>
                <textarea
                  id="ai-instruction"
                  value={instruction}
                  onChange={(e) => setInstruction(e.target.value)}
                  maxLength={12000}
                  placeholder="“Ask about qualifications only if they select Australia…”"
                  rows={3}
                />
                <div className="ai-bottom">
                  <span>AI suggests. You decide.</span>
                  <button
                    className="button primary compact"
                    disabled={busy || instruction.trim().length < 3}
                    onClick={askAI}
                  >
                    {busy ? 'Working…' : 'Suggest changes'}
                    <ArrowRight size={15} />
                  </button>
                </div>
                {proposal && (
                  <div className="proposal">
                    <h3>Proposed changes</h3>
                    <p>{proposal.summary}</p>
                    <ul className="small">
                      {describeChanges(definition, proposal.definition).map((change, index) => (
                        <li key={index}>{change}</li>
                      ))}
                    </ul>
                    <p className="small muted">
                      {proposal.definition.questions.length} questions · Applying replaces the local
                      draft. Undo is available.
                    </p>
                    <div className="button-row">
                      <button
                        className="button primary compact"
                        onClick={() => {
                          edit(proposal.definition)
                          setSelected(proposal.definition.questions[0].id)
                          setProposal(null)
                        }}
                      >
                        Apply to draft
                      </button>
                      <button
                        className="button secondary compact"
                        onClick={() => setProposal(null)}
                      >
                        Discard
                      </button>
                    </div>
                  </div>
                )}
              </section>
            </>
          ) : tab === 'logic' ? (
            <section className="content-panel">
              <span className="eyebrow">THE PATH THROUGH</span>
              <h1>A conversation, not a checklist.</h1>
              <p className="muted">
                Every answer has somewhere to go. Edit conditions in the question settings.
              </p>
              {issue ? (
                <p className="error">{issue}</p>
              ) : (
                <p className="success">
                  <Check size={16} />
                  Flow checks passed. No broken links or cycles.
                </p>
              )}
              <div className="flow-list">
                {definition.questions.map((q, i) => (
                  <button
                    key={q.id}
                    className="flow-node"
                    onClick={() => {
                      setSelected(q.id)
                      setTab('create')
                    }}
                  >
                    <span>{i + 1}</span>
                    <div>
                      <strong>{q.title}</strong>
                      {q.branches.map((b, n) => (
                        <p key={n}>
                          If “{q.options.find((o) => o.value === b.equals)?.label || b.equals}” →{' '}
                          {b.target === '$end'
                            ? 'Finish'
                            : definition.questions.find((item) => item.id === b.target)?.title ||
                              'Missing question'}
                        </p>
                      ))}
                      <p>
                        Otherwise →{' '}
                        {q.next === '$end'
                          ? 'Finish'
                          : definition.questions.find((item) => item.id === q.next)?.title ||
                            definition.questions[i + 1]?.title ||
                            'Finish'}
                      </p>
                    </div>
                    <ArrowRight size={17} />
                  </button>
                ))}
              </div>
            </section>
          ) : tab === 'share' ? (
            <section className="content-panel stack">
              <span className="eyebrow">A HOME FOR YOUR QUESTIONS</span>
              <h1>Build here. Share anywhere.</h1>
              <p className="muted">
                Publish a release, then add its embed to your website. Draft changes stay private.
              </p>
              <label>
                Public questionnaire link
                <input
                  readOnly
                  value={`${typeof window === 'undefined' ? '' : window.location.origin}/embed/${slug}`}
                />
              </label>
              <label>
                Embed code
                <textarea readOnly rows={6} value={embed} />
              </label>
              <p className="small muted">
                Configure allowed website origins below before embedding. The completion event is a
                UI notification, not proof of a trusted submission.
              </p>
              <h2>Integration settings</h2>
              <label>
                Allowed embedding origins — one per line
                <textarea
                  value={origins}
                  onChange={(e) => setOrigins(e.target.value)}
                  rows={4}
                  placeholder="https://www.anzmigrate.com"
                  disabled={!canPublish}
                />
              </label>
              <label>
                Signed webhook URL
                <input
                  type="url"
                  value={webhook}
                  onChange={(e) => setWebhook(e.target.value)}
                  placeholder="https://your-system.com/api/questionnaire"
                  disabled={!canPublish}
                />
              </label>
              <p className="small muted">
                Webhook destinations must also be allowlisted by the deployment operator. Responses
                are signed and delivery is retried by the worker.
              </p>
              {canPublish && (
                <button
                  className="button primary"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true)
                    try {
                      const result = await updateIntegration(
                        id,
                        origins
                          .split('\n')
                          .map((s) => s.trim())
                          .filter(Boolean),
                        webhook.trim(),
                      )
                      setMessage(result.error || 'Integration settings saved.')
                    } catch {
                      setMessage('Unable to save settings.')
                    } finally {
                      setBusy(false)
                    }
                  }}
                >
                  Save integration settings
                </button>
              )}
            </section>
          ) : (
            <section className="content-panel stack">
              <span className="eyebrow">MAKE IT YOURS</span>
              <h1>The details matter.</h1>
              <label>
                Questionnaire title
                <input
                  value={definition.title}
                  maxLength={160}
                  onChange={(e) => edit({ ...definition, title: e.target.value })}
                />
              </label>
              <label>
                Introduction
                <textarea
                  value={definition.description}
                  maxLength={2000}
                  onChange={(e) => edit({ ...definition, description: e.target.value })}
                  rows={3}
                />
              </label>
              <label>
                Completion heading
                <input
                  value={definition.completionTitle}
                  maxLength={300}
                  onChange={(e) => edit({ ...definition, completionTitle: e.target.value })}
                />
              </label>
              <label>
                Completion message
                <textarea
                  value={definition.completionMessage}
                  maxLength={2000}
                  onChange={(e) => edit({ ...definition, completionMessage: e.target.value })}
                  rows={3}
                />
              </label>
              <div className="button-row">
                <button className="button secondary" onClick={exportDefinition}>
                  <Download size={16} />
                  Export JSON
                </button>
                <label className="button secondary import-label">
                  <Upload size={16} />
                  Import JSON
                  <input
                    type="file"
                    accept="application/json,.json"
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      try {
                        if (file.size > 500000) throw new Error('File must be smaller than 500 KB.')
                        const imported = definitionSchema.parse(JSON.parse(await file.text()))
                        edit(imported)
                        setSelected(imported.questions[0].id)
                        setMessage('Imported to draft. Check the flow before publishing.')
                      } catch (error) {
                        setMessage(error instanceof Error ? error.message : 'Invalid file.')
                      }
                      e.target.value = ''
                    }}
                  />
                </label>
              </div>
              <h2>Saved history</h2>
              <p className="small muted">
                Restoring loads a previous draft locally. Save and publish separately.
              </p>
              {history.map((item) => (
                <div className="history-row" key={item.revision}>
                  <span>
                    Revision {item.revision}{' '}
                    <small>{new Date(item.createdAt).toLocaleString()}</small>
                  </span>
                  <button
                    className="button secondary compact"
                    onClick={() => {
                      edit(item.definition)
                      setSelected(item.definition.questions[0].id)
                    }}
                  >
                    Restore draft
                  </button>
                </div>
              ))}
              {!history.length && (
                <button
                  className="text-button"
                  onClick={async () => {
                    try {
                      setHistory(await loadHistory(id))
                    } catch {
                      setMessage('Unable to load history.')
                    }
                  }}
                >
                  Load saved history
                </button>
              )}
            </section>
          )}
        </main>
        {tab === 'create' && (
          <aside className="settings-panel">
            <QuestionEditor
              question={current}
              questions={definition.questions}
              onChange={changeQuestion}
            />
          </aside>
        )}
      </div>
      {preview && (
        <div
          className="preview-overlay"
          ref={previewRef}
          onKeyDown={(event) => {
            if (event.key === 'Escape') setPreview(false)
            if (event.key !== 'Tab') return
            const elements = Array.from(
              previewRef.current?.querySelectorAll<HTMLElement>(
                'button:not(:disabled),input:not(:disabled),textarea:not(:disabled),select:not(:disabled),a[href]',
              ) || [],
            )
            const first = elements[0]
            const last = elements[elements.length - 1]
            if (event.shiftKey && document.activeElement === first) {
              event.preventDefault()
              last?.focus()
            } else if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault()
              first?.focus()
            }
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Questionnaire preview"
        >
          <button
            className="preview-close button secondary"
            autoFocus
            onClick={() => setPreview(false)}
          >
            <X size={18} />
            Close preview
          </button>
          <Runner key={JSON.stringify(definition)} definition={definition} preview />
        </div>
      )}
    </div>
  )
}
