'use client'

import { useEffect, useRef, useState } from 'react'
import { Spinner } from './Spinner'
import { ArrowLeft, ArrowRight, ArrowUpRight, Check } from '@/components/Icons'
import { ConfirmationContent } from './ConfirmationContent'
import { QuestionInput } from './inputs/QuestionInput'
import { responseResult, selectedValues } from '@/core/questionnaire'
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
  const [statusUrl, setStatusUrl] = useState('')
  const [embedded, setEmbedded] = useState(false)
  useEffect(() => setEmbedded(window.parent !== window), [])
  const [result, setResult] = useState<ReturnType<typeof responseResult>>(null)
  const [direction, setDirection] = useState<'forward' | 'back'>('forward')
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
    setDirection('forward')
    if (nextId === '$end') setReview(true)
    else setTrail([...trail, nextId])
  }
  async function submit() {
    if (definition.payment?.enabled && !consent) {
      setError('Please confirm you are ready to submit your answers.')
      return
    }
    if (preview) {
      setResult(responseResult(definition, answers))
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
      const data: { id: string; statusUrl?: string; result?: ReturnType<typeof responseResult> } =
        await response.json()
      setStatusUrl(data.statusUrl || '')
      setResult(data.result || null)
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
      <div className="runner confirmation-screen">
        <ConfirmationContent
          title={definition.completionTitle}
          message={definition.completionMessage}
          result={result}
          headingRef={heading}
        >
          {statusUrl && (
            <div className="confirmation-next-step">
              {definition.payment?.enabled && <h2>Payment & report</h2>}
              <p className="small muted" id="confirmation-navigation-note">
                {embedded
                  ? 'Continue in a secure new tab to view your payment and report status. This page will stay open.'
                  : 'Your private confirmation opens in a new tab. Keep the link secure to return to your status.'}
              </p>
              <a
                className="button primary"
                href={statusUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-describedby="confirmation-navigation-note"
              >
                {definition.payment?.enabled ? 'Continue to payment & report' : 'View confirmation'}
                <ArrowUpRight size={18} />
              </a>
            </div>
          )}
          {preview && <p className="preview-note">Preview only. No response was saved.</p>}
        </ConfirmationContent>
      </div>
    )
  return (
    <div className="runner">
      <header className="runner-header">
        <span className="runner-wordmark">
          Questionnaire<span> / {definition.title}</span>
        </span>
        {preview && <span className="small muted">Preview · answers are not saved</span>}
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
      <main
        key={review ? 'review' : current.id}
        className={`runner-content runner-step runner-step-${direction}`}
      >
        {review ? (
          <>
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
                      {(['checkbox', 'multiselect'].includes(q.type)
                        ? selectedValues(answers[id] || '')
                            .map((v) => q.options.find((o) => o.value === v)?.label || v)
                            .join(', ')
                        : '') ||
                        q.options.find((o) => o.value === answers[id])?.label ||
                        answers[id] ||
                        'Not answered'}
                    </dd>
                  </div>
                )
              })}
            </dl>
            {definition.payment?.enabled && (
              <label className="consent">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                />
                I’m ready to submit these answers to the questionnaire owner.
              </label>
            )}
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
              <QuestionInput question={current} value={value} onChange={change} />
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
                setDirection('back')
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
            {busy && <Spinner />}
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
