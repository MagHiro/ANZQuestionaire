'use client'

import { useState } from 'react'
import {
  answerError,
  nextQuestion,
  responseResult,
  selectedValues,
  type Answers,
  type Definition,
} from '@/core/questionnaire'
import { QuestionInput } from '@/components/inputs/QuestionInput'
import { Markdown } from '@/components/Markdown'

export type TestedPath = {
  nodes: string[]
  routes: { source: string; handle: string; target: string }[]
}

export function LogicTester({
  definition,
  onPath,
}: {
  definition: Definition
  onPath: (path: TestedPath | null) => void
}) {
  const [answers, setAnswers] = useState<Answers>({})
  const [path, setPath] = useState<TestedPath>({ nodes: [definition.questions[0].id], routes: [] })
  const [error, setError] = useState('')
  const id = path.nodes.at(-1)!
  const question = definition.questions.find((q) => q.id === id)
  const result = id === '$end' ? responseResult(definition, answers) : null
  function restart() {
    const next = { nodes: [definition.questions[0].id], routes: [] }
    setPath(next)
    setAnswers({})
    setError('')
    onPath(next)
  }
  return (
    <section className="logic-tester" aria-label="Test this path">
      <div className="logic-test-header">
        <h2>Test this path</h2>
        <button className="text-button" onClick={restart}>
          Restart
        </button>
      </div>
      <ol className="logic-test-trail" aria-label="Tested route">
        {path.nodes.map((node, index) => (
          <li key={index}>
            {node === '$end'
              ? 'Finish'
              : definition.questions.find((q) => q.id === node)?.title || 'Missing question'}
          </li>
        ))}
      </ol>
      {question ? (
        <form
          onSubmit={(event) => {
            event.preventDefault()
            const value = answers[id] || ''
            const problem = answerError(question, value)
            if (problem) {
              setError(problem)
              return
            }
            const target = nextQuestion(definition, question, value)
            if (
              path.nodes.includes(target) ||
              (target !== '$end' && !definition.questions.some((q) => q.id === target))
            ) {
              setError('This route is invalid. Fix its target before continuing.')
              return
            }
            const branch = question.branches.find((b) =>
              ['checkbox', 'multiselect'].includes(question.type)
                ? selectedValues(value).includes(b.equals)
                : value === b.equals,
            )
            const next = {
              nodes: [...path.nodes, target],
              routes: [
                ...path.routes,
                { source: id, target, handle: branch ? `answer:${branch.equals}` : 'default' },
              ],
            }
            setError('')
            setPath(next)
            onPath(next)
          }}
        >
          <h3 id="logic-test-question">{question.title}</h3>
          <QuestionInput
            key={id}
            question={question}
            value={answers[id] || ''}
            onChange={(value) => {
              setAnswers((old) => ({ ...old, [id]: value }))
              setError('')
            }}
          />
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <button className="button primary" type="submit">
            Continue test
          </button>
        </form>
      ) : id === '$end' ? (
        <div role="status">
          <h3>
            {definition.payment?.enabled
              ? 'Payment → adviser report'
              : result?.title || definition.completionTitle}
          </h3>
          <Markdown>
            {definition.payment?.enabled
              ? 'This path finishes with payment and a private adviser report. No automatic outcome is shown.'
              : result?.message || definition.completionMessage}
          </Markdown>
        </div>
      ) : (
        <p className="error">Question not found. Restart after fixing the route.</p>
      )}
      <p className="small muted">Test only — no response is submitted and no payment is taken.</p>
    </section>
  )
}
