import { currentStaff } from '@/server/auth'
import { db } from '@/server/db'
import { z } from 'zod'
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await currentStaff())) return Response.json({ error: 'Unauthorized.' }, { status: 401 })
  const { id } = await params
  if (!z.uuid().safeParse(id).success)
    return Response.json({ error: 'Invalid ID.' }, { status: 400 })
  const after = new URL(request.url).searchParams.get('after')
  if (after && !z.uuid().safeParse(after).success)
    return Response.json({ error: 'Invalid cursor.' }, { status: 400 })
  const result = await db().query(
    'SELECT r.id,r.release_id,r.answers,r.path,r.created_at,v.version FROM responses r JOIN releases v ON v.id=r.release_id WHERE v.questionnaire_id=$1 AND ($2::uuid IS NULL OR r.id>$2::uuid) ORDER BY r.id LIMIT 1001',
    [id, after],
  )
  const rows = result.rows.slice(0, 1000)
  return Response.json(
    {
      responses: rows,
      nextCursor: result.rows.length > 1000 ? rows[rows.length - 1].id : null,
    },
    {
      headers: {
        'Content-Disposition': `attachment; filename="responses-${id}.json"`,
        'Cache-Control': 'no-store',
      },
    },
  )
}
