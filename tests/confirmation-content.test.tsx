import { expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { ConfirmationContent } from '../src/components/ConfirmationContent'

it('renders outcome Markdown as readable, safe content instead of literal syntax', () => {
  const html = renderToStaticMarkup(
    <ConfirmationContent
      title="Thanks for sharing your background"
      message="Your answers are in. **Here are your next steps.**"
      result={{
        title: 'Skilled work pathways',
        message:
          '**Options to explore**\n\n- Skilled Independent (189)\n- Skilled Nominated (190)\n\n<script>alert(1)</script>',
      }}
    />,
  )
  expect(html).toContain('<strong>Options to explore</strong>')
  expect(html).toContain('<li>Skilled Independent (189)</li>')
  expect(html).not.toContain('**Options')
  expect(html).not.toContain('<script>')
})
