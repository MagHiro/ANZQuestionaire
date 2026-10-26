'use client'
import { useState } from 'react'
import { DayPicker } from 'react-day-picker'
import { CalendarDays, Check } from 'lucide-react'
import { selectedValues, type Question } from '@/core/questionnaire'
import { StyledSelect } from './StyledSelect'

export function QuestionInput({
  question: q,
  value,
  onChange,
}: {
  question: Question
  value: string
  onChange: (value: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  if (q.type === 'dropdown')
    return <StyledSelect label={q.title} value={value} onChange={onChange} options={q.options} />
  if (q.type === 'date')
    return (
      <div className="date-control">
        <button
          type="button"
          className="styled-select"
          aria-label={q.title}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          {value || 'Choose a date'}
          <CalendarDays size={20} />
        </button>
        {open && (
          <div className="calendar-panel">
            <DayPicker
              mode="single"
              captionLayout="dropdown"
              startMonth={new Date(1900, 0)}
              endMonth={new Date(2100, 11)}
              selected={value ? new Date(`${value}T12:00:00`) : undefined}
              onSelect={(date) => {
                if (date) {
                  onChange(
                    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
                  )
                  setOpen(false)
                }
              }}
            />
            <button type="button" className="text-button" onClick={() => setOpen(false)}>
              Close calendar
            </button>
          </div>
        )}
      </div>
    )
  if (['radio', 'checkbox', 'multiselect'].includes(q.type)) {
    const multiple = q.type !== 'radio'
    const selected = selectedValues(value)
    return (
      <fieldset className="choice-group" aria-label={q.title}>
        <legend className="sr-only">
          {multiple ? 'Choose one or more answers' : 'Choose one answer'}
        </legend>
        {q.type === 'multiselect' && (
          <input
            aria-label="Filter choices"
            placeholder="Search choices…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        )}
        {q.options
          .filter((o) => o.label.toLowerCase().includes(search.toLowerCase()))
          .map((o, i) => {
            const checked = multiple ? selected.includes(o.value) : value === o.value
            return (
              <label key={o.value} className={`answer-choice ${checked ? 'selected' : ''}`}>
                <input
                  type={multiple ? 'checkbox' : 'radio'}
                  name={q.id}
                  checked={checked}
                  onChange={() =>
                    onChange(
                      multiple
                        ? JSON.stringify(
                            checked
                              ? selected.filter((v) => v !== o.value)
                              : [...selected, o.value],
                          )
                        : o.value,
                    )
                  }
                />
                <span className="choice-letter">
                  {multiple ? checked ? <Check size={16} /> : ' ' : i + 1}
                </span>
                <span>{o.label}</span>
              </label>
            )
          })}
      </fieldset>
    )
  }
  if (q.type === 'textarea')
    return (
      <textarea
        aria-label={q.title}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        maxLength={10000}
        placeholder="Your answer goes here…"
      />
    )
  return (
    <input
      aria-label={q.title}
      type={['email', 'number', 'tel', 'url'].includes(q.type) ? q.type : 'text'}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      maxLength={10000}
      placeholder={q.type === 'email' ? 'you@example.com' : 'Your answer goes here…'}
    />
  )
}
