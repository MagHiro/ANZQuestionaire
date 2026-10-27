import { expect, it } from 'vitest'
import { renderReactEmail } from '../src/server/react-email'
import { emailDocumentSchema } from '../src/core/react-email-document'
import { migrateEmailBlocks } from '../src/core/email-migration'
import { defaultEmailBlocks } from '../src/core/email-template'

it('migrates legacy notifications into React Email, preserving private action links', async () => {
  const document = migrateEmailBlocks(defaultEmailBlocks('report'))
  const result = await renderReactEmail(document, {
    questionnaire_title: 'Plans',
    message: 'Ready',
    status_url: 'https://example.com/confirmation/private',
  })
  expect(result.html).toContain('https://example.com/confirmation/private')
  expect(result.text.toLowerCase()).toContain('your report is ready')
  expect(result.html).toContain('#243085')
})

it('renders React Email documents with safely escaped personalization and plain text', async () => {
  const result = await renderReactEmail(
    {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: '{{message}}', marks: [{ type: 'bold' }] },
            {
              type: 'text',
              text: ' Open report',
              marks: [{ type: 'link', attrs: { href: '{{status_url}}' } }],
            },
          ],
        },
      ],
    },
    {
      message: '<script>alert(1)</script>',
      status_url: 'https://example.com/private?id=123&key=secret',
    },
  )
  expect(result.html).toContain('&lt;script&gt;')
  expect(result.html).not.toContain('<script>')
  expect(result.html).toContain('https://example.com/private?id=123&amp;key=secret')
  expect(result.text).toContain('Open report')
})

it('removes dangerous URL protocols after substitution', async () => {
  const result = await renderReactEmail(
    {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Unsafe',
              marks: [{ type: 'link', attrs: { href: '{{status_url}}' } }],
            },
          ],
        },
      ],
    },
    { status_url: 'javascript:alert(1)' },
  )
  expect(result.html).not.toContain('javascript:')
})

it('rejects oversized or deeply nested documents', () => {
  let content: unknown = { type: 'text', text: 'end' }
  for (let i = 0; i < 25; i++) content = { type: 'paragraph', content: [content] }
  expect(emailDocumentSchema.safeParse({ type: 'doc', content: [content] }).success).toBe(false)
})
