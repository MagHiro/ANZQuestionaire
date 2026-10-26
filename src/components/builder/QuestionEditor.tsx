'use client'
import { Plus, Trash2 } from 'lucide-react'
import type { Definition, Question } from '@/core/questionnaire'

export function QuestionEditor({
  question,
  questions,
  onChange,
}: {
  question: Question
  questions: Definition['questions']
  onChange: (q: Question) => void
}) {
  const update = (patch: Partial<Question>) => onChange({ ...question, ...patch })
  const later = questions.slice(questions.findIndex((q) => q.id === question.id) + 1)
  const choice = ['radio', 'dropdown', 'checkbox', 'multiselect'].includes(question.type)
  return (
    <div className="question-editor stack">
      <div className="panel-heading">
        <span className="eyebrow">QUESTION SETTINGS</span>
        <span className="code-label">{question.id}</span>
      </div>
      <label>
        Question type
        <select
          value={question.type}
          onChange={(e) => {
            const type = e.target.value as Question['type']
            const needsOptions = ['radio', 'dropdown', 'checkbox', 'multiselect'].includes(type)
            update({
              type,
              branches: [],
              options: needsOptions
                ? question.options.length
                  ? question.options
                  : [
                      { value: 'yes', label: 'Yes' },
                      { value: 'no', label: 'No' },
                    ]
                : [],
            })
          }}
        >
          <option value="text">Short text</option>
          <option value="textarea">Long text</option>
          <option value="radio">Multiple choice</option>
          <option value="dropdown">Dropdown</option>
          <option value="email">Email address</option>
          <option value="number">Number</option>
          <option value="date">Date picker</option>
          <option value="checkbox">Multiple selection boxes</option>
          <option value="multiselect">Searchable multi-select</option>
          <option value="tel">Phone number</option>
          <option value="url">Website URL</option>
        </select>
      </label>
      <label>
        Question
        <textarea
          value={question.title}
          maxLength={500}
          rows={3}
          onChange={(e) => update({ title: e.target.value })}
        />
      </label>
      <label>
        Help text
        <textarea
          value={question.description}
          rows={2}
          maxLength={2000}
          placeholder="A little context, if needed"
          onChange={(e) => update({ description: e.target.value })}
        />
      </label>
      <label>
        Page / section
        <input
          value={question.page}
          maxLength={120}
          onChange={(e) => update({ page: e.target.value })}
        />
      </label>
      <label className="toggle-label">
        Answer required
        <input
          type="checkbox"
          checked={question.required}
          onChange={(e) => update({ required: e.target.checked })}
        />
      </label>
      {choice && (
        <section className="stack">
          <h3>Answer choices</h3>
          {question.options.map((o, index) => (
            <div className="option-editor" key={index}>
              <label>
                <span className="sr-only">Choice {index + 1} label</span>
                <input
                  value={o.label}
                  maxLength={300}
                  onChange={(e) =>
                    update({
                      options: question.options.map((item, i) =>
                        i === index ? { ...item, label: e.target.value } : item,
                      ),
                    })
                  }
                />
              </label>
              <button
                className="icon-button"
                aria-label={`Delete choice ${index + 1}`}
                onClick={() =>
                  update({
                    options: question.options.filter((_, i) => i !== index),
                    branches: question.branches.filter((b) => b.equals !== o.value),
                  })
                }
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <button
            className="text-button"
            disabled={question.options.length >= 100}
            onClick={() =>
              update({
                options: [
                  ...question.options,
                  {
                    value: `option_${crypto.randomUUID().slice(0, 8)}`,
                    label: `Choice ${question.options.length + 1}`,
                  },
                ],
              })
            }
          >
            <Plus size={14} />
            Add choice
          </button>
        </section>
      )}
      <section className="stack rule-section">
        <h3>Where to next?</h3>
        <label>
          Default next step
          <select value={question.next} onChange={(e) => update({ next: e.target.value })}>
            <option value="">Next question in order</option>
            {later.map((q) => (
              <option key={q.id} value={q.id}>
                {q.title}
              </option>
            ))}
            <option value="$end">Finish → review answers</option>
          </select>
        </label>
        {question.branches.map((b, index) => (
          <div className="branch-editor" key={index}>
            <label>
              {['checkbox', 'multiselect'].includes(question.type)
                ? 'If selection includes'
                : 'If answer is'}
              {choice ? (
                <select
                  value={b.equals}
                  onChange={(e) =>
                    update({
                      branches: question.branches.map((v, i) =>
                        i === index ? { ...v, equals: e.target.value } : v,
                      ),
                    })
                  }
                >
                  {question.options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  value={b.equals}
                  onChange={(e) =>
                    update({
                      branches: question.branches.map((v, i) =>
                        i === index ? { ...v, equals: e.target.value } : v,
                      ),
                    })
                  }
                />
              )}
            </label>
            <label>
              Go to
              <select
                value={b.target}
                onChange={(e) =>
                  update({
                    branches: question.branches.map((v, i) =>
                      i === index ? { ...v, target: e.target.value } : v,
                    ),
                  })
                }
              >
                {later.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.title}
                  </option>
                ))}
                <option value="$end">Finish → review answers</option>
              </select>
            </label>
            <button
              className="text-button danger"
              onClick={() =>
                update({
                  branches: question.branches.filter((_, i) => i !== index),
                })
              }
            >
              Remove rule
            </button>
          </div>
        ))}
        <button
          className="text-button"
          disabled={question.branches.length >= 100}
          onClick={() =>
            update({
              branches: [
                ...question.branches,
                {
                  equals: choice
                    ? question.options.find(
                        (o) => !question.branches.some((b) => b.equals === o.value),
                      )?.value || ''
                    : '',
                  target: '$end',
                },
              ],
            })
          }
        >
          <Plus size={14} />
          Add a condition
        </button>
        <p className="small muted">
          Rules match exact answers. First match wins. Otherwise, the default next step is used.
        </p>
      </section>
    </div>
  )
}
