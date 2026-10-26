import Stripe from 'stripe'
import { db } from './db'
import { applicationOrigin, confirmationUrl } from './respondent-access'
import { queueEmail } from './email'

export function stripeClient() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('Stripe is not configured.')
  return new Stripe(process.env.STRIPE_SECRET_KEY, { timeout: 20000, maxNetworkRetries: 2 })
}

export async function createCheckout(id: string) {
  const client = await db().connect()
  try {
    await client.query('BEGIN')
    const result = await client.query<{
      payment_status: string
      amount_minor: number
      currency: string
      respondent_email: string
      checkout_id: string | null
    }>('SELECT * FROM responses WHERE id=$1 FOR UPDATE', [id])
    const row = result.rows[0]
    if (!row || row.payment_status !== 'unpaid')
      throw new Error('Payment is not required or is already complete.')
    const stripe = stripeClient()
    if (row.checkout_id) {
      const previous = await stripe.checkout.sessions.retrieve(row.checkout_id)
      if (previous.status === 'open' && previous.url) {
        await client.query('COMMIT')
        return previous.url
      }
      if (previous.payment_status === 'paid' || previous.status === 'complete')
        throw new Error('Payment is processing. Refresh your confirmation shortly.')
    }
    const session = await stripe.checkout.sessions.create(
      {
        mode: 'payment',
        customer_email: row.respondent_email,
        client_reference_id: id,
        metadata: { response_id: id, integration_type: 'questionnaire_report' },
        line_items: [
          {
            price_data: {
              currency: row.currency,
              unit_amount: row.amount_minor,
              product_data: { name: 'Questionnaire report service' },
            },
            quantity: 1,
          },
        ],
        success_url: confirmationUrl(id),
        cancel_url: confirmationUrl(id),
      },
      { idempotencyKey: `questionnaire:${id}:${row.checkout_id || 'initial'}` },
    )
    await client.query('UPDATE responses SET checkout_id=$1 WHERE id=$2', [session.id, id])
    await client.query('COMMIT')
    if (!session.url || new URL(session.url).origin !== 'https://checkout.stripe.com')
      throw new Error('Invalid checkout destination.')
    return session.url
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function applyStripeEvent(event: Stripe.Event) {
  if (
    !['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(event.type)
  )
    return
  const session = event.data.object as Stripe.Checkout.Session
  if (
    session.metadata?.integration_type !== 'questionnaire_report' ||
    session.payment_status !== 'paid'
  )
    return
  const client = await db().connect()
  try {
    await client.query('BEGIN')
    const seen = await client.query(
      'INSERT INTO stripe_events(id) VALUES($1) ON CONFLICT DO NOTHING RETURNING id',
      [event.id],
    )
    if (!seen.rows.length) {
      await client.query('COMMIT')
      return
    }
    const result = await client.query<{
      id: string
      amount_minor: number
      currency: string
      respondent_email: string
      payment_status: string
      checkout_id: string
    }>('SELECT * FROM responses WHERE id=$1 FOR UPDATE', [session.metadata.response_id])
    const row = result.rows[0]
    if (
      !row ||
      row.checkout_id !== session.id ||
      row.amount_minor !== session.amount_total ||
      row.currency !== session.currency ||
      session.client_reference_id !== row.id
    )
      throw new Error('Payment does not match stored order.')
    if (row.payment_status !== 'paid') {
      await client.query("UPDATE responses SET payment_status='paid',paid_at=now() WHERE id=$1", [
        row.id,
      ])
      await queueEmail(client, row.id, 'payment', row.respondent_email, {
        questionnaire_title: 'Your questionnaire',
        message: 'Payment has been verified. Your report is awaiting preparation.',
        status_url: confirmationUrl(row.id),
      })
    }
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
