import { Check } from 'lucide-react'
import type { ReactNode, Ref } from 'react'

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
        <p>{message}</p>
      </header>
      {result && (
        <section className="confirmation-result" aria-label="Your result">
          <h2>{result.title}</h2>
          <p>{result.message}</p>
        </section>
      )}
      {children && <footer className="confirmation-footer">{children}</footer>}
    </div>
  )
}
