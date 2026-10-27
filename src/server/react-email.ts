import { Editor, type JSONContent } from '@tiptap/core'
import { StarterKit } from '@react-email/editor/extensions'
import { EmailTheming } from '@react-email/editor/plugins'
import { composeReactEmail } from '@react-email/editor/core'
import sanitizeHtml from 'sanitize-html'
import { emailDocumentSchema } from '@/core/react-email-document'
import { templateText } from '@/core/email-template'
import { safeEmailUrl } from '@/core/email-rich-text'
import { anzEmailTheme } from '@/core/email-theme'

export async function renderReactEmail(input: unknown, variables: Record<string, string>) {
  const document = emailDocumentSchema.parse(input)
  function personalize(node: JSONContent): JSONContent {
    const attrs = { ...node.attrs }
    if (
      typeof attrs.style === 'string' &&
      /url\s*\(|expression\s*\(|@import|javascript:/i.test(attrs.style)
    )
      delete attrs.style
    for (const key of ['href', 'src']) {
      if (typeof attrs[key] === 'string') {
        const url = templateText(attrs[key], variables)
        attrs[key] = safeEmailUrl(url) ? url : ''
      }
    }
    return {
      ...node,
      attrs,
      text: node.text === undefined ? undefined : templateText(node.text, variables),
      marks: node.marks?.map(personalize) as JSONContent['marks'],
      content: node.content?.map(personalize),
    }
  }
  const editor = new Editor({
    element: null,
    extensions: [StarterKit, EmailTheming.configure({ theme: anzEmailTheme })],
    content: personalize(document),
  })
  try {
    const result = await composeReactEmail({ editor, preview: '' })
    // Defense in depth: never deliver scripts, event attributes, unsafe links or remote CSS.
    const html = sanitizeHtml(result.html, {
      allowedTags: [
        ...sanitizeHtml.defaults.allowedTags,
        'html',
        'head',
        'body',
        'meta',
        'title',
        'img',
        'style',
      ],
      allowedAttributes: {
        '*': ['style', 'align', 'valign', 'width', 'height', 'role', 'class'],
        a: ['href', 'target', 'rel'],
        img: ['src', 'alt', 'width', 'height'],
        meta: ['name', 'content', 'http-equiv'],
        table: ['cellpadding', 'cellspacing', 'border', 'width', 'role', 'style', 'align'],
      },
      allowedSchemes: ['https'],
      allowProtocolRelative: false,
      allowVulnerableTags: true,
      // React Email generates the stylesheet, not the author. Remove CSS URL imports.
      exclusiveFilter: (frame) => frame.tag === 'style' && /url\s*\(|@import/i.test(frame.text),
    })
    // Add only our trusted font stylesheet after sanitizing author content.
    const origin = new URL(process.env.APP_URL || 'https://tf.anzmigrate.com').origin
    const fonts = [400, 500, 600, 700]
      .map(
        (weight) =>
          `@font-face{font-family:Poppins;font-style:normal;font-weight:${weight};font-display:swap;src:url('${origin}/fonts/poppins-latin-${weight}-normal.woff2') format('woff2')}`,
      )
      .join('')
    return { html: html.replace('</head>', `<style>${fonts}</style></head>`), text: result.text }
  } finally {
    editor.destroy()
  }
}
