import { z } from 'zod'
import { currentStaff, rateLimit } from '@/server/auth'
import { getQuestionnaire } from '@/server/questionnaires'
import { definitionSchema } from '@/core/questionnaire'
import { aiContextSchema } from '@/core/ai-proposal'
import { authorQuestionnaire } from '@/server/ai-author'
import { applicationOrigin } from '@/server/respondent-access'

export const maxDuration = 900

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
        webSearch: z.boolean().default(false),
        model: z.string().trim().min(1).max(200).optional(),
        thinking: z.enum(['low', 'medium', 'high']).optional(),
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
        // Keep proxies from treating a slow provider response as an idle connection.
        const heartbeat = setInterval(() => send({ heartbeat: true }), 10000)
        try {
          const proposal = await authorQuestionnaire(
            input.definition,
            input.instruction,
            input.context,
            (stage) => send({ stage }),
            input.webSearch,
            { model: input.model, thinking: input.thinking },
          )
          send({ proposal })
        } catch (error) {
          const timedOut =
            error instanceof Error && ['TimeoutError', 'AbortError'].includes(error.name)
          send({
            error: timedOut
              ? 'The AI provider did not finish within the allowed time. Your draft and instructions are unchanged. Try a faster model or a smaller request.'
              : error instanceof Error
                ? error.message
                : 'Unable to generate proposal.',
          })
        } finally {
          clearInterval(heartbeat)
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
