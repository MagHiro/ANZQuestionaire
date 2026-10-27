'use client'
import type { Definition } from '@/core/questionnaire'
import { useId, useState } from 'react'
import { ChevronDown } from 'lucide-react'

export function OutcomeSettings({
  definition: d,
  onChange,
  section = 'results',
}: {
  definition: Definition
  onChange: (d: Definition) => void
  section?: 'results' | 'payment'
}) {
  const results = d.results || []
  const [expanded, setExpanded] = useState<string | null>(null)
  const accordionId = useId()
  const payment = d.payment || {
    enabled: false,
    amountMinor: 19900,
    currency: 'sgd' as const,
    emailQuestionId: d.questions.find((q) => q.type === 'email')?.id || 'email',
    reportExpected: true,
  }
  return (
    <section className="stack">
      {section === 'results' ? (
        <>
          <p className="muted">
            Results are optional. First matching result wins; no match shows the normal
            confirmation. Only answers on the submitted path are evaluated.
          </p>
          {results.map((r, index) => {
            const update = (patch: Partial<typeof r>) =>
              onChange({
                ...d,
                results: results.map((v, i) => (i === index ? { ...v, ...patch } : v)),
              })
            return (
              <section className="result-card outcome-accordion" key={r.id}>
                <button
                  type="button"
                  className="outcome-summary"
                  id={`${accordionId}-trigger-${r.id}`}
                  aria-expanded={expanded === r.id}
                  aria-controls={`${accordionId}-panel-${r.id}`}
                  onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                >
                  <span className="outcome-priority">{index + 1}</span>
                  <span className="outcome-summary-text">
                    <span>{r.title || 'Untitled result'}</span>
                    <small>
                      {r.match === 'all' ? 'All' : 'Any'} of {r.conditions.length}{' '}
                      {r.conditions.length === 1 ? 'condition' : 'conditions'}
                    </small>
                  </span>
                  <ChevronDown size={18} aria-hidden="true" />
                </button>
                <div
                  id={`${accordionId}-panel-${r.id}`}
                  role="region"
                  aria-labelledby={`${accordionId}-trigger-${r.id}`}
                  hidden={expanded !== r.id}
                >
                  {expanded === r.id && (
                    <div className="outcome-fields stack">
                      <label>
                        Result title
                        <input
                          value={r.title}
                          onChange={(e) => update({ title: e.target.value })}
                        />
                      </label>
                      <label>
                        Result message
                        <textarea
                          value={r.message}
                          onChange={(e) => update({ message: e.target.value })}
                        />
                      </label>
                      <label>
                        Match
                        <select
                          value={r.match}
                          onChange={(e) =>
                            update({ match: e.target.value === 'all' ? 'all' : 'any' })
                          }
                        >
                          <option value="all">All conditions</option>
                          <option value="any">Any condition</option>
                        </select>
                      </label>
                      {r.conditions.map((c, ci) => {
                        const condition = (patch: Partial<typeof c>) =>
                          update({
                            conditions: r.conditions.map((v, i) =>
                              i === ci ? { ...v, ...patch } : v,
                            ),
                          })
                        return (
                          <div className="stack" key={ci}>
                            <label>
                              Question
                              <select
                                value={c.questionId}
                                onChange={(e) => condition({ questionId: e.target.value })}
                              >
                                {d.questions.map((q) => (
                                  <option key={q.id} value={q.id}>
                                    {q.title}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label>
                              Answer
                              <select
                                value={c.operator}
                                onChange={(e) =>
                                  condition({ operator: e.target.value as typeof c.operator })
                                }
                              >
                                {Object.entries({
                                  equals: 'is',
                                  notEquals: 'is not',
                                  contains: 'includes',
                                  gte: 'is at least',
                                  lte: 'is at most',
                                }).map(([op, label]) => (
                                  <option key={op} value={op}>
                                    {label}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label>
                              Answer value
                              <input
                                value={c.value}
                                onChange={(e) => condition({ value: e.target.value })}
                              />
                            </label>
                            <button
                              className="text-button"
                              onClick={() =>
                                update({ conditions: r.conditions.filter((_, i) => i !== ci) })
                              }
                            >
                              Remove condition
                            </button>
                          </div>
                        )
                      })}
                      <button
                        className="button secondary"
                        onClick={() =>
                          update({
                            conditions: [
                              ...r.conditions,
                              { questionId: d.questions[0].id, operator: 'equals', value: 'yes' },
                            ],
                          })
                        }
                      >
                        Add condition
                      </button>
                      <button
                        className="text-button danger"
                        onClick={() =>
                          onChange({ ...d, results: results.filter((_, i) => i !== index) })
                        }
                      >
                        Remove result
                      </button>
                    </div>
                  )}
                </div>
              </section>
            )
          })}
          <button
            className="button secondary"
            onClick={() => {
              const id = `result_${crypto.randomUUID().slice(0, 8)}`
              onChange({
                ...d,
                results: [
                  ...results,
                  {
                    id,
                    title: 'Your result',
                    message: '',
                    match: 'all',
                    conditions: [
                      { questionId: d.questions[0].id, operator: 'equals', value: 'yes' },
                    ],
                  },
                ],
              })
              setExpanded(id)
            }}
          >
            Add result option
          </button>
        </>
      ) : (
        <>
          <h2>Payment</h2>
          <label className="toggle-label">
            Paid questionnaire
            <input
              type="checkbox"
              checked={payment.enabled}
              onChange={(e) =>
                onChange({ ...d, payment: { ...payment, enabled: e.target.checked } })
              }
            />
          </label>
          {payment.enabled && (
            <div className="stack">
              <p>
                Answers → Stripe Checkout → verified payment → staff report upload and publication.
              </p>
              <label>
                Price (minor units, e.g. 19900 = $199.00)
                <input
                  type="number"
                  min={100}
                  value={payment.amountMinor}
                  onChange={(e) =>
                    onChange({ ...d, payment: { ...payment, amountMinor: Number(e.target.value) } })
                  }
                />
              </label>
              <label>
                Currency
                <select
                  value={payment.currency}
                  onChange={(e) =>
                    onChange({
                      ...d,
                      payment: { ...payment, currency: e.target.value as typeof payment.currency },
                    })
                  }
                >
                  {['sgd', 'aud', 'nzd', 'usd'].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label>
                Required respondent email question
                <select
                  value={payment.emailQuestionId}
                  onChange={(e) =>
                    onChange({ ...d, payment: { ...payment, emailQuestionId: e.target.value } })
                  }
                >
                  <option value="">Choose email question</option>
                  {d.questions
                    .filter((q) => q.type === 'email' && q.required)
                    .map((q) => (
                      <option key={q.id} value={q.id}>
                        {q.title}
                      </option>
                    ))}
                </select>
              </label>
            </div>
          )}
        </>
      )}
    </section>
  )
}
