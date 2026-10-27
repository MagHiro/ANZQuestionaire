import { Check } from '@/components/Icons'
import type { ReactNode, Ref } from 'react'
import { Markdown } from './Markdown'

export function ConfirmationContent({
  title,
  message,
  result,
  headingRef,
  children,
}: {
  title: string
  message: string
  result?: { title: string; message: string } | null
  headingRef?: Ref<HTMLHeadingElement>
  children?: ReactNode
}) {
  return (
    <div className="confirmation-content">
      <header className="confirmation-header">
        <span className="confirmation-check" aria-hidden="true">
          <Check size={24} />
        </span>
        <h1 ref={headingRef} tabIndex={-1}>
          {title}
        </h1>
        <Markdown>{message}</Markdown>
      </header>
      {result && (
        <section className="confirmation-result" aria-label="Your result">
          <h2>{result.title}</h2>
          <Markdown>{result.message}</Markdown>
        </section>
      )}
      {children && <footer className="confirmation-footer">{children}</footer>}
    </div>
  )
}
