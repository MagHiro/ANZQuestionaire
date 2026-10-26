import { z } from 'zod'

export type EmailRichNode = {
  type: string
  text?: string
  attrs?: Record<string, string | number | null>
  marks?: { type: string; attrs?: Record<string, string | number | null> }[]
  content?: EmailRichNode[]
}
export const emailRichTextSchema: z.ZodType<EmailRichNode> = z.lazy(() =>
  z.object({
    type: z.enum([
      'doc',
      'paragraph',
      'heading',
      'text',
      'bulletList',
      'orderedList',
      'listItem',
      'blockquote',
      'hardBreak',
      'horizontalRule',
    ]),
    text: z.string().max(8000).optional(),
    attrs: z.record(z.string(), z.union([z.string().max(2000), z.number(), z.null()])).optional(),
    marks: z
      .array(
        z.object({
          type: z.enum(['bold', 'italic', 'underline', 'strike', 'link', 'textStyle']),
          attrs: z
            .record(z.string(), z.union([z.string().max(2000), z.number(), z.null()]))
            .optional(),
        }),
      )
      .max(10)
      .optional(),
    content: z.array(emailRichTextSchema).max(200).optional(),
  }),
)
export const escapeEmail = (s: string): string =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  )
export function safeEmailUrl(value: string): boolean {
  try {
    const u = new URL(value)
    return u.protocol === 'https:' && !u.username && !u.password
  } catch {
    return false
  }
}
export function renderRichEmail(
  node: EmailRichNode,
  substitute: (s: string) => string,
  depth = 0,
): string {
  if (depth > 20) return ''
  if (node.type === 'text') {
    let html = escapeEmail(substitute(node.text || ''))
    for (const mark of node.marks || []) {
      const tag = { bold: 'strong', italic: 'em', underline: 'u', strike: 's' }[mark.type]
      if (tag) html = `<${tag}>${html}</${tag}>`
      if (mark.type === 'link' && safeEmailUrl(substitute(String(mark.attrs?.href || ''))))
        html = `<a href="${escapeEmail(substitute(String(mark.attrs?.href)))}">${html}</a>`
      if (mark.type === 'textStyle') {
        const a = mark.attrs || {}
        const styles = [
          typeof a.color === 'string' && /^#[a-f0-9]{6}$/i.test(a.color) ? `color:${a.color}` : '',
          typeof a.fontSize === 'string' && /^(1[2-9]|[2-3][0-9]|4[0-8])px$/.test(a.fontSize)
            ? `font-size:${a.fontSize}`
            : '',
          ['Arial', 'Georgia', 'Verdana', 'Poppins'].includes(String(a.fontFamily))
            ? `font-family:${a.fontFamily},sans-serif`
            : '',
        ]
          .filter(Boolean)
          .join(';')
        html = `<span style="${styles}">${html}</span>`
      }
    }
    return html
  }
  const children = (node.content || [])
    .map((n) => renderRichEmail(n, substitute, depth + 1))
    .join('')
  if (node.type === 'doc') return children
  if (node.type === 'hardBreak') return '<br />'
  if (node.type === 'horizontalRule') return '<hr />'
  const tag =
    node.type === 'heading'
      ? `h${[2, 3, 4].includes(Number(node.attrs?.level)) ? node.attrs?.level : 2}`
      : {
          paragraph: 'p',
          bulletList: 'ul',
          orderedList: 'ol',
          listItem: 'li',
          blockquote: 'blockquote',
        }[node.type] || 'p'
  const align = ['left', 'center', 'right', 'justify'].includes(String(node.attrs?.textAlign))
    ? node.attrs?.textAlign
    : 'left'
  return `<${tag} style="text-align:${align}">${children}</${tag}>`
}
export function richEmailPlainText(node: EmailRichNode): string {
  return (
    node.text ||
    (node.content || [])
      .map(richEmailPlainText)
      .join(['doc', 'bulletList', 'orderedList'].includes(node.type) ? '\n' : '')
  )
}
