'use client'
import { useState } from 'react'
import { defaultEmailBlocks, renderEmail, type EmailBlock } from '@/core/email-template'
import { saveEmailTemplate, testEmailTemplate } from '@/app/settings/email/actions'

export function EmailBuilder({
  initial,
}: {
  initial: { kind: string; subject: string; blocks: EmailBlock[] }[]
}) {
  const [kind, setKind] = useState('submission')
  const [templates, setTemplates] = useState(initial)
  const current = templates.find((t) => t.kind === kind) || {
    kind,
    subject: '{{questionnaire_title}}',
    blocks: defaultEmailBlocks(kind),
  }
  const update = (patch: Partial<typeof current>) =>
    setTemplates((old) => [...old.filter((t) => t.kind !== kind), { ...current, ...patch }])
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const preview = renderEmail(current.blocks, {
    questionnaire_title: 'Migration plans',
    message: 'Your answers have been received.',
    status_url: 'https://tf.anzmigrate.com',
  })
  return (
    <div className="email-builder">
      <section className="stack">
        <label>
          Event template
          <select value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="submission">Submission confirmation</option>
            <option value="payment">Payment verified</option>
            <option value="report">Report ready</option>
          </select>
        </label>
        <label>
          Subject
          <input value={current.subject} onChange={(e) => update({ subject: e.target.value })} />
        </label>
        <p className="small">Variables: {'{{questionnaire_title}}, {{message}}, {{status_url}}'}</p>
        {current.blocks.map((block, index) => (
          <section className="result-card stack" key={index}>
            <h3>
              {index + 1}. {block.type}
            </h3>
            <label>
              Content
              <textarea
                value={block.text}
                onChange={(e) =>
                  update({
                    blocks: current.blocks.map((b, i) =>
                      i === index ? { ...b, text: e.target.value } : b,
                    ),
                  })
                }
              />
            </label>
            {block.type === 'button' && (
              <label>
                Button URL
                <input
                  value={block.url}
                  onChange={(e) =>
                    update({
                      blocks: current.blocks.map((b, i) =>
                        i === index ? { ...b, url: e.target.value } : b,
                      ),
                    })
                  }
                />
              </label>
            )}
            <div className="button-row">
              <button
                className="button secondary"
                disabled={!index}
                onClick={() => {
                  const blocks = [...current.blocks]
                  ;[blocks[index - 1], blocks[index]] = [blocks[index], blocks[index - 1]]
                  update({ blocks })
                }}
              >
                Move up
              </button>
              <button
                className="text-button danger"
                onClick={() => update({ blocks: current.blocks.filter((_, i) => i !== index) })}
              >
                Remove
              </button>
            </div>
          </section>
        ))}
        <div className="button-row">
          {(['header', 'text', 'button', 'footer'] as const).map((type) => (
            <button
              className="button secondary"
              key={type}
              onClick={() =>
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
              }
            >
              Add {type}
            </button>
          ))}
        </div>
        <div className="button-row">
          <button
            className="button primary"
            disabled={busy}
            onClick={async () => {
              setBusy(true)
              try {
                setMessage(await saveEmailTemplate(kind, current.subject, current.blocks))
              } catch {
                setMessage('Unable to save. Check fields and administrator access.')
              } finally {
                setBusy(false)
              }
            }}
          >
            Save template
          </button>
          <button
            className="button secondary"
            disabled={busy}
            onClick={async () => {
              setBusy(true)
              try {
                setMessage(await testEmailTemplate(current.subject, current.blocks))
              } catch {
                setMessage('Test failed. Check server SMTP configuration.')
              } finally {
                setBusy(false)
              }
            }}
          >
            Send test to me
          </button>
        </div>
        <p role="status">{message}</p>
      </section>
      <section>
        <h2>Email preview</h2>
        <iframe title="Email preview" sandbox="" srcDoc={preview.html} className="email-preview" />
      </section>
    </div>
  )
}
