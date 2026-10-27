'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'

export function OutcomeDialog({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: ReactNode
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const close = useRef(onClose)
  close.current = onClose
  useEffect(() => {
    const previous = document.activeElement
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialog.current?.showModal()
    return () => {
      document.body.style.overflow = overflow
      if (previous instanceof HTMLElement && previous.isConnected) previous.focus()
    }
  }, [])
  return (
    <dialog
      ref={dialog}
      className="outcome-dialog"
      aria-label={title}
      onKeyDown={(event) => {
        if (event.key !== 'Tab') return
        const controls = Array.from(
          dialog.current?.querySelectorAll<HTMLElement>(
            'button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), a[href]',
          ) || [],
        )
        const first = controls[0]
        const last = controls.at(-1)
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last?.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first?.focus()
        }
      }}
      onCancel={(event) => {
        event.preventDefault()
        close.current()
      }}
    >
      <header className="outcome-dialog-header">
        <h2>{title}</h2>
        <button
          type="button"
          className="icon-button"
          aria-label="Close outcome editor"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </header>
      <div className="outcome-dialog-body">{children}</div>
      <footer className="outcome-dialog-footer">
        <span className="small muted">Changes stay in your draft. Save draft to keep them.</span>
        <button type="button" className="button primary" onClick={onClose}>
          Done
        </button>
      </footer>
    </dialog>
  )
}
