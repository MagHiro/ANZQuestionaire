'use server'

import { requireStaff, rateLimit } from '@/server/auth'
import { db } from '@/server/db'
import {
  aiSettingsInput,
  encryptApiKey,
  getAiConfiguration,
  validateBaseUrl,
  providerModels,
} from '@/server/ai-settings'

export async function saveAiSettings(input: unknown) {
  const actor = await requireStaff(true)
  try {
    const values = aiSettingsInput.parse(input)
    const baseUrl = validateBaseUrl(values.baseUrl)
    const existing = await getAiConfiguration()
    if (!values.apiKey && baseUrl !== validateBaseUrl(existing.baseUrl))
      throw new Error('Enter a new API key when changing providers.')
    const apiKey = values.apiKey || existing.apiKey
    if (!apiKey) throw new Error('Enter an API key to configure the provider.')
    await db().query(
      `INSERT INTO ai_settings(id,base_url,model,encrypted_key,updated_by) VALUES(1,$1,$2,$3,$4) ON CONFLICT(id) DO UPDATE SET base_url=$1,model=$2,encrypted_key=$3,updated_by=$4,updated_at=now()`,
      [baseUrl, values.model, encryptApiKey(apiKey), actor.id],
    )
    return { ok: true }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Unable to save AI settings.' }
  }
}
export async function loadAiModels(input?: { baseUrl: string; apiKey: string }) {
  const actor = await requireStaff(Boolean(input))
  try {
    await rateLimit(`ai-models:${actor.id}`, 60, 3600)
    const config = await getAiConfiguration()
    const baseUrl = validateBaseUrl(input?.baseUrl || config.baseUrl)
    if (input && !input.apiKey && baseUrl !== validateBaseUrl(config.baseUrl))
      throw new Error('Enter a key for the selected provider.')
    const models = await providerModels(baseUrl, input?.apiKey || config.apiKey)
    return { models, defaultModel: config.model }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Unable to load models.' }
  }
}
export async function testAiConnection() {
  const actor = await requireStaff(true)
  try {
    await rateLimit(`ai-test:${actor.id}`, 10, 3600)
    const config = await getAiConfiguration()
    if (!config.apiKey || !config.model)
      throw new Error('Save the endpoint, model, and API key first.')
    const response = await fetch(`${validateBaseUrl(config.baseUrl)}/chat/completions`, {
      method: 'POST',
      redirect: 'error',
      signal: AbortSignal.timeout(30000),
      headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: config.model,
        response_format: { type: 'json_object' },
        messages: [{ role: 'user', content: 'Return only this JSON object: {"ok":true}' }],
      }),
    })
    await response.body?.cancel()
    if (!response.ok)
      throw new Error(
        `Provider returned HTTP ${response.status}. Check the endpoint, credentials, model access, and JSON response support.`,
      )
    return { ok: true }
  } catch {
    return {
      error:
        'Connection test failed. Check the saved endpoint, API key, model access, and JSON response support. The request may have timed out.',
    }
  }
}
