'use client'
import { useState } from 'react'
import { Spinner } from './Spinner'
import { publishResponseReport } from '@/app/report-actions'

export function ReportManager({ id, paymentStatus }: { id: string; paymentStatus: string }) {
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  return (
    <section className="stack">
      <h3>Payment & report</h3>
      {busy && (
        <p role="status" className="loading-feedback">
          <Spinner />
          Processing report…
        </p>
      )}
      <p>Status: {paymentStatus.replaceAll('_', ' ')}</p>
      <label className="file-control">
        Upload private PDF (max 10 MB)
        <input
          type="file"
          accept="application/pdf"
          disabled={busy}
          onChange={async (e) => {
            const file = e.target.files?.[0]
            if (!file) return
            setBusy(true)
            setMessage('')
            setFailed(false)
            try {
              const data = new FormData()
              data.set('report', file)
              const response = await fetch(`/api/reports/${id}`, { method: 'POST', body: data })
              setFailed(!response.ok)
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
      </label>
      <div className="button-row">
        <a className="button secondary" href={`/api/reports/${id}`}>
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
          Publish report & queue email
        </button>
      </div>
      {message && (
        <p className={`notice ${failed ? 'error' : ''}`} role={failed ? 'alert' : 'status'}>
          {message}
        </p>
      )}
    </section>
  )
}
