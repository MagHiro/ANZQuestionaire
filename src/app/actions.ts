'use server'

import { randomUUID } from 'node:crypto'
import { compare } from 'bcryptjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { blankDefinition, definitionSchema, validateDefinition } from '@/core/questionnaire'
import { db } from '@/server/db'
import { createSession, rateLimit, requireStaff, tokenHash } from '@/server/auth'
import { getQuestionnaire, publishQuestionnaire, saveDraft } from '@/server/questionnaires'
import { getAiConfiguration, validateBaseUrl } from '@/server/ai-settings'

export async function loginAction(_state: string, form: FormData): Promise<string> {
  const email = String(form.get('email') || '')
    .toLowerCase()
    .trim()
  const password = String(form.get('password') || '')
  try {
    await rateLimit('login:global', 120, 900)
    z.email().parse(email)
    if (!password || Buffer.byteLength(password) > 72) return 'Invalid email or password.'
    await rateLimit(`login:${email}`, 8, 900)
    const result = await db().query<{ id: string; password_hash: string }>(
      'SELECT id,password_hash FROM staff WHERE email=$1',
      [email],
    )
    // A real bcrypt hash ensures unknown accounts still incur verification work.
    const valid = await compare(
      password,
      result.rows[0]?.password_hash ||
        '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6Ttxj7m9uM5rWjZL2X2T/1M4wFv8a',
    )
    if (!valid || !result.rows[0]) return 'Invalid email or password.'
    await createSession(result.rows[0].id)
  } catch {
    return 'Unable to sign in. Check your details or try again later.'
  }
  redirect('/')
}
export async function logoutAction() {
  const jar = await cookies()
  const token = jar.get('qn_session')?.value
  if (token) await db().query('DELETE FROM sessions WHERE token_hash=$1', [tokenHash(token)])
  jar.delete('qn_session')
  redirect('/login')
}
export async function createQuestionnaire(form: FormData) {
  const actor = await requireStaff()
  const title = z.string().trim().min(1).max(160).parse(form.get('title'))
  const id = randomUUID()
  const slug = `${
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 55) || 'questionnaire'
  }-${id.slice(0, 8)}`
  await db().query('INSERT INTO questionnaires(id,slug,draft,created_by) VALUES($1,$2,$3,$4)', [
    id,
    slug,
    JSON.stringify(blankDefinition(title)),
    actor.id,
  ])
  redirect(`/builder/${id}`)
}
export async function saveQuestionnaire(id: string, revision: number, definition: unknown) {
  const actor = await requireStaff()
  z.uuid().parse(id)
  try {
    return { revision: await saveDraft(id, revision, definition, actor) }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Unable to save.',
    }
  }
}
export async function publishAction(id: string, revision: number) {
  const actor = await requireStaff(true)
  try {
    const version = await publishQuestionnaire(id, revision, actor)
    revalidatePath('/')
    return { version }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Unable to publish.',
    }
  }
}
export async function loadHistory(id: string) {
  await requireStaff()
  await getQuestionnaire(id)
  const result = await db().query<{
    revision: number
    definition: unknown
    created_at: Date
  }>(
    'SELECT revision,definition,created_at FROM draft_history WHERE questionnaire_id=$1 ORDER BY revision DESC LIMIT 30',
    [id],
  )
  return result.rows.map((row) => ({
    revision: row.revision,
    definition: definitionSchema.parse(row.definition),
    createdAt: row.created_at.toISOString(),
  }))
}
export async function updateIntegration(id: string, origins: string[], webhook: string) {
  await requireStaff(true)
  await getQuestionnaire(id)
  try {
    if (origins.length > 20) throw new Error('Use at most 20 embedding origins.')
    for (const origin of origins) {
      const url = new URL(origin)
      if (
        url.origin !== origin ||
        url.username ||
        url.password ||
        (url.protocol !== 'https:' &&
          !(process.env.NODE_ENV !== 'production' && url.protocol === 'http:'))
      )
        throw new Error('Use exact HTTPS origins, without a trailing slash.')
    }
    // Outbound destination must be explicitly allowlisted by the deployment operator.
    if (webhook) {
      const allowed = (process.env.WEBHOOK_ALLOWED_URLS || '').split(',').filter(Boolean)
      if (
        !allowed.includes(webhook) ||
        !webhook.startsWith('https://') ||
        !process.env.WEBHOOK_SECRET ||
        process.env.WEBHOOK_SECRET.length < 32
      )
        throw new Error('Webhook URL must be operator-allowlisted and a signing secret configured.')
    }
    await db().query('UPDATE questionnaires SET allowed_origins=$1,webhook_url=$2 WHERE id=$3', [
      origins,
      webhook || null,
      id,
    ])
    return { ok: true }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Unable to update integration.',
    }
  }
}
export async function generateProposal(id: string, definition: unknown, instruction: string) {
  const actor = await requireStaff()
  await getQuestionnaire(id)
  try {
    const current = definitionSchema.parse(definition)
    z.string().min(3).max(12000).parse(instruction)
    await rateLimit(`ai:${actor.id}`, 20, 3600)
    const { baseUrl: AI_BASE_URL, apiKey: AI_API_KEY, model: AI_MODEL } = await getAiConfiguration()
    if (!AI_BASE_URL || !AI_API_KEY || !AI_MODEL)
      throw new Error(
        'AI is not configured. You can still use the manual editor or import a definition.',
      )
    const response = await fetch(`${validateBaseUrl(AI_BASE_URL)}/chat/completions`, {
      method: 'POST',
      redirect: 'error',
      headers: {
        Authorization: `Bearer ${AI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(60000),
      body: JSON.stringify({
        model: AI_MODEL,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: `You edit questionnaires. Return JSON only: {"summary":"brief changes", "definition":{...}}. Preserve unrelated questions, IDs and logic. Never invent legal, migration or medical criteria. If criteria are missing, explain in summary and preserve existing criteria. Definition schema: ${JSON.stringify(z.toJSONSchema(definitionSchema))}. Branches may ONLY target later questions or $end. next="" means sequential. Question types: radio,dropdown,text,textarea,email,number. Do not include responses or executable code.`,
          },
          { role: 'user', content: JSON.stringify({ current, instruction }) },
        ],
      }),
    })
    if (!response.ok)
      throw new Error('The AI provider could not complete this request. Please try again.')
    const data: unknown = await response.json()
    const envelope = z
      .object({
        choices: z
          .array(
            z.object({
              message: z.object({ content: z.string().max(500000) }),
            }),
          )
          .min(1),
      })
      .parse(data)
    const proposal = z
      .object({ summary: z.string().max(4000), definition: definitionSchema })
      .parse(JSON.parse(envelope.choices[0].message.content))
    validateDefinition(proposal.definition)
    return { proposal }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Unable to generate proposal.',
    }
  }
}
