import { createHmac, randomUUID } from 'node:crypto'
import { afterEach, expect, it, vi } from 'vitest'
const fixture = vi.hoisted(() => ({ query: vi.fn() }))
vi.mock('../src/server/db', () => ({ db: () => fixture }))
import { GET } from '../src/app/api/integration/responses/[id]/route'
afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetAllMocks()
})
it('does not reveal responses without signed authorization', async () => {
  const id = randomUUID()
  const response = await GET(new Request(`https://forms.test/api/integration/responses/${id}`), {
    params: Promise.resolve({ id }),
  })
  expect(response.status).toBe(401)
  expect(fixture.query).not.toHaveBeenCalled()
})
it('rejects expired signatures', async () => {
  vi.stubEnv('WEBHOOK_SECRET', 'a'.repeat(64))
  const id = randomUUID()
  const response = await GET(
    new Request(`https://forms.test/api/integration/responses/${id}`, {
      headers: {
        'X-Questionnaire-Timestamp': '1000000000',
        'X-Questionnaire-Signature': 'a'.repeat(64),
      },
    }),
    { params: Promise.resolve({ id }) },
  )
  expect(response.status).toBe(401)
})
it('returns a response only for a valid request-path-bound signature', async () => {
  const secret = 'b'.repeat(64)
  vi.stubEnv('WEBHOOK_SECRET', secret)
  const id = randomUUID()
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const signature = createHmac('sha256', secret)
    .update(`${timestamp}.GET./api/integration/responses/${id}`)
    .digest('hex')
  fixture.query.mockResolvedValue({ rows: [{ id }] })
  const response = await GET(
    new Request(`https://forms.test/api/integration/responses/${id}`, {
      headers: { 'X-Questionnaire-Timestamp': timestamp, 'X-Questionnaire-Signature': signature },
    }),
    { params: Promise.resolve({ id }) },
  )
  expect(response.status).toBe(200)
  expect(response.headers.get('Cache-Control')).toBe('no-store')
})
