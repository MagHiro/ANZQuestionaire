'use client'
import { EditorContent, useEditor } from '@tiptap/react'
import { useEffect } from 'react'
import StarterKit from '@tiptap/starter-kit'
import { TextStyleKit } from '@tiptap/extension-text-style'
import TextAlign from '@tiptap/extension-text-align'
import type { EmailRichNode } from '@/core/email-rich-text'
import { safeEmailUrl } from '@/core/email-rich-text'

export function EmailRichTextEditor({
  text,
  document,
  onChange,
}: {
  text: string
  document?: EmailRichNode
  onChange: (doc: EmailRichNode) => void
}) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3, 4] }, link: { openOnClick: false } }),
      TextStyleKit,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content: document || {
      type: 'doc',
      content: [{ type: 'paragraph', content: text ? [{ type: 'text', text }] : [] }],
    },
    onUpdate: ({ editor }) =>
      onChange(JSON.parse(JSON.stringify(editor.getJSON())) as EmailRichNode),
    editorProps: {
      attributes: {
        role: 'textbox',
        'aria-label': 'Content',
        'aria-multiline': 'true',
        class: 'email-rich-content',
      },
    },
  })
  useEffect(() => {
    if (!editor) return
    const content = document || {
      type: 'doc',
      content: [{ type: 'paragraph', content: text ? [{ type: 'text', text }] : [] }],
    }
    if (JSON.stringify(editor.getJSON()) !== JSON.stringify(content))
      editor.commands.setContent(content, { emitUpdate: false })
  }, [editor, document, text])
  if (!editor) return null
  const commands = [
    ['Bold', () => editor.chain().focus().toggleBold().run(), editor.isActive('bold')],
    ['Italic', () => editor.chain().focus().toggleItalic().run(), editor.isActive('italic')],
    [
      'Underline',
      () => editor.chain().focus().toggleUnderline().run(),
      editor.isActive('underline'),
    ],
    ['Strike', () => editor.chain().focus().toggleStrike().run(), editor.isActive('strike')],
    [
      'Bullet list',
      () => editor.chain().focus().toggleBulletList().run(),
      editor.isActive('bulletList'),
    ],
    [
      'Numbered list',
      () => editor.chain().focus().toggleOrderedList().run(),
      editor.isActive('orderedList'),
    ],
    ['Quote', () => editor.chain().focus().toggleBlockquote().run(), editor.isActive('blockquote')],
  ] as const
  return (
    <div className="email-rich-editor">
      <div className="email-format-toolbar" role="toolbar" aria-label="Email text formatting">
        <select
          aria-label="Paragraph style"
          value={editor.isActive('heading') ? String(editor.getAttributes('heading').level) : 'p'}
          onChange={(e) =>
            e.target.value === 'p'
              ? editor.chain().focus().setParagraph().run()
              : editor
                  .chain()
                  .focus()
                  .toggleHeading({ level: Number(e.target.value) as 2 | 3 | 4 })
                  .run()
          }
        >
          <option value="p">Paragraph</option>
          {[2, 3, 4].map((n) => (
            <option key={n} value={n}>
              Heading {n}
            </option>
          ))}
        </select>
        <select
          aria-label="Font family"
          onChange={(e) => editor.chain().focus().setFontFamily(e.target.value).run()}
        >
          <option value="Arial">Arial</option>
          <option>Georgia</option>
          <option>Verdana</option>
          <option>Poppins</option>
        </select>
        <select
          aria-label="Font size"
          defaultValue="16px"
          onChange={(e) => editor.chain().focus().setFontSize(e.target.value).run()}
        >
          {[12, 14, 16, 18, 20, 24, 28, 32, 40, 48].map((n) => (
            <option key={n} value={`${n}px`}>
              {n}px
            </option>
          ))}
        </select>
        <input
          type="color"
          aria-label="Text colour"
          defaultValue="#06234f"
          onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
        />
        {commands.map(([name, run, active]) => (
          <button type="button" key={name} aria-label={name} aria-pressed={active} onClick={run}>
            {name}
          </button>
        ))}
        {(['left', 'center', 'right', 'justify'] as const).map((align) => (
          <button
            type="button"
            key={align}
            aria-label={`Align ${align}`}
            aria-pressed={editor.isActive({ textAlign: align })}
            onClick={() => editor.chain().focus().setTextAlign(align).run()}
          >
            {align}
          </button>
        ))}
        <button
          type="button"
          onClick={() => {
            const url = window.prompt('Link destination (HTTPS)')
            if (url && safeEmailUrl(url)) editor.chain().focus().setLink({ href: url }).run()
          }}
        >
          Insert link
        </button>
        <button type="button" onClick={() => editor.chain().focus().unsetLink().run()}>
          Remove link
        </button>
        <select
          aria-label="Insert variable"
          value=""
          onChange={(e) => {
            if (e.target.value) editor.chain().focus().insertContent(`{{${e.target.value}}}`).run()
          }}
        >
          <option value="">Insert variable…</option>
          {['questionnaire_title', 'message', 'status_url'].map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
        <button type="button" onClick={() => editor.chain().focus().undo().run()}>
          Undo
        </button>
        <button type="button" onClick={() => editor.chain().focus().redo().run()}>
          Redo
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}
