import { createHmac, timingSafeEqual } from 'node:crypto'
import { z } from 'zod'
import { db } from '@/server/db'
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!z.uuid().safeParse(id).success)
    return Response.json({ error: 'Not found.' }, { status: 404 })
  const timestamp = request.headers.get('X-Questionnaire-Timestamp') || ''
  const signature = request.headers.get('X-Questionnaire-Signature') || ''
  const secret = process.env.WEBHOOK_SECRET
  if (
    !secret ||
    secret.length < 32 ||
    !/^\d{10}$/.test(timestamp) ||
    Math.abs(Date.now() / 1000 - Number(timestamp)) > 300 ||
    !/^[a-f0-9]{64}$/.test(signature)
  )
    return Response.json({ error: 'Unauthorized.' }, { status: 401 })
  const expected = createHmac('sha256', secret)
    .update(`${timestamp}.GET./api/integration/responses/${id}`)
    .digest()
  if (!timingSafeEqual(expected, Buffer.from(signature, 'hex')))
    return Response.json({ error: 'Unauthorized.' }, { status: 401 })
  const result = await db().query(
    'SELECT r.id,r.release_id,r.answers,r.path,r.created_at,v.version,q.slug FROM responses r JOIN releases v ON v.id=r.release_id JOIN questionnaires q ON q.id=v.questionnaire_id WHERE r.id=$1',
    [id],
  )
  if (!result.rows[0]) return Response.json({ error: 'Not found.' }, { status: 404 })
  return Response.json(result.rows[0], {
    headers: { 'Cache-Control': 'no-store' },
  })
}
