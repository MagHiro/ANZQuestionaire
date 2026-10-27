'use client'

import { useFormStatus } from 'react-dom'
import { Spinner } from './Spinner'

export function SubmitButton({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const { pending } = useFormStatus()
  return (
    <button className={className} disabled={pending} aria-busy={pending}>
      {pending && <Spinner />}
      {children}
    </button>
  )
}
