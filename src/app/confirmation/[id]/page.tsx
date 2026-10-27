import { notFound } from 'next/navigation'
import { z } from 'zod'
import { db } from '@/server/db'
import { validResponseToken } from '@/server/respondent-access'
import { validateDefinition } from '@/core/questionnaire'
import { ConfirmationContent } from '@/components/ConfirmationContent'

export const dynamic = 'force-dynamic'
export const metadata = {
  title: 'Questionnaire confirmation',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
}

export default async function Confirmation({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ token?: string }>
}) {
  const { id } = await params
  const { token = '' } = await searchParams
  if (!z.uuid().safeParse(id).success || !validResponseToken(id, token)) notFound()
  const result = await db().query<{
    definition: unknown
    payment_status: string
    amount_minor: number
    currency: string
    result: { title: string; message: string } | null
    published_at: Date | null
  }>(
    'SELECT r.*,l.definition,p.published_at FROM responses r JOIN releases l ON l.id=r.release_id LEFT JOIN response_reports p ON p.response_id=r.id WHERE r.id=$1',
    [id],
  )
  const row = result.rows[0]
  if (!row) notFound()
  const definition = validateDefinition(row.definition)
  return (
    <main className="confirmation-screen">
      <ConfirmationContent
        title={definition.completionTitle}
        message={definition.completionMessage}
        result={definition.payment?.enabled ? null : row.result}
      >
        {row.payment_status === 'unpaid' && (
          <section className="stack">
            <h2>Complete your payment</h2>
            <p>
              {new Intl.NumberFormat('en', { style: 'currency', currency: row.currency }).format(
                row.amount_minor / 100,
              )}{' '}
              · Payment is processed securely by Stripe.
            </p>
            <form action="/api/checkout" method="post">
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="token" value={token} />
              <button className="button primary">Pay securely with Stripe</button>
            </form>
          </section>
        )}
        {row.payment_status === 'paid' && (
          <p className="notice">
            Payment verified.{' '}
            {row.published_at
              ? 'Your report is ready.'
              : 'Your report is awaiting preparation. Refresh this page to check for updates.'}
          </p>
        )}
        {row.published_at &&
          (row.payment_status === 'paid' || row.payment_status === 'not_required') && (
            <a
              className="button primary"
              href={`/api/reports/${id}?token=${encodeURIComponent(token)}`}
            >
              Download your report
            </a>
          )}
        <p className="small muted">
          Keep this private confirmation link secure. It provides access to your payment and report
          status.
        </p>
      </ConfirmationContent>
    </main>
  )
}
