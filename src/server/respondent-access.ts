import { createHmac, timingSafeEqual } from 'node:crypto'

export function responseToken(id: string) {
  const secret = process.env.RESPONSE_ACCESS_SECRET || process.env.SETTINGS_ENCRYPTION_KEY
  if (!secret) throw new Error('Response access signing is not configured.')
  return createHmac('sha256', secret).update(`respondent:${id}`).digest('hex')
}
export function validResponseToken(id: string, token: string) {
  if (!/^[a-f0-9]{64}$/.test(token)) return false
  return timingSafeEqual(Buffer.from(responseToken(id)), Buffer.from(token))
}
export function applicationOrigin() {
  const url = new URL(process.env.APP_URL || 'http://localhost:3000')
  if (process.env.NODE_ENV === 'production' && url.protocol !== 'https:')
    throw new Error('APP_URL must be HTTPS in production.')
  return url.origin
}
export function confirmationUrl(id: string) {
  return `${applicationOrigin()}/confirmation/${id}?token=${responseToken(id)}`
}
