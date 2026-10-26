import { z } from 'zod'
import {
  emailRichTextSchema,
  renderRichEmail,
  richEmailPlainText,
  safeEmailUrl,
} from './email-rich-text'

export const emailBlocksSchema = z
  .array(
    z
      .object({
        type: z.enum(['header', 'text', 'button', 'footer']),
        text: z.string().max(8000),
        url: z.string().max(2000).default(''),
        richText: emailRichTextSchema.optional(),
        logoURL: z.string().max(2000).optional(),
        linkURL: z.string().max(2000).optional(),
        alignment: z.enum(['left', 'center', 'right']).optional(),
        width: z.number().int().min(60).max(320).optional(),
        spacing: z.number().int().min(0).max(64).optional(),
        fontSize: z.number().int().min(12).max(24).optional(),
        paddingX: z.number().int().min(8).max(64).optional(),
        paddingY: z.number().int().min(8).max(32).optional(),
        radius: z.number().int().min(0).max(24).optional(),
        backgroundColor: z
          .string()
          .regex(/^#[a-f0-9]{6}$/i)
          .optional(),
        textColor: z
          .string()
          .regex(/^#[a-f0-9]{6}$/i)
          .optional(),
        company: z.string().max(300).optional(),
        registration: z.string().max(2000).optional(),
        copyright: z.string().max(300).optional(),
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
  const text = blocks
    .map((b) =>
      templateText(
        b.richText
          ? richEmailPlainText(b.richText)
          : [b.text, b.company, b.registration, b.copyright, b.type === 'button' ? b.url : '']
              .filter(Boolean)
              .join('\n'),
        variables,
      ),
    )
    .join('\n\n')
  const html = blocks
    .map((b) => {
      const label = escape(templateText(b.text, variables))
      if (b.type === 'text' && b.richText)
        return renderRichEmail(b.richText, (s) => templateText(s, variables))
      if (b.type === 'header' && b.logoURL && safeEmailUrl(b.logoURL)) {
        const image = `<img src="${escape(b.logoURL)}" alt="${label}" width="${b.width || 180}" style="max-width:100%;height:auto;border:0" />`
        return `<div style="text-align:${b.alignment || 'left'};padding-bottom:${b.spacing ?? 32}px">${b.linkURL && safeEmailUrl(b.linkURL) ? `<a href="${escape(b.linkURL)}">${image}</a>` : image}</div>`
      }
      if (b.type === 'footer' && b.company !== undefined)
        return `<div style="font-size:12px;color:#455e7d;border-top:1px solid #d4dfef;padding-top:24px">${[
          b.company,
          b.registration,
          b.copyright,
          b.text,
        ]
          .filter(Boolean)
          .map((s) => `<p style="white-space:pre-line">${escape(templateText(s!, variables))}</p>`)
          .join('')}</div>`
      if (b.type === 'button') {
        const url = templateText(b.url, variables)
        let safe = false
        try {
          const u = new URL(url)
          safe = u.protocol === 'https:' && !u.username && !u.password
        } catch {}
        return safe
          ? `<p style="text-align:${b.alignment || 'left'};padding:0 0 ${b.spacing ?? 24}px"><a href="${escape(url)}" style="display:inline-block;background:${b.backgroundColor || '#243085'};color:${b.textColor || '#ffffff'};font-size:${b.fontSize || 15}px;padding:${b.paddingY || 14}px ${b.paddingX || 24}px;border-radius:${b.radius ?? 6}px;text-decoration:none">${label}</a></p>`
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
