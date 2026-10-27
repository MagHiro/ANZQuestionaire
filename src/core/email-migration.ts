import type { JSONContent } from '@tiptap/core'
import type { EmailBlock } from './email-template'

// Read-only compatibility: old rows are retained until staff save a new document.
export function migrateEmailBlocks(blocks: EmailBlock[]): JSONContent {
  const paragraph = (text: string, attrs?: JSONContent['attrs']): JSONContent => ({
    type: 'paragraph',
    attrs,
    content: [{ type: 'text', text }],
  })
  return {
    type: 'doc',
    content: blocks.flatMap((block): JSONContent[] => {
      if (block.type === 'text' && block.richText) return block.richText.content || []
      if (block.type === 'header' && block.logoURL) {
        const image: JSONContent = {
          type: 'image',
          attrs: {
            src: block.logoURL,
            alt: block.text,
            width: block.width || 180,
            style: `width:${block.width || 180}px;max-width:100%;height:auto`,
          },
        }
        if (block.linkURL) image.marks = [{ type: 'link', attrs: { href: block.linkURL } }]
        return [image]
      }
      if (block.type === 'header')
        return [
          { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: block.text }] },
        ]
      if (block.type === 'button')
        return [
          {
            type: 'button',
            attrs: {
              href: block.url,
              alignment: block.alignment || 'left',
              style: `background-color:${block.backgroundColor || '#243085'};color:${block.textColor || '#ffffff'};font-size:${block.fontSize || 15}px;padding:${block.paddingY || 14}px ${block.paddingX || 24}px;border-radius:${block.radius ?? 6}px`,
            },
            content: [{ type: 'text', text: block.text }],
          },
        ]
      if (block.type === 'footer')
        return [block.company, block.registration, block.copyright, block.text]
          .filter((text): text is string => !!text)
          .map((text) => paragraph(text, { style: 'font-size:12px;color:#455e7d' }))
      return [paragraph(block.text)]
    }),
  }
}
