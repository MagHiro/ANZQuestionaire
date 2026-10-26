import { z } from 'zod'

export const emailBlocksSchema = z
  .array(
    z
      .object({
        type: z.enum(['header', 'text', 'button', 'footer']),
        text: z.string().max(8000),
        url: z.string().max(2000).default(''),
      })
      .strict(),
  )
  .min(1)
  .max(40)
export type EmailBlock = z.infer<typeof emailBlocksSchema>[number]
const escape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  )
export const templateText = (s: string, variables: Record<string, string>) =>
  s.replace(/\{\{([a-z_]+)\}\}/g, (_, key: string) => variables[key] || '')
export function renderEmail(blocks: EmailBlock[], variables: Record<string, string>) {
  const text = blocks.map((b) => templateText(b.text, variables)).join('\n\n')
  const html = blocks
    .map((b) => {
      const label = escape(templateText(b.text, variables))
      if (b.type === 'button') {
        const url = templateText(b.url, variables)
        let safe = false
        try {
          const u = new URL(url)
          safe = u.protocol === 'https:' && !u.username && !u.password
        } catch {}
        return safe
          ? `<p style="padding:16px 0"><a href="${escape(url)}" style="display:inline-block;background:#243085;color:white;padding:14px 24px;border-radius:12px;text-decoration:none">${label}</a></p>`
          : `<p>${label}</p>`
      }
      return b.type === 'header'
        ? `<h1 style="font-weight:400;font-size:28px">${label}</h1>`
        : `<p style="white-space:pre-line;${b.type === 'footer' ? 'font-size:12px;color:#455e7d' : ''}">${label}</p>`
    })
    .join('')
  return {
    text,
    html: `<div style="background:#f3f7ff;padding:24px;font-family:Arial,sans-serif;color:#06234f"><div style="max-width:600px;margin:auto;background:white;border-radius:18px;padding:32px">${html}</div></div>`,
  }
}
export function defaultEmailBlocks(kind: string): EmailBlock[] {
  return [
    {
      type: 'header',
      text:
        kind === 'report'
          ? 'Your report is ready'
          : kind === 'payment'
            ? 'Payment received'
            : 'Thank you for your answers',
      url: '',
    },
    { type: 'text', text: '{{questionnaire_title}}\n{{message}}', url: '' },
    { type: 'button', text: 'View confirmation and report', url: '{{status_url}}' },
    { type: 'footer', text: 'ANZ Questionnaire · Keep this private link secure.', url: '' },
  ]
}
