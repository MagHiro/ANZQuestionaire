'use client'
import { useState } from 'react'
import { publishResponseReport } from '@/app/report-actions'

export function ReportManager({ id, paymentStatus }: { id: string; paymentStatus: string }) {
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  return (
    <section className="stack">
      <h3>Payment & report</h3>
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
            try {
              const data = new FormData()
              data.set('report', file)
              const response = await fetch(`/api/reports/${id}`, { method: 'POST', body: data })
              setMessage(
                response.ok
                  ? 'Report uploaded. Publish separately after checking the PDF.'
                  : await response.text(),
              )
            } catch {
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
            try {
              setMessage(await publishResponseReport(id))
            } catch {
              setMessage('Unable to publish report.')
            } finally {
              setBusy(false)
            }
          }}
        >
          Publish report & queue email
        </button>
      </div>
      <p role="status">{message}</p>
    </section>
  )
}
