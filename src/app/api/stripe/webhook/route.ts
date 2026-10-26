import { stripeClient, applyStripeEvent } from '@/server/commerce'

export async function POST(request: Request) {
  if (!process.env.STRIPE_WEBHOOK_SECRET) return new Response('Not configured', { status: 503 })
  const signature = request.headers.get('stripe-signature')
  if (!signature) return new Response('Missing signature', { status: 400 })
  let event
  try {
    event = stripeClient().webhooks.constructEvent(
      await request.text(),
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    )
  } catch {
    return new Response('Invalid signature', { status: 400 })
  }
  try {
    await applyStripeEvent(event)
    return Response.json({ received: true })
  } catch {
    return Response.json({ error: 'Payment could not be processed.' }, { status: 503 })
  }
}
