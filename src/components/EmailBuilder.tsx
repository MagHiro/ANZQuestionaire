'use client'
import { useState } from 'react'
import { Spinner } from './Spinner'
import { ArrowUp, ArrowDown, Trash2, Plus } from 'lucide-react'
import { defaultEmailBlocks, renderEmail, type EmailBlock } from '@/core/email-template'
import { saveEmailTemplate, testEmailTemplate } from '@/app/settings/email/actions'
import { EmailRichTextEditor } from './EmailRichTextEditor'
import { EmailBlockSettings } from './EmailBlockSettings'
import { richEmailPlainText } from '@/core/email-rich-text'
import { SortableList, SortableItem, arrayMove } from './SortableList'

export function EmailBuilder({
  initial,
}: {
  initial: { kind: string; subject: string; blocks: EmailBlock[] }[]
}) {
  const [kind, setKind] = useState('submission')
  const [templates, setTemplates] = useState(initial)
  const [selected, setSelected] = useState(0)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [operation, setOperation] = useState<'save' | 'test' | null>(null)
  const [failed, setFailed] = useState(false)
  const current = templates.find((t) => t.kind === kind) || {
    kind,
    subject: '{{questionnaire_title}}',
    blocks: defaultEmailBlocks(kind),
  }
  const update = (patch: Partial<typeof current>) =>
    setTemplates((old) => [...old.filter((t) => t.kind !== kind), { ...current, ...patch }])
  const block = current.blocks[selected]
  const patchBlock = (patch: Partial<EmailBlock>) =>
    update({ blocks: current.blocks.map((b, i) => (i === selected ? { ...b, ...patch } : b)) })
  function reorder(from: number, to: number) {
    update({ blocks: arrayMove(current.blocks, from, to) })
    setSelected(
      arrayMove(
        current.blocks.map((_, i) => i),
        from,
        to,
      ).indexOf(selected),
    )
  }
  const preview = renderEmail(current.blocks, {
    questionnaire_title: 'Migration plans',
    message: 'Your answers have been received.',
    status_url: 'https://tf.anzmigrate.com',
  })
  return (
    <div className="email-workspace">
      <header className="email-toolbar">
        <label>
          Event template
          <select
            value={kind}
            onChange={(e) => {
              setKind(e.target.value)
              setSelected(0)
              setMessage('')
            }}
          >
            <option value="submission">Submission confirmation</option>
            <option value="payment">Payment verified</option>
            <option value="report">Report ready</option>
          </select>
        </label>
        <label className="email-subject">
          Subject
          <input value={current.subject} onChange={(e) => update({ subject: e.target.value })} />
        </label>
        <div className="button-row">
          <button
            className="button secondary"
            disabled={busy}
            onClick={async () => {
              setBusy(true)
              setOperation('test')
              setMessage('')
              setFailed(false)
              try {
                setMessage(await testEmailTemplate(current.subject, current.blocks))
              } catch {
                setFailed(true)
                setMessage('Test failed. Check server SMTP configuration.')
              } finally {
                setBusy(false)
              }
            }}
          >
            {busy && operation === 'test' && <Spinner />}Send test to me
          </button>
          <button
            className="button primary"
            disabled={busy}
            onClick={async () => {
              setBusy(true)
              setOperation('save')
              setMessage('')
              setFailed(false)
              try {
                setMessage(await saveEmailTemplate(kind, current.subject, current.blocks))
              } catch {
                setFailed(true)
                setMessage('Unable to save. Check fields and administrator access.')
              } finally {
                setBusy(false)
              }
            }}
          >
            {busy && operation === 'save' && <Spinner />}Save template
          </button>
        </div>
      </header>
      {message && (
        <p className={`notice ${failed ? 'error' : 'success'}`} role={failed ? 'alert' : 'status'}>
          {message}
        </p>
      )}
      <div className="email-panels">
        <aside className="email-blocks stack" aria-label="Email blocks">
          <h2>In this email</h2>
          <SortableList ids={current.blocks.map((_, i) => `block-${i}`)} onMove={reorder}>
            {current.blocks.map((b, i) => (
              <SortableItem key={`${kind}-${i}`} id={`block-${i}`} label={`block ${i + 1}`}>
                <button
                  className={`email-block-item ${selected === i ? 'selected' : ''}`}
                  aria-pressed={selected === i}
                  onClick={() => setSelected(i)}
                >
                  <span>
                    {i + 1}. {b.type}
                  </span>
                  <small>{b.text || 'Empty block'}</small>
                </button>
              </SortableItem>
            ))}
          </SortableList>
          {!current.blocks.length && (
            <p className="small muted">Add a block to start your email.</p>
          )}
          <h2>Add a block</h2>
          <div className="email-block-palette">
            {(['header', 'text', 'button', 'footer'] as const).map((type) => (
              <button
                className="button secondary"
                key={type}
                onClick={() => {
                  update({
                    blocks: [
                      ...current.blocks,
                      {
                        type,
                        text: type === 'button' ? 'View confirmation' : 'Your text',
                        url: type === 'button' ? '{{status_url}}' : '',
                      },
                    ],
                  })
                  setSelected(current.blocks.length)
                }}
              >
                <Plus size={15} />
                Add {type}
              </button>
            ))}
          </div>
        </aside>
        <main className="email-canvas">
          <h2>Email preview</h2>
          <iframe
            title="Email preview"
            sandbox=""
            srcDoc={preview.html}
            className="email-preview"
          />
        </main>
        <aside className="email-customize stack" aria-label="Block customization">
          {block ? (
            <>
              <div className="panel-heading">
                <h2>{block.type} block</h2>
                <div className="button-row">
                  <button
                    className="icon-button"
                    aria-label="Move block up"
                    disabled={selected === 0}
                    onClick={() => reorder(selected, selected - 1)}
                  >
                    <ArrowUp size={16} />
                  </button>
                  <button
                    className="icon-button"
                    aria-label="Move block down"
                    disabled={selected === current.blocks.length - 1}
                    onClick={() => reorder(selected, selected + 1)}
                  >
                    <ArrowDown size={16} />
                  </button>
                  <button
                    className="icon-button danger"
                    aria-label="Remove block"
                    onClick={() => {
                      update({ blocks: current.blocks.filter((_, i) => i !== selected) })
                      setSelected(Math.max(0, selected - 1))
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              {block.type === 'text' ? (
                <EmailRichTextEditor
                  key={`${kind}-${selected}`}
                  text={block.text}
                  document={block.richText}
                  onChange={(doc) => patchBlock({ richText: doc, text: richEmailPlainText(doc) })}
                />
              ) : (
                <label>
                  Content
                  <textarea
                    value={block.text}
                    onChange={(e) => patchBlock({ text: e.target.value })}
                  />
                </label>
              )}
              {block.type === 'button' && (
                <label>
                  Button URL
                  <input value={block.url} onChange={(e) => patchBlock({ url: e.target.value })} />
                </label>
              )}
              <EmailBlockSettings block={block} onChange={patchBlock} />
              <details className="email-variables">
                <summary>Personalization variables</summary>
                <p className="small">
                  {'{{questionnaire_title}}'} — questionnaire name
                  <br />
                  {'{{message}}'} — event message
                  <br />
                  {'{{status_url}}'} — private confirmation link
                </p>
              </details>
            </>
          ) : (
            <p className="muted">Select or add a block to customize it.</p>
          )}
        </aside>
      </div>
    </div>
  )
}
