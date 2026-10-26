'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, CheckCheck } from 'lucide-react'
import {
  answerError,
  evaluateResponse,
  nextQuestion,
  type Answers,
  type Definition,
} from '@/core/questionnaire'

export function Runner({
  definition,
  releaseId,
  parentOrigins = [],
  preview = false,
}: {
  definition: Definition
  releaseId?: string
  parentOrigins?: string[]
  preview?: boolean
}) {
  const [answers, setAnswers] = useState<Answers>({})
  const [trail, setTrail] = useState<string[]>([definition.questions[0].id])
  const [complete, setComplete] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const heading = useRef<HTMLHeadingElement>(null)
  const submissionId = useRef<string>('')
  const [consent, setConsent] = useState(false)
  const [review, setReview] = useState(false)
  const current = definition.questions.find((q) => q.id === trail[trail.length - 1])!
  const value = answers[current.id] || ''
  useEffect(() => {
    heading.current?.focus()
  }, [trail.length, review, complete])
  useEffect(() => {
    if (preview || window.parent === window) return
    const announce = () => {
      for (const origin of parentOrigins)
        window.parent.postMessage(
          {
            type: 'questionnaire:resize',
            height: document.documentElement.scrollHeight,
            releaseId,
          },
          origin,
        )
    }
    const observer = new ResizeObserver(announce)
    observer.observe(document.body)
    announce()
    return () => observer.disconnect()
  }, [parentOrigins, preview, releaseId])

  function change(value: string) {
    setAnswers((old) => ({ ...old, [current.id]: value }))
    setError('')
  }
  function next() {
    const problem = answerError(current, value)
    if (problem) {
      setError(problem)
      return
    }
    const nextId = nextQuestion(definition, current, value)
    // Remove all downstream answers whenever moving through a changed path.
    const retained = Object.fromEntries([
      ...trail.map((id) => [id, answers[id] || '']),
      [current.id, value],
    ])
    setAnswers(retained)
    if (nextId === '$end') setReview(true)
    else setTrail([...trail, nextId])
  }
  async function submit() {
    if (!consent) {
      setError('Please confirm you are ready to submit your answers.')
      return
    }
    if (preview) {
      setComplete(true)
      return
    }
    setBusy(true)
    setError('')
    try {
      submissionId.current ||= crypto.randomUUID()
      const response = await fetch('/api/responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          releaseId,
          submissionId: submissionId.current,
          answers,
        }),
      })
      if (!response.ok)
        throw new Error('Unable to submit. Please try again; your answers are still here.')
      const data: { id: string } = await response.json()
      setComplete(true)
      for (const origin of parentOrigins)
        if (window.parent !== window)
          window.parent.postMessage(
            { type: 'questionnaire:completed', responseId: data.id, releaseId },
            origin,
          )
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to submit.')
    } finally {
      setBusy(false)
    }
  }
  // Estimate the remaining path using fallbacks; text explicitly says the path may adapt.
  const remaining =
    definition.questions.length - definition.questions.findIndex((q) => q.id === current.id)
  const progress =
    review || complete
      ? 100
      : Math.round(((trail.length - 1) / (trail.length - 1 + remaining)) * 100)
  if (complete)
    return (
      <div className="runner completion">
        <span className="completion-icon">
          <CheckCheck size={30} />
        </span>
        <h1 ref={heading} tabIndex={-1}>
          {definition.completionTitle}
        </h1>
        <p>{definition.completionMessage}</p>
        {preview && <p className="preview-note">Preview only. No response was saved.</p>}
      </div>
    )
  return (
    <div className="runner">
      <header className="runner-header">
        <span className="runner-wordmark">
          Questionnaire<span> / {definition.title}</span>
        </span>
        <span className="small muted">
          {preview ? 'Preview · answers are not saved' : 'A little clarity starts here'}
        </span>
      </header>
      <div
        className="runner-progress"
        aria-label="Questionnaire progress"
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <span style={{ width: `${progress}%` }} />
      </div>
      <main className="runner-content">
        {review ? (
          <>
            <span className="eyebrow">ONE LAST LOOK</span>
            <h1 ref={heading} tabIndex={-1}>
              Ready when you are.
            </h1>
            <p className="muted">Review your answers before sending them.</p>
            <dl className="review-list">
              {evaluateResponse(definition, answers).path.map((id) => {
                const q = definition.questions.find((q) => q.id === id)!
                return (
                  <div key={id}>
                    <dt>{q.title}</dt>
                    <dd>
                      {q.options.find((o) => o.value === answers[id])?.label ||
                        answers[id] ||
                        'Not answered'}
                    </dd>
                  </div>
                )
              })}
            </dl>
            <label className="consent">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
              />
              I’m ready to submit these answers to the questionnaire owner.
            </label>
          </>
        ) : (
          <>
            <span className="question-kicker">
              {String(trail.length).padStart(2, '0')} <ArrowRight size={15} /> {current.page}
            </span>
            <h1 ref={heading} tabIndex={-1} id="question-title">
              {current.title}
              {!current.required && <span className="optional">Optional</span>}
            </h1>
            {current.description && (
              <p id="question-description" className="question-description">
                {current.description}
              </p>
            )}
            {trail.length === 1 && definition.description && (
              <p className="runner-intro">{definition.description}</p>
            )}
            <div className="answer-area">
              {current.type === 'radio' ? (
                <fieldset aria-labelledby="question-title">
                  <legend className="sr-only">Choose one answer</legend>
                  {current.options.map((o, i) => (
                    <label
                      key={o.value}
                      className={`answer-choice ${value === o.value ? 'selected' : ''}`}
                    >
                      <input
                        type="radio"
                        name={current.id}
                        value={o.value}
                        checked={value === o.value}
                        onChange={() => change(o.value)}
                      />
                      <span className="choice-letter">{i + 1}</span>
                      <span>{o.label}</span>
                      {value === o.value && <Check size={19} />}
                    </label>
                  ))}
                </fieldset>
              ) : current.type === 'dropdown' ? (
                <select
                  aria-labelledby="question-title"
                  value={value}
                  onChange={(e) => change(e.target.value)}
                >
                  <option value="">Choose an answer…</option>
                  {current.options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : current.type === 'textarea' ? (
                <textarea
                  aria-labelledby="question-title"
                  value={value}
                  onChange={(e) => change(e.target.value)}
                  rows={4}
                  maxLength={10000}
                  placeholder="Your answer goes here…"
                />
              ) : (
                <input
                  aria-labelledby="question-title"
                  type={
                    current.type === 'number'
                      ? 'number'
                      : current.type === 'email'
                        ? 'email'
                        : 'text'
                  }
                  value={value}
                  onChange={(e) => change(e.target.value)}
                  maxLength={10000}
                  placeholder={
                    current.type === 'email' ? 'you@example.com' : 'Your answer goes here…'
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') next()
                  }}
                />
              )}
            </div>
          </>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="runner-actions">
          {(trail.length > 1 || review) && (
            <button
              className="button ghost"
              disabled={busy}
              onClick={() => {
                setError('')
                if (review) setReview(false)
                else {
                  const shortened = trail.slice(0, -1)
                  setTrail(shortened)
                  setAnswers(Object.fromEntries(shortened.map((id) => [id, answers[id] || ''])))
                }
              }}
            >
              <ArrowLeft size={17} />
              Back
            </button>
          )}
          <button className="button primary" disabled={busy} onClick={review ? submit : next}>
            {busy ? 'Sending…' : review ? 'Submit answers' : 'Continue'}
            <ArrowRight size={17} />
          </button>
        </div>
      </main>
      <footer className="runner-footer">
        <span>
          {review
            ? 'Review your answers'
            : `Question ${trail.length} · Your path adapts to your answers`}
        </span>
        <span>Powered by ANZ Questionnaire</span>
      </footer>
    </div>
  )
}
