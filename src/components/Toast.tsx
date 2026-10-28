'use client'

import { useEffect, useState } from 'react'
import { X } from '@/components/Icons'

export function Toast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  const [closing, setClosing] = useState(false)
  const [paused, setPaused] = useState(false)
  useEffect(() => {
    if (paused || closing) return
    const timer = setTimeout(() => setClosing(true), 7000)
    return () => clearTimeout(timer)
  }, [paused, closing])
  useEffect(() => {
    if (!closing) return
    const timer = setTimeout(onDismiss, 180)
    return () => clearTimeout(timer)
  }, [closing, onDismiss])
  return (
    <div
      className={`notice app-toast ${closing ? 'app-toast-closing' : ''}`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <span>{message}</span>
      <button
        type="button"
        className="icon-button"
        aria-label="Dismiss message"
        onClick={() => setClosing(true)}
      >
        <X size={18} />
      </button>
    </div>
  )
}
