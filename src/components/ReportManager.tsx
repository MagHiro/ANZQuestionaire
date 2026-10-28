'use client'
import { useId, useState } from 'react'
import { Spinner } from './Spinner'
import { Download, Upload } from './Icons'
import { publishResponseReport } from '@/app/report-actions'

export function ReportManager({ id, paymentStatus }: { id: string; paymentStatus: string }) {
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const [fileName, setFileName] = useState('')
  const inputId = useId()
  return (
    <section className="report-manager" aria-labelledby={`${inputId}-heading`} aria-busy={busy}>
      <h2 id={`${inputId}-heading`}>Payment & report</h2>
      <div className="report-payment-status">
        <span>Payment status</span>
        <span className="response-state">{paymentStatus.replaceAll('_', ' ')}</span>
      </div>
      {busy && (
        <p role="status" className="loading-feedback">
          <Spinner />
          Processing report…
        </p>
      )}
      <div className="report-upload">
        <label htmlFor={inputId} className="report-upload-label">
          Private PDF report
        </label>
        <p id={`${inputId}-help`} className="small muted">
          PDF only, up to 10 MB. Review before publishing.
        </p>
        <div className="report-file-picker">
          <input
            id={inputId}
            className="report-file-input"
            type="file"
            accept="application/pdf,.pdf"
            aria-describedby={`${inputId}-help ${inputId}-file`}
            disabled={busy}
            onChange={async (e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (!file) return
              if (!file.name.toLowerCase().endsWith('.pdf') || file.size > 10 * 1024 * 1024) {
                setFailed(true)
                setMessage('Choose a PDF file no larger than 10 MB.')
                return
              }
              setBusy(true)
              setMessage('')
              setFailed(false)
              try {
                const data = new FormData()
                data.set('report', file)
                const response = await fetch(`/api/reports/${id}`, { method: 'POST', body: data })
                setFailed(!response.ok)
                if (response.ok) setFileName(file.name)
                setMessage(
                  response.ok
                    ? 'Report uploaded. Publish separately after checking the PDF.'
                    : await response.text(),
                )
              } catch {
                setFailed(true)
                setMessage('Unable to upload report.')
              } finally {
                setBusy(false)
              }
            }}
          />
          <span className="button secondary report-file-button" aria-hidden="true">
            <Upload size={18} />
            {fileName ? 'Replace PDF' : 'Choose PDF'}
          </span>
        </div>
        <p id={`${inputId}-file`} className="report-file-name small">
          {fileName || 'No new file selected'}
        </p>
      </div>
      <div className="report-actions">
        <a className="button secondary" href={`/api/reports/${id}`}>
          <Download size={16} />
          Download uploaded report
        </a>
        <button
          className="button primary"
          disabled={busy || !['paid', 'not_required'].includes(paymentStatus)}
          onClick={async () => {
            setBusy(true)
            setMessage('')
            setFailed(false)
            try {
              setMessage(await publishResponseReport(id))
            } catch {
              setFailed(true)
              setMessage('Unable to publish report.')
            } finally {
              setBusy(false)
            }
          }}
        >
          {busy ? 'Processing…' : 'Publish report & queue email'}
        </button>
      </div>
      {message && (
        <p
          className={`report-feedback ${failed ? 'error' : ''}`}
          role={failed ? 'alert' : 'status'}
        >
          {message}
        </p>
      )}
    </section>
  )
}
