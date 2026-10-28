import { z } from 'zod'
import { receiptPdf } from '@/server/receipt-pdf'
import { db } from '@/server/db'
import { currentStaff } from '@/server/auth'
import { validResponseToken } from '@/server/respondent-access'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const token = new URL(request.url).searchParams.get('token') || ''
  if (!z.uuid().safeParse(id).success) return new Response('Not found', { status: 404 })
  if (!validResponseToken(id, token) && !(await currentStaff()))
    return new Response('Not found', { status: 404 })
  const result = await db().query<{
    amount_minor: number
    currency: string
    paid_at: Date | null
  }>('SELECT amount_minor,currency,paid_at FROM responses WHERE id=$1 AND payment_status=$2', [
    id,
    'paid',
  ])
  const row = result.rows[0]
  if (!row || !row.paid_at || !row.currency || !Number.isInteger(row.amount_minor))
    return new Response('Not found', { status: 404 })
  const content = await receiptPdf({
    id,
    amountMinor: row.amount_minor,
    currency: row.currency,
    paidAt: row.paid_at,
  })
  return new Response(content, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="receipt-${id}.pdf"`,
      'Cache-Control': 'no-store',
      'Referrer-Policy': 'no-referrer',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
