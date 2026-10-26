import { beforeEach, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  release: vi.fn(),
  queue: vi.fn(),
  create: vi.fn(),
  retrieve: vi.fn(),
}))
vi.mock('../src/server/db', () => ({
  db: () => ({ connect: async () => ({ query: mocks.query, release: mocks.release }) }),
}))
vi.mock('../src/server/email', () => ({ queueEmail: mocks.queue }))
vi.mock('stripe', () => ({
  default: class {
    checkout = { sessions: { create: mocks.create, retrieve: mocks.retrieve } }
  },
}))
import { applyStripeEvent, createCheckout } from '../src/server/commerce'
import { publishReport } from '../src/server/reports'
import type Stripe from 'stripe'

beforeEach(() => {
  vi.clearAllMocks()
  process.env.STRIPE_SECRET_KEY = 'sk_test_mock'
  process.env.RESPONSE_ACCESS_SECRET = 'test-only-secret'
  process.env.APP_URL = 'https://questionnaire.example'
})
const event = (amount = 100) =>
  ({
    id: 'evt_1',
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_1',
        client_reference_id: 'response',
        payment_status: 'paid',
        amount_total: amount,
        currency: 'sgd',
        metadata: { integration_type: 'questionnaire_report', response_id: 'response' },
      },
    },
  }) as unknown as Stripe.Event
it('verifies stored session, price and currency before marking paid', async () => {
  mocks.query.mockImplementation(async (sql: string) => {
    if (sql.startsWith('INSERT INTO stripe_events')) return { rows: [{ id: 'evt_1' }] }
    if (sql.startsWith('SELECT *'))
      return {
        rows: [
          {
            id: 'response',
            checkout_id: 'cs_1',
            amount_minor: 100,
            currency: 'sgd',
            payment_status: 'unpaid',
            respondent_email: 'test@example.com',
          },
        ],
      }
    return { rows: [] }
  })
  await applyStripeEvent(event())
  expect(mocks.query.mock.calls.some(([sql]) => sql.includes("payment_status='paid'"))).toBe(true)
  expect(mocks.queue).toHaveBeenCalledTimes(1)
  vi.clearAllMocks()
  await expect(applyStripeEvent(event(999))).rejects.toThrow('does not match')
  expect(mocks.queue).not.toHaveBeenCalled()
  expect(mocks.query).toHaveBeenCalledWith('ROLLBACK')
})
it('deduplicates webhook events', async () => {
  mocks.query.mockResolvedValue({ rows: [] })
  await applyStripeEvent(event())
  expect(mocks.queue).not.toHaveBeenCalled()
  expect(mocks.query).toHaveBeenCalledWith('COMMIT')
})
it('blocks report publication until payment is verified', async () => {
  mocks.query.mockImplementation(async (sql: string) => ({
    rows: sql.startsWith('SELECT') ? [{ payment_status: 'unpaid' }] : [],
  }))
  await expect(publishReport('response')).rejects.toThrow('Verified payment')
  expect(mocks.queue).not.toHaveBeenCalled()
})
it('reuses an open checkout session instead of charging twice', async () => {
  mocks.query.mockImplementation(async (sql: string) => ({
    rows: sql.startsWith('SELECT') ? [{ payment_status: 'unpaid', checkout_id: 'cs_1' }] : [],
  }))
  mocks.retrieve.mockResolvedValue({ status: 'open', url: 'https://checkout.stripe.com/test' })
  expect(await createCheckout('response')).toBe('https://checkout.stripe.com/test')
  expect(mocks.create).not.toHaveBeenCalled()
})
