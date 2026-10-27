'use client'

import { useEffect, useRef } from 'react'
import { ArrowRight } from 'lucide-react'
import { Spinner } from '@/components/Spinner'
import { Markdown } from '@/components/Markdown'
import type { Definition } from '@/core/questionnaire'

export type AiPrompt = { label: string; prompt: string }
export type AiTurn = { role: string; content: string }
export type AiProposal = {
  summary: string
  clarification?: string
  definition: Definition
}

export function AiWorkspace({
  id,
  contextTitle,
  notice,
  history,
  stage,
  busy,
  working,
  instruction,
  onInstruction,
  webSearch,
  onWebSearch,
  placeholder,
  prompts,
  proposal,
  proposalStale,
  changes,
  comparisons,
  childrenMeta,
  onAsk,
  onApply,
  onPreview,
  onDiscard,
}: {
  id: string
  contextTitle: string
  notice?: string
  history: AiTurn[]
  stage: string
  busy: boolean
  working: boolean
  instruction: string
  onInstruction: (value: string) => void
  webSearch: boolean
  onWebSearch: (value: boolean) => void
  placeholder: string
  prompts: AiPrompt[]
  proposal: AiProposal | null
  proposalStale: boolean
  changes: string[]
  comparisons: {
    title: string
    beforeTitle: string
    beforeDesc?: string
    afterTitle: string
    afterDesc?: string
  }[]
  childrenMeta?: string
  onAsk: () => void
  onApply: () => void
  onPreview: () => void
  onDiscard: () => void
}) {
  const historyRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const element = historyRef.current
    if (element) element.scrollTop = element.scrollHeight
  }, [history.length, proposal?.summary, stage])
  return (
    <div className="ai-workspace">
      <p className="ai-workspace-context">
        Working with: <strong>{contextTitle}</strong>
        {proposal ? ' · Refining the pending proposal' : ''}
      </p>
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}
      {stage && (
        <div className="ai-progress" role="status" aria-live="polite">
          <span className="activity-spinner" />
          {stage}…
        </div>
      )}
      <div className="ai-workspace-history" aria-label="AI conversation" ref={historyRef}>
        {history.length === 0 && !proposal && (
          <p className="muted ai-workspace-empty">
            Describe what to create or change. The proposal and review actions appear here.
          </p>
        )}
        {history.map((item, index) => (
          <article className={`chat-message chat-${item.role}`} key={index}>
            <strong>{item.role === 'user' ? 'You' : 'Assistant'}</strong>
            <Markdown>{item.content}</Markdown>
          </article>
        ))}
        {proposal && (
          <div className="proposal">
            <h3>Proposed changes</h3>
            {proposalStale && (
              <p className="error">
                Your draft changed after this proposal. Discard it and ask again to avoid
                overwriting manual edits.
              </p>
            )}
            <details className="proposal-details">
              <summary>Review {changes.length} changes</summary>
              <ul className="small">
                {changes.map((change, index) => (
                  <li key={index}>{change}</li>
                ))}
              </ul>
              {comparisons.map((item) => (
                <section className="proposal-comparison" key={item.title}>
                  <h4>{item.title}</h4>
                  <div>
                    <span className="small muted">Before</span>
                    <p>{item.beforeTitle}</p>
                    {item.beforeDesc && <p className="small">{item.beforeDesc}</p>}
                  </div>
                  <div>
                    <span className="small muted">After</span>
                    <p>{item.afterTitle}</p>
                    {item.afterDesc && <p className="small">{item.afterDesc}</p>}
                  </div>
                </section>
              ))}
            </details>
            {childrenMeta && <p className="small muted">{childrenMeta}</p>}
          </div>
        )}
      </div>
      {proposal && (
        <div className="button-row proposal-actions">
          <button className="button secondary compact" disabled={busy} onClick={onPreview}>
            Preview proposal
          </button>
          <button
            className="button primary compact"
            disabled={busy || !!proposal.clarification || proposalStale}
            onClick={onApply}
          >
            Apply to draft
          </button>
          <button className="button secondary compact" disabled={busy} onClick={onDiscard}>
            Discard
          </button>
        </div>
      )}
      {history.length === 0 && (
        <div className="ai-prompts">
          {prompts.map((item) => (
            <button
              type="button"
              key={item.label}
              disabled={busy}
              onClick={() => onInstruction(item.prompt)}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
      <form
        className="ai-workspace-composer"
        onSubmit={(event) => {
          event.preventDefault()
          if (!busy && instruction.trim().length >= 3) onAsk()
        }}
      >
        <label className="sr-only" htmlFor={id}>
          Instructions for AI
        </label>
        <textarea
          id={id}
          value={instruction}
          onChange={(event) => onInstruction(event.target.value)}
          maxLength={12000}
          placeholder={placeholder}
          rows={3}
        />
        <div className="ai-workspace-controls">
          <label className="toggle-label">
            Search the web
            <input
              type="checkbox"
              checked={webSearch}
              onChange={(event) => onWebSearch(event.target.checked)}
              disabled={busy}
            />
          </label>
          <button
            className="button primary compact"
            disabled={busy || instruction.trim().length < 3}
            type="submit"
          >
            {working && <Spinner />}
            {working ? 'Working…' : 'Suggest changes'}
            <ArrowRight size={15} />
          </button>
        </div>
        {webSearch && (
          <p className="small muted">
            Search queries are public. Don’t include private information.
          </p>
        )}
      </form>
    </div>
  )
}
