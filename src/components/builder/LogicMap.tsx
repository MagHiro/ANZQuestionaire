'use client'

import { useMemo, useState } from 'react'
import {
  Background,
  Controls,
  ReactFlow,
  Position,
  MarkerType,
  type Node,
  type Edge,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import type { Definition, Question } from '@/core/questionnaire'
import { QuestionEditor } from './QuestionEditor'

export function LogicMap({
  definition,
  onChange,
  issue,
}: {
  definition: Definition
  onChange: (question: Question) => void
  issue: string | null | undefined
}) {
  const [selected, setSelected] = useState(definition.questions[0]?.id || '')
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({})
  const question = definition.questions.find((q) => q.id === selected)
  const { nodes, edges } = useMemo(() => {
    const questions = definition.questions
    const ranks = new Map<string, number>()
    const routes = questions.flatMap((q, i) => [
      ...q.branches.map((branch, index) => ({
        source: q.id,
        target: branch.target,
        label: `${index + 1}. ${['checkbox', 'multiselect'].includes(q.type) ? 'Includes ' : ''}${q.options.find((o) => o.value === branch.equals)?.label || branch.equals}`,
        conditional: true,
      })),
      {
        source: q.id,
        target: q.next || questions[i + 1]?.id || '$end',
        label: q.branches.length ? 'Otherwise' : 'Always',
        conditional: false,
      },
    ])
    // The execution model only permits forward routes. Keep invalid routes visible
    // without letting them affect layout or changing the underlying definition.
    questions.forEach((q, i) => {
      const rank = ranks.get(q.id) || 0
      ranks.set(q.id, rank)
      routes
        .filter((r) => r.source === q.id)
        .forEach((r) => {
          if (r.target === '$end' || questions.findIndex((item) => item.id === r.target) > i)
            ranks.set(r.target, Math.max(ranks.get(r.target) || 0, rank + 1))
        })
    })
    const lanes = new Map<number, number>()
    const nodes: Node[] = [
      ...questions.map((q, i) => ({ id: q.id, title: q.title, number: i + 1 })),
      { id: '$end', title: 'Finish', number: 0 },
    ].map((q) => {
      const rank = ranks.get(q.id) || 0
      const lane = lanes.get(rank) || 0
      lanes.set(rank, lane + 1)
      return {
        id: q.id,
        type: q.id === '$end' ? 'output' : 'default',
        position: positions[q.id] || { x: rank * 360, y: lane * 180 },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        data: {
          label: (
            <>
              <span className="logic-node-number">{q.number || '✓'}</span>
              <span>{q.title}</span>
            </>
          ),
        },
        selected: selected === q.id,
        ariaLabel: q.number
          ? `Question ${q.number}: ${q.title}. Edit routing`
          : 'Finish questionnaire',
      }
    })
    const known = new Set(nodes.map((n) => n.id))
    const edges: Edge[] = routes
      .filter((r) => known.has(r.target))
      .map((r, i) => ({
        id: `route-${i}`,
        source: r.source,
        target: r.target,
        label: r.label,
        type: 'smoothstep',
        markerEnd: { type: MarkerType.ArrowClosed, color: r.conditional ? '#243085' : '#8293ab' },
        style: {
          stroke: r.conditional ? '#243085' : '#8293ab',
          strokeWidth: 1.6,
          ...(r.conditional ? {} : { strokeDasharray: '5 4' }),
        },
        labelStyle: { fill: '#243085', fontSize: 12, fontFamily: 'Poppins, sans-serif' },
        labelBgPadding: [8, 5],
        labelBgBorderRadius: 4,
        ariaLabel: `${questions.find((q) => q.id === r.source)?.title}: ${r.label} → ${r.target === '$end' ? 'Finish' : questions.find((q) => q.id === r.target)?.title}`,
      }))
    return { nodes, edges }
  }, [definition, selected, positions])

  return (
    <section className="logic-workspace">
      <header className="logic-map-header">
        <h1>Question flow</h1>
        <p className="muted">
          Drag nodes to arrange the map. Select a question to edit its connections. Dashed lines
          show the default route.
        </p>
      </header>
      {issue && (
        <p role="alert" className="error">
          {issue}
        </p>
      )}
      <div className="logic-map-layout">
        <div className="logic-map" aria-label="Question branching map">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            fitView
            fitViewOptions={{ maxZoom: 1, padding: 0.25 }}
            minZoom={0.15}
            maxZoom={1.5}
            nodesDraggable
            nodesConnectable={false}
            edgesReconnectable={false}
            deleteKeyCode={null}
            onNodeClick={(_, node) => {
              if (node.id !== '$end') setSelected(node.id)
            }}
            onNodesChange={(changes) => {
              setPositions((previous) => {
                const moved = changes.filter(
                  (change) => change.type === 'position' && change.position,
                )
                if (!moved.length) return previous
                const next = { ...previous }
                for (const change of moved) {
                  if (change.type === 'position' && change.position)
                    next[change.id] = change.position
                }
                return next
              })
              for (const change of changes) {
                if (change.type === 'select' && change.selected && change.id !== '$end')
                  setSelected(change.id)
              }
            }}
          >
            <Background gap={20} color="#d9e1ea" />
            <Controls showInteractive={false} />
          </ReactFlow>
        </div>
        <aside className="logic-inspector" aria-label="Routing settings">
          <label>
            Question
            <select value={question?.id || ''} onChange={(e) => setSelected(e.target.value)}>
              {definition.questions.map((q, i) => (
                <option key={q.id} value={q.id}>
                  {i + 1}. {q.title}
                </option>
              ))}
            </select>
          </label>
          {question && (
            <QuestionEditor
              key={question.id}
              question={question}
              questions={definition.questions}
              onChange={onChange}
              rulesOnly
            />
          )}
        </aside>
      </div>
    </section>
  )
}
