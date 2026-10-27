'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Background,
  Controls,
  ReactFlow,
  Position,
  MarkerType,
  Handle,
  applyNodeChanges,
  type NodeProps,
  type Connection,
  type ReactFlowInstance,
  type Node,
  type Edge,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import type { Definition, Question } from '@/core/questionnaire'
import { QuestionEditor } from './QuestionEditor'

function RouteNode({ data }: NodeProps) {
  const q = data.question as Question | undefined
  const ports = q
    ? [...new Set([...q.options.map((o) => o.value), ...q.branches.map((b) => b.equals)])]
    : []
  return (
    <>
      <Handle
        type="target"
        position={Position.Left}
        id="in"
        aria-label="Connect to this question"
      />
      <div className="logic-node-title">
        <span className="logic-node-number">{(data.number as number) || '✓'}</span>
        <span>{data.title as string}</span>
      </div>
      {q && (
        <div className="logic-node-ports">
          {ports.map((value) => (
            <div className="logic-node-port" key={value}>
              <span>{q.options.find((o) => o.value === value)?.label || value}</span>
              <Handle
                type="source"
                position={Position.Right}
                id={`answer:${value}`}
                aria-label={`Connect answer ${value}`}
              />
            </div>
          ))}
          <div className="logic-node-port">
            <span>{ports.length ? 'Otherwise' : 'Next step'}</span>
            <Handle
              type="source"
              position={Position.Right}
              id="default"
              aria-label="Connect default route"
            />
          </div>
        </div>
      )}
    </>
  )
}
const nodeTypes = { route: RouteNode }

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
  const [liveNodes, setLiveNodes] = useState<Node[]>([])
  const [connectionError, setConnectionError] = useState('')
  const [selectedEdge, setSelectedEdge] = useState<string | null>(null)
  const [flow, setFlow] = useState<ReactFlowInstance | null>(null)
  const [formatRequested, setFormatRequested] = useState(false)
  const [hoveredEdge, setHoveredEdge] = useState<string | null>(null)
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
        handle: `answer:${branch.equals}`,
      })),
      {
        source: q.id,
        target: q.next || questions[i + 1]?.id || '$end',
        label: q.branches.length ? 'Otherwise' : 'Always',
        conditional: false,
        handle: 'default',
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
        type: 'route',
        position: { x: rank * 360, y: lane * 240 },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        data: {
          title: q.title,
          number: q.number,
          question: questions.find((item) => item.id === q.id),
          label: (
            <>
              <span className="logic-node-number">{q.number || '✓'}</span>
              <span>{q.title}</span>
            </>
          ),
        },
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
        sourceHandle: r.handle,
        targetHandle: 'in',
        reconnectable: 'target',
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
  }, [definition])

  // Retain React Flow's measured dimensions and position between renders. Rebuilding
  // nodes on every pointer movement makes them repeatedly hide for measurement.
  useEffect(() => {
    setLiveNodes((previous) =>
      nodes.map((node) => {
        const old = previous.find((item) => item.id === node.id)
        return old ? { ...old, data: node.data, ariaLabel: node.ariaLabel } : node
      }),
    )
  }, [nodes])

  useEffect(() => {
    if (!formatRequested || !flow) return
    const frame = requestAnimationFrame(() => {
      void flow.fitView({
        padding: 0.2,
        maxZoom: 1,
        duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 200,
      })
      setFormatRequested(false)
    })
    return () => cancelAnimationFrame(frame)
  }, [formatRequested, flow, liveNodes])

  function autoFormat() {
    const offsets = new Map<number, number>()
    setLiveNodes((previous) =>
      nodes.map((node) => {
        const old = previous.find((item) => item.id === node.id)
        const column = node.position.x
        const y = offsets.get(column) || 0
        offsets.set(column, y + (old?.measured?.height || 120) + 64)
        return { ...old, ...node, measured: old?.measured, position: { x: column, y } }
      }),
    )
    setSelectedEdge(null)
    setFormatRequested(true)
  }

  const displayEdges = useMemo(
    () =>
      edges.map((edge) => ({
        ...edge,
        label: edge.id === selectedEdge || edge.id === hoveredEdge ? edge.label : undefined,
        selected: edge.id === selectedEdge,
      })),
    [edges, selectedEdge, hoveredEdge],
  )

  const validConnection = useCallback(
    (connection: Connection | Edge) => {
      const source = definition.questions.findIndex((q) => q.id === connection.source)
      const target = definition.questions.findIndex((q) => q.id === connection.target)
      return (
        source >= 0 &&
        (connection.target === '$end' || target > source) &&
        Boolean(connection.sourceHandle)
      )
    },
    [definition.questions],
  )

  function connect(connection: Connection) {
    if (!validConnection(connection)) {
      setConnectionError(
        'Connect to a later question or Finish. Backward routes and loops are not supported.',
      )
      return
    }
    const q = definition.questions.find((q) => q.id === connection.source)!
    setConnectionError('')
    if (connection.sourceHandle === 'default') onChange({ ...q, next: connection.target! })
    else {
      const value = connection.sourceHandle!.slice('answer:'.length)
      const existing = q.branches.findIndex((b) => b.equals === value)
      onChange({
        ...q,
        branches:
          existing < 0
            ? [...q.branches, { equals: value, target: connection.target! }]
            : q.branches.map((b, i) => (i === existing ? { ...b, target: connection.target! } : b)),
      })
    }
  }

  function removeConnection() {
    const edge = edges.find((e) => e.id === selectedEdge)
    const q = definition.questions.find((q) => q.id === edge?.source)
    if (!edge || !q) return
    onChange(
      edge.sourceHandle === 'default'
        ? { ...q, next: '' }
        : { ...q, branches: q.branches.filter((b) => `answer:${b.equals}` !== edge.sourceHandle) },
    )
    setSelectedEdge(null)
  }

  return (
    <section className="logic-workspace">
      <header className="logic-map-header">
        <h1>Question flow</h1>
        <button
          type="button"
          className="button secondary"
          onClick={autoFormat}
          disabled={!liveNodes.length}
        >
          Auto format
        </button>
        <p className="muted">
          Drag from an answer or next-step dot to another question. Drag a line’s endpoint to
          reconnect it. Dashed lines show the default route.
        </p>
      </header>
      {issue && (
        <p role="alert" className="error">
          {issue}
        </p>
      )}
      {connectionError && (
        <p className="error" role="alert">
          {connectionError}
        </p>
      )}
      {selectedEdge && (
        <div className="button-row">
          <button type="button" className="button secondary" onClick={removeConnection}>
            {edges.find((e) => e.id === selectedEdge)?.sourceHandle === 'default'
              ? 'Reset to next question in order'
              : 'Remove selected condition'}
          </button>
          <button type="button" className="button secondary" onClick={() => setSelectedEdge(null)}>
            Cancel
          </button>
        </div>
      )}
      <div className="logic-map-layout">
        <div className="logic-map" aria-label="Question branching map">
          <ReactFlow
            nodes={liveNodes}
            nodeTypes={nodeTypes}
            edges={displayEdges}
            onInit={setFlow}
            fitView
            fitViewOptions={{ maxZoom: 1, padding: 0.25 }}
            minZoom={0.15}
            maxZoom={1.5}
            nodesDraggable
            nodesConnectable
            edgesReconnectable
            isValidConnection={validConnection}
            onConnect={connect}
            onReconnect={(_, connection) => connect(connection)}
            onConnectEnd={(_, state) => {
              if (!state.isValid && state.toNode)
                setConnectionError(
                  'Connect to a later question or Finish. Backward routes and loops are not supported.',
                )
            }}
            deleteKeyCode={null}
            onNodeClick={(_, node) => {
              setSelectedEdge(null)
              if (node.id !== '$end') setSelected(node.id)
            }}
            onEdgeClick={(_, edge) => setSelectedEdge(edge.id)}
            onEdgeMouseEnter={(_, edge) => setHoveredEdge(edge.id)}
            onEdgeMouseLeave={() => setHoveredEdge(null)}
            onPaneClick={() => setSelectedEdge(null)}
            onNodesChange={(changes) => {
              setLiveNodes((previous) => applyNodeChanges(changes, previous))
              for (const change of changes) {
                if (change.type === 'select' && change.selected && change.id !== '$end')
                  setSelected(change.id)
              }
            }}
          >
            <Background gap={28} size={0.7} color="#d5dde8" />
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
