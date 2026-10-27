import { z } from 'zod'
import type { JSONContent } from '@tiptap/core'

// Bound size/depth before recursively validating untrusted editor JSON.
export const emailDocumentSchema = z.unknown().transform((value, ctx): JSONContent => {
  let count = 0
  function valid(node: unknown, depth: number): boolean {
    if (!node || typeof node !== 'object' || Array.isArray(node) || depth > 20 || ++count > 3000)
      return false
    const n = node as JSONContent
    return (
      typeof n.type === 'string' &&
      /^[a-zA-Z]+$/.test(n.type) &&
      (n.text === undefined || (typeof n.text === 'string' && n.text.length <= 16000)) &&
      (n.attrs == null || (!!n.attrs && typeof n.attrs === 'object' && !Array.isArray(n.attrs))) &&
      (n.marks === undefined ||
        (Array.isArray(n.marks) &&
          n.marks.length <= 20 &&
          n.marks.every((m) => valid(m, depth + 1)))) &&
      (n.content === undefined ||
        (Array.isArray(n.content) && n.content.every((c) => valid(c, depth + 1))))
    )
  }
  if (
    JSON.stringify(value)?.length > 300000 ||
    !valid(value, 0) ||
    (value as JSONContent).type !== 'doc'
  ) {
    ctx.addIssue({ code: 'custom', message: 'Invalid email document or document too large.' })
    return z.NEVER
  }
  return value as JSONContent
})

export const emailPreviewVariables = {
  questionnaire_title: 'Migration plans',
  message: 'Your answers have been received.',
  status_url: 'https://tf.anzmigrate.com',
}
