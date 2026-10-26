import { z } from 'zod'
import { currentStaff, rateLimit } from '@/server/auth'
import { getQuestionnaire } from '@/server/questionnaires'
import { definitionSchema } from '@/core/questionnaire'
import { aiContextSchema } from '@/core/ai-proposal'
import { authorQuestionnaire } from '@/server/ai-author'
import { applicationOrigin } from '@/server/respondent-access'

export async function POST(request: Request) {
  const staff = await currentStaff()
  if (!staff) return new Response('Unauthorized', { status: 401 })
  if (
    ![new URL(request.url).origin, applicationOrigin()].includes(
      request.headers.get('origin') || '',
    )
  )
    return new Response('Forbidden', { status: 403 })
  try {
    const text = await request.text()
    if (text.length > 600000) return new Response('Too large', { status: 413 })
    const input = z
      .object({
        id: z.uuid(),
        definition: definitionSchema,
        instruction: z.string().min(3).max(12000),
        context: aiContextSchema,
      })
      .parse(JSON.parse(text))
    await getQuestionnaire(input.id)
    await rateLimit(`ai:${staff.id}`, 20, 3600)
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        let connected = true
        const send = (data: unknown) => {
          if (connected) {
            try {
              controller.enqueue(encoder.encode(JSON.stringify(data) + '\n'))
            } catch {
              connected = false
            }
          }
        }
        try {
          const proposal = await authorQuestionnaire(
            input.definition,
            input.instruction,
            input.context,
            (stage) => send({ stage }),
          )
          send({ proposal })
        } catch (error) {
          send({ error: error instanceof Error ? error.message : 'Unable to generate proposal.' })
        } finally {
          if (connected) controller.close()
        }
      },
    })
    return new Response(stream, {
      headers: {
        'Content-Type': 'application/x-ndjson',
        'Cache-Control': 'no-store',
        'X-Accel-Buffering': 'no',
      },
    })
  } catch {
    return Response.json({ error: 'Invalid AI request or rate limit reached.' }, { status: 400 })
  }
}
