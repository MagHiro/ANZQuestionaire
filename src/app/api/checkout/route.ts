import { z } from 'zod'
import { validResponseToken } from '@/server/respondent-access'
import { createCheckout } from '@/server/commerce'
import { rateLimit } from '@/server/auth'

export async function POST(request: Request) {
  try {
    const form = await request.formData()
    const id = z.uuid().parse(form.get('id'))
    const token = z.string().parse(form.get('token'))
    if (!validResponseToken(id, token)) return new Response('Unauthorized', { status: 403 })
    await rateLimit(`checkout:${id}`, 10, 300)
    return Response.redirect(await createCheckout(id), 303)
  } catch {
    return new Response(
      'Checkout is unavailable or payment is processing. Return to your confirmation and try again shortly.',
      { status: 503 },
    )
  }
}
