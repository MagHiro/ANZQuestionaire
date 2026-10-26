import { z } from 'zod'
import { db } from '@/server/db'
import { validResponseToken, applicationOrigin } from '@/server/respondent-access'
import { currentStaff } from '@/server/auth'
import { PDFDocument } from 'pdf-lib'

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!z.uuid().safeParse(id).success) return new Response('Not found', { status: 404 })
  const staff = await currentStaff()
  const token = new URL(request.url).searchParams.get('token') || ''
  if (!staff && !validResponseToken(id, token)) return new Response('Not found', { status: 404 })
  const result = await db().query<{
    content: Buffer
    filename: string
    published_at: Date | null
    payment_status: string
  }>(
    'SELECT p.*,r.payment_status FROM response_reports p JOIN responses r ON r.id=p.response_id WHERE response_id=$1',
    [id],
  )
  const row = result.rows[0]
  if (
    !row ||
    (!staff && (!row.published_at || !['paid', 'not_required'].includes(row.payment_status)))
  )
    return new Response('Not found', { status: 404 })
  return new Response(new Uint8Array(row.content), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="report.pdf"`,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
    },
  })
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const staff = await currentStaff()
  if (!staff) return new Response('Unauthorized', { status: 401 })
  if (
    ![new URL(request.url).origin, applicationOrigin()].includes(
      request.headers.get('origin') || '',
    )
  )
    return new Response('Forbidden', { status: 403 })
  const { id } = await params
  if (!z.uuid().safeParse(id).success) return new Response('Invalid response', { status: 400 })
  const form = await request.formData()
  const file = form.get('report')
  if (
    !(file instanceof File) ||
    file.size > 10 * 1024 * 1024 ||
    file.size < 20 ||
    file.type !== 'application/pdf'
  )
    return new Response('Upload a PDF smaller than 10 MB.', { status: 400 })
  const data = Buffer.from(await file.arrayBuffer())
  if (
    !data.subarray(0, 8).toString().startsWith('%PDF-') ||
    !data.subarray(-2048).includes(Buffer.from('%%EOF'))
  )
    return new Response('Invalid PDF', { status: 400 })
  try {
    const pdf = await PDFDocument.load(data, {
      ignoreEncryption: false,
      throwOnInvalidObject: true,
    })
    if (pdf.getPageCount() < 1) throw new Error('No pages')
  } catch {
    return new Response('Upload a readable, unencrypted PDF.', { status: 400 })
  }
  const result = await db().query(
    'INSERT INTO response_reports(response_id,filename,content,uploaded_by) VALUES($1,$2,$3,$4) ON CONFLICT(response_id) DO UPDATE SET filename=$2,content=$3,uploaded_by=$4,updated_at=now() WHERE response_reports.published_at IS NULL RETURNING response_id',
    [id, file.name.slice(0, 200), data, staff.id],
  )
  if (!result.rows.length) return new Response('Published reports are immutable.', { status: 409 })
  return Response.json({ uploaded: true })
}
