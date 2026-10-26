'use client'
import type { EmailBlock } from '@/core/email-template'

export function EmailBlockSettings({
  block: b,
  onChange,
}: {
  block: EmailBlock
  onChange: (patch: Partial<EmailBlock>) => void
}) {
  const number = (
    key: 'width' | 'spacing' | 'fontSize' | 'paddingX' | 'paddingY' | 'radius',
    label: string,
    fallback: number,
    min: number,
    max: number,
  ) => (
    <label>
      {label}
      <input
        type="number"
        min={min}
        max={max}
        value={b[key] ?? fallback}
        onChange={(e) => onChange({ [key]: Number(e.target.value) })}
      />
    </label>
  )
  return (
    <div className="email-block-settings">
      {b.type === 'header' && (
        <>
          <label>
            Logo image URL
            <input
              type="url"
              placeholder="https://…/logo.png"
              value={b.logoURL || ''}
              onChange={(e) => onChange({ logoURL: e.target.value })}
            />
          </label>
          <label>
            Logo link
            <input
              type="url"
              value={b.linkURL || ''}
              onChange={(e) => onChange({ linkURL: e.target.value })}
            />
          </label>
          {number('width', 'Logo width (px)', 180, 60, 320)}
        </>
      )}
      {(b.type === 'header' || b.type === 'button') && (
        <>
          <label>
            Alignment
            <select
              value={b.alignment || 'left'}
              onChange={(e) =>
                onChange({ alignment: e.target.value as 'left' | 'center' | 'right' })
              }
            >
              <option value="left">Left</option>
              <option value="center">Centre</option>
              <option value="right">Right</option>
            </select>
          </label>
          {number('spacing', 'Space below (px)', 24, 0, 64)}
        </>
      )}
      {b.type === 'button' && (
        <>
          {number('fontSize', 'Text size (px)', 15, 12, 24)}
          {number('paddingX', 'Horizontal padding (px)', 24, 8, 64)}
          {number('paddingY', 'Vertical padding (px)', 14, 8, 32)}
          {number('radius', 'Corner radius (px)', 6, 0, 24)}
          <label>
            Button colour
            <input
              type="color"
              value={b.backgroundColor || '#243085'}
              onChange={(e) => onChange({ backgroundColor: e.target.value })}
            />
          </label>
          <label>
            Button text colour
            <input
              type="color"
              value={b.textColor || '#ffffff'}
              onChange={(e) => onChange({ textColor: e.target.value })}
            />
          </label>
        </>
      )}
      {b.type === 'footer' && (
        <>
          {(['company', 'registration', 'copyright'] as const).map((key) => (
            <label key={key}>
              {
                {
                  company: 'Company name',
                  registration: 'Registration and licence details',
                  copyright: 'Copyright line',
                }[key]
              }
              <textarea
                value={b[key] || ''}
                onChange={(e) => onChange({ [key]: e.target.value })}
              />
            </label>
          ))}
        </>
      )}
    </div>
  )
}
