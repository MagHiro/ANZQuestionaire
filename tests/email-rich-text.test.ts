import { expect, it } from 'vitest'
import { emailBlocksSchema, renderEmail } from '../src/core/email-template'

it('renders formatted email text safely and substitutes escaped variables', () => {
  const blocks = emailBlocksSchema.parse([
    {
      type: 'text',
      text: '',
      richText: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            attrs: { textAlign: 'center' },
            content: [
              {
                type: 'text',
                text: '{{message}}',
                marks: [
                  { type: 'bold' },
                  { type: 'textStyle', attrs: { color: '#243085', fontSize: '18px' } },
                ],
              },
            ],
          },
        ],
      },
    },
  ])
  const rendered = renderEmail(blocks, { message: '<img onerror=bad>' })
  expect(rendered.html).toContain('<strong>&lt;img onerror=bad&gt;</strong>')
  expect(rendered.html).toContain('font-size:18px')
  expect(rendered.html).toContain('text-align:center')
  expect(rendered.text).toContain('<img onerror=bad>')
})
it('rejects unsupported rich nodes and never renders arbitrary attributes or unsafe links', () => {
  expect(
    emailBlocksSchema.safeParse([{ type: 'text', text: '', richText: { type: 'script' } }]).success,
  ).toBe(false)
  const blocks = emailBlocksSchema.parse([
    {
      type: 'text',
      text: '',
      richText: {
        type: 'doc',
        content: [
          {
            type: 'text',
            text: 'Safe',
            marks: [
              { type: 'link', attrs: { href: 'javascript:alert(1)' } },
              { type: 'textStyle', attrs: { color: 'red;position:absolute', fontFamily: 'x;bad' } },
            ],
          },
        ],
      },
    },
  ])
  const { html } = renderEmail(blocks, {})
  expect(html).not.toContain('javascript:')
  expect(html).not.toContain('position:absolute')
  expect(html).not.toContain('x;bad')
})
it('supports styled logo, button and company footer blocks without changing old templates', () => {
  const blocks = emailBlocksSchema.parse([
    { type: 'header', text: 'Brand', logoURL: 'https://example.com/logo.png', width: 200 },
    { type: 'button', text: 'View', url: '{{status_url}}', backgroundColor: '#123456', radius: 8 },
    {
      type: 'footer',
      text: '',
      company: 'Example',
      registration: 'Licence details',
      copyright: '© 2026',
    },
  ])
  const { html } = renderEmail(blocks, { status_url: 'https://example.com/private' })
  expect(html).toContain('width="200"')
  expect(html).toContain('background:#123456')
  expect(html).toContain('Licence details')
})
