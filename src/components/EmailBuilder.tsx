'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import type { EmailEditorRef } from '@react-email/editor'
import type { JSONContent } from '@tiptap/core'
import { anzEmailTheme } from '@/core/email-theme'
import '@react-email/editor/themes/default.css'
import { Spinner } from './Spinner'
import {
  previewEmailTemplate,
  saveEmailTemplate,
  testEmailTemplate,
} from '@/app/settings/email/actions'

const EmailEditor = dynamic(() => import('@react-email/editor').then((m) => m.EmailEditor), {
  ssr: false,
  loading: () => <p role="status">Loading email editor…</p>,
})

type Template = { kind: string; subject: string; content: JSONContent | string }
function defaultContent(kind: string): JSONContent {
  const paragraph = (text: string): JSONContent => ({
    type: 'paragraph',
    content: [{ type: 'text', text }],
  })
  return {
    type: 'doc',
    content: [
      {
        type: 'heading',
        attrs: { level: 1 },
        content: [
          {
            type: 'text',
            text:
              kind === 'report'
                ? 'Your report is ready'
                : kind === 'payment'
                  ? 'Payment received'
                  : 'Thank you for your answers',
          },
        ],
      },
      paragraph('{{questionnaire_title}}'),
      paragraph('{{message}}'),
      {
        type: 'button',
        attrs: { href: '{{status_url}}', alignment: 'left' },
        content: [
          {
            type: 'text',
            text: 'View confirmation and report',
          },
        ],
      },
      paragraph('ANZ Questionnaire · Keep this private link secure.'),
    ],
  }
}

export function EmailBuilder({ initial }: { initial: Template[] }) {
  const [kind, setKind] = useState('submission')
  const [templates, setTemplates] = useState(initial)
  const [message, setMessage] = useState('')
  const [failed, setFailed] = useState(false)
  const [operation, setOperation] = useState<'save' | 'test' | null>(null)
  const [ready, setReady] = useState(false)
  const [document, setDocument] = useState<JSONContent | null>(null)
  const [preview, setPreview] = useState('')
  const [previewError, setPreviewError] = useState('')
  const [previewBusy, setPreviewBusy] = useState(false)
  const [width, setWidth] = useState('desktop')
  const editor = useRef<EmailEditorRef | null>(null)
  const current = templates.find((t) => t.kind === kind) || {
    kind,
    subject: '{{questionnaire_title}}',
    content: defaultContent(kind),
  }
  const content = useRef(current.content)

  useEffect(() => {
    if (!document) return
    let active = true
    setPreviewBusy(true)
    const timer = setTimeout(() => {
      previewEmailTemplate(document)
        .then((result) => {
          if (active) {
            setPreview(result.html)
            setPreviewError('')
          }
        })
        .catch(() => {
          if (active)
            setPreviewError('Unable to render this email. Check its content and try again.')
        })
        .finally(() => {
          if (active) setPreviewBusy(false)
        })
    }, 600)
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [document])

  function updated(ref: EmailEditorRef) {
    const json = JSON.parse(JSON.stringify(ref.getJSON())) as JSONContent
    setDocument(json)
    setTemplates((old) => {
      const saved = old.find((t) => t.kind === kind)
      return [
        ...old.filter((t) => t.kind !== kind),
        { kind, subject: saved?.subject || '{{questionnaire_title}}', content: json },
      ]
    })
    setMessage('')
  }
  async function run(action: 'save' | 'test') {
    if (!editor.current || !ready) return
    setOperation(action)
    setMessage('')
    setFailed(false)
    try {
      const json = JSON.parse(JSON.stringify(editor.current.getJSON())) as JSONContent
      setMessage(
        action === 'save'
          ? await saveEmailTemplate(kind, current.subject, json)
          : await testEmailTemplate(current.subject, json),
      )
    } catch {
      setFailed(true)
      setMessage(
        action === 'save'
          ? 'Unable to save. Check the subject and email content.'
          : 'Test failed. Check server SMTP configuration.',
      )
    } finally {
      setOperation(null)
    }
  }
  return (
    <div className="email-workspace">
      <header className="email-toolbar">
        <label>
          Event template
          <select
            aria-label="Event template"
            value={kind}
            disabled={!!operation}
            onChange={(event) => {
              const next = event.target.value
              content.current =
                templates.find((t) => t.kind === next)?.content || defaultContent(next)
              setReady(false)
              setDocument(null)
              setPreview('')
              setPreviewError('')
              setMessage('')
              setKind(next)
            }}
          >
            <option value="submission">Submission confirmation</option>
            <option value="payment">Payment verified</option>
            <option value="report">Report ready</option>
          </select>
        </label>
        <label className="email-subject">
          Subject
          <input
            value={current.subject}
            maxLength={300}
            disabled={!!operation}
            onChange={(event) => {
              setTemplates((old) => [
                ...old.filter((t) => t.kind !== kind),
                { ...current, subject: event.target.value },
              ])
              setMessage('')
            }}
          />
        </label>
        <div className="button-row">
          <button
            className="button secondary"
            disabled={!ready || !!operation}
            onClick={() => run('test')}
          >
            {operation === 'test' && <Spinner />}Send test to me
          </button>
          <button
            className="button primary"
            disabled={!ready || !!operation || !current.subject.trim()}
            onClick={() => run('save')}
          >
            {operation === 'save' && <Spinner />}Save template
          </button>
        </div>
      </header>
      {message && (
        <p className={`notice ${failed ? 'error' : 'success'}`} role={failed ? 'alert' : 'status'}>
          {message}
        </p>
      )}
      <div className="react-email-workspace">
        <section className="react-email-compose" aria-label="Compose email">
          <h2>Compose</h2>
          <p className="small muted">Type / to insert content. Select text to format it.</p>
          <EmailEditor
            key={kind}
            ref={editor}
            content={content.current}
            theme={anzEmailTheme}
            editable={!operation}
            className="anz-email-editor"
            onReady={(ref) => {
              if (ref.editor) {
                ref.editor.view.dom.setAttribute('aria-label', 'Email content')
                ref.editor.view.dom.setAttribute('role', 'textbox')
              }
              ref.editor?.setOptions({
                editorProps: {
                  attributes: {
                    'aria-label': 'Email content',
                    role: 'textbox',
                    'aria-multiline': 'true',
                  },
                },
              })
              setReady(true)
              updated(ref)
            }}
            onUpdate={updated}
          />
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
        </section>
        <section className="react-email-preview" aria-label="Rendered email">
          <div className="panel-heading">
            <h2>Email preview</h2>
            <label>
              Preview size
              <select
                aria-label="Preview size"
                value={width}
                onChange={(event) => setWidth(event.target.value)}
              >
                <option value="desktop">Desktop</option>
                <option value="mobile">Mobile</option>
              </select>
            </label>
          </div>
          {previewBusy && (
            <p className="small muted" role="status">
              Updating preview…
            </p>
          )}
          {previewError && (
            <p className="error" role="alert">
              {previewError}
            </p>
          )}
          <iframe
            title="Email preview"
            sandbox=""
            srcDoc={preview}
            className={`email-preview ${width === 'mobile' ? 'email-preview-mobile' : ''}`}
          />
        </section>
      </div>
    </div>
  )
}
