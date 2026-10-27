'use client'
import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'

export function OptionalPortal({
  target,
  children,
}: {
  target: HTMLElement | null
  children: ReactNode
}) {
  return target ? createPortal(children, target) : children
}
