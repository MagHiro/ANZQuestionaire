import { z } from 'zod'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
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
  const pdf = await PDFDocument.create()
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const page = pdf.addPage([595, 842])
  const navy = rgb(0.024, 0.137, 0.31)
  const line = (text: string, y: number, size = 12) =>
    page.drawText(text, { x: 48, y, size, font, color: navy })
  line('ANZ Questionnaire', 780, 16)
  line('Payment receipt', 730, 22)
  line('Payment status: Paid', 685)
  line(`Receipt reference: ${id}`, 650)
  line(`Payment date: ${row.paid_at.toISOString().slice(0, 10)} (UTC)`, 620)
  line('Service: Questionnaire assessment and report', 580)
  line(`Amount paid: ${row.currency.toUpperCase()} ${(row.amount_minor / 100).toFixed(2)}`, 540, 16)
  line('This receipt confirms payment. It is not a tax invoice.', 480, 10)
  return new Response(new Uint8Array(await pdf.save()), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="receipt-${id}.pdf"`,
      'Cache-Control': 'no-store',
      'Referrer-Policy': 'no-referrer',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
