import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  useReactFlow,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeTypes,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import dagre from 'dagre'
import { useConnectionStore } from '@/stores/connectionStore'
import { useDiagramStore } from '@/stores/diagramStore'
import { DiagramToolbar } from './DiagramToolbar'
import { TableDetailsPanel } from './TableDetailsPanel'
import type { ERDTable, TableRelationship, ERDTableColumn } from '@/types/erd'
import { Loader2, Database } from 'lucide-react'

import { TableNode } from './TableNode'

type TableNodeData = {
  tableName: string
  schema: string
  columns: ERDTableColumn[]
}

type TableNodeType = Node<TableNodeData, 'tableNode'>

const nodeTypes: NodeTypes = {
  tableNode: TableNode,
}

function layoutDiagram(tables: ERDTable[], relationships: TableRelationship[]) {
  const g = new dagre.graphlib.Graph()
  g.setGraph({ rankdir: 'LR', nodesep: 60, ranksep: 150 })
  g.setDefaultEdgeLabel(() => ({}))

  tables.forEach((table) => {
    const width = 200
    const height = Math.max(80, 60 + table.columns.length * 24)
    g.setNode(table.name, { width, height })
  })

  relationships.forEach((rel) => {
    g.setEdge(rel.targetTable, rel.sourceTable)
  })

  dagre.layout(g)

  return tables.map((table) => ({
    ...table,
    position: {
      x: g.node(table.name).x - g.node(table.name).width / 2,
      y: g.node(table.name).y - g.node(table.name).height / 2,
    },
  }))
}

function ERDiagramContent() {
  const { status } = useConnectionStore()
  const { data, selectedTable, setSelectedTable, loadDiagramData, isLoading, error } = useDiagramStore()

  const [localNodes, setLocalNodes, onNodesChange] = useNodesState<TableNodeType>([])
  const [localEdges, setLocalEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [showDetails, setShowDetails] = useState(false)

  const { initialNodes, initialEdges } = useMemo(() => {
    if (!data) return { initialNodes: [], initialEdges: [] }

    const layoutedTables = layoutDiagram(data.tables, data.relationships)

    const flowNodes: Node<{ tableName: string; schema: string; columns: ERDTableColumn[] }, 'tableNode'>[] = layoutedTables.map((table) => ({
      id: table.name,
      type: 'tableNode',
      position: table.position,
      data: {
        tableName: table.name,
        schema: table.schema,
        columns: table.columns,
      },
    }))

    const flowEdges: Edge[] = data.relationships.map((rel, index) => ({
      id: `edge-${index}`,
      source: rel.targetTable,
      target: rel.sourceTable,
      type: 'default',
      animated: true,
      selected: false,
      style: { stroke: '#336791', strokeWidth: 2 },
    }))

    return { initialNodes: flowNodes, initialEdges: flowEdges }
  }, [data])

  useEffect(() => {
    if (status === 'connected') {
      loadDiagramData('public')
    }
  }, [status])

  const { fitView } = useReactFlow()

  useEffect(() => {
    setLocalNodes(initialNodes)
    setLocalEdges(initialEdges)
  }, [initialNodes, initialEdges, data])

  useEffect(() => {
    if (localNodes.length > 0) {
      console.log('MiniMap nodes available:', localNodes.length)
    }
  }, [localNodes])

  useEffect(() => {
    if (localNodes.length > 0) {
      fitView({ duration: 300 })
    }
  }, [localNodes, fitView])

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      setSelectedTable(node.id)
      setShowDetails(true)
    },
    [setSelectedTable]
  )

  const onPaneClick = useCallback(() => {
    setSelectedTable(null)
    setShowDetails(false)
  }, [setSelectedTable])

  const onInit = useCallback((instance: unknown) => {
    console.log('ReactFlow initialized', instance)
  }, [])

  if (status !== 'connected') {
    return (
      <div className="flex items-center justify-center h-full text-[var(--color-muted-foreground)]">
        <div className="text-center">
          <div className="h-16 w-16 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center mx-auto mb-4">
            <Database className="h-8 w-8 text-gray-400" />
          </div>
          <p className="font-medium text-[var(--color-foreground)] mb-1">No Database Connection</p>
          <p className="text-sm">Connect to a database to view ER diagram</p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)] mx-auto mb-4" />
          <p className="text-sm text-[var(--color-muted-foreground)]">Loading diagram...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="h-16 w-16 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center mx-auto mb-4">
            <Database className="h-8 w-8 text-red-400" />
          </div>
          <p className="font-medium text-red-600 mb-1">Failed to load diagram</p>
          <p className="text-sm text-[var(--color-muted-foreground)]">{error}</p>
        </div>
      </div>
    )
  }

  if (!data || data.tables.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-[var(--color-muted-foreground)]">
        <div className="text-center">
          <div className="h-16 w-16 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center mx-auto mb-4">
            <Database className="h-8 w-8 text-gray-400" />
          </div>
          <p className="font-medium text-[var(--color-foreground)] mb-1">No tables found</p>
          <p className="text-sm">This database has no tables to display</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full w-full min-h-0 relative">
      <div className="flex-1 relative min-w-0 overflow-hidden">
        <ReactFlow
          nodes={localNodes}
          edges={localEdges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          onInit={onInit}
          fitView
          minZoom={0.1}
          maxZoom={2}
          fitViewOptions={{ padding: 0.2 }}
          attributionPosition="bottom-left"
        >
          <Background />
          <Controls />
          <MiniMap
            nodeColor={(_node: Node) => '#3b82f6'}
            nodeStrokeWidth={2}
            maskColor="rgba(0, 0, 0, 0.1)"
            className="!bg-white !border !border-gray-200 !shadow-lg"
            style={{ width: 200, height: 150 }}
          />
        </ReactFlow>

        <div className="absolute top-4 right-4 z-10">
          <DiagramToolbar />
        </div>
      </div>

      {showDetails && selectedTable && (
        <TableDetailsPanel
          tableName={selectedTable}
          onClose={() => setShowDetails(false)}
        />
      )}
    </div>
  )
}

export function ERDiagram() {
  return (
    <ReactFlowProvider>
      <ERDiagramContent />
    </ReactFlowProvider>
  )
}
