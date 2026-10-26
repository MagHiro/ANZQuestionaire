import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { z } from 'zod'
import { db } from './db'

function encryptionKey(): Buffer {
  const key = process.env.SETTINGS_ENCRYPTION_KEY || ''
  if (!/^[a-f0-9]{64}$/i.test(key))
    throw new Error('The server settings encryption key is not configured. Contact your operator.')
  return Buffer.from(key, 'hex')
}
export function encryptApiKey(value: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv)
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString('base64')).join('.')
}
export function decryptApiKey(value: string): string {
  const parts = value.split('.').map((part) => Buffer.from(part, 'base64'))
  if (parts.length !== 3) throw new Error('Invalid encrypted settings.')
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), parts[0])
  decipher.setAuthTag(parts[1])
  return Buffer.concat([decipher.update(parts[2]), decipher.final()]).toString('utf8')
}
export function validateBaseUrl(value: string): string {
  const url = new URL(value)
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash)
    throw new Error(
      'Use an HTTPS API base URL without credentials, query parameters, or fragments.',
    )
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '')
  if (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host.includes(':') ||
    /^\d+\.\d+\.\d+\.\d+$/.test(host) ||
    !host.includes('.')
  )
    throw new Error('Use a public provider hostname, not a local address or IP.')
  return url.href.replace(/\/$/, '')
}
type SettingsRow = { base_url: string; model: string; encrypted_key: string | null }
export async function getAiConfiguration() {
  const result = await db().query<SettingsRow>(
    'SELECT base_url,model,encrypted_key FROM ai_settings WHERE id=1',
  )
  const row = result.rows[0]
  return {
    baseUrl: row?.base_url || process.env.AI_BASE_URL || 'https://api.openai.com/v1',
    model: row?.model || process.env.AI_MODEL || '',
    apiKey: row?.encrypted_key ? decryptApiKey(row.encrypted_key) : process.env.AI_API_KEY || '',
    source: row ? ('admin' as const) : ('environment' as const),
  }
}
export const aiSettingsInput = z
  .object({
    baseUrl: z.string().max(1000),
    model: z.string().trim().min(1).max(200),
    apiKey: z.string().trim().max(8000),
  })
  .strict()
