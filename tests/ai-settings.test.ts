import { afterEach, expect, it, vi } from 'vitest'
import { encryptApiKey, decryptApiKey, validateBaseUrl } from '../src/server/ai-settings'
afterEach(() => vi.unstubAllEnvs())
it('encrypts API keys with authenticated randomized encryption', () => {
  vi.stubEnv('SETTINGS_ENCRYPTION_KEY', 'a'.repeat(64))
  const first = encryptApiKey('secret-provider-key')
  expect(first).not.toContain('secret-provider-key')
  expect(first).not.toBe(encryptApiKey('secret-provider-key'))
  expect(decryptApiKey(first)).toBe('secret-provider-key')
  vi.stubEnv('SETTINGS_ENCRYPTION_KEY', 'b'.repeat(64))
  expect(() => decryptApiKey(first)).toThrow()
})
it('requires a deployment encryption key', () => {
  vi.stubEnv('SETTINGS_ENCRYPTION_KEY', '')
  expect(() => encryptApiKey('secret')).toThrow('not configured')
})
it('validates public HTTPS provider endpoints', () => {
  expect(validateBaseUrl('https://api.openai.com/v1/')).toBe('https://api.openai.com/v1')
  for (const url of [
    'http://api.example.com',
    'https://localhost/v1',
    'https://127.0.0.1/v1',
    'https://[::1]/v1',
    'https://user:pass@api.example.com/v1',
    'https://api.example.com/v1?key=secret',
  ])
    expect(() => validateBaseUrl(url)).toThrow()
})
