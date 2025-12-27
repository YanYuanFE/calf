import { getBezierPath, type Edge } from '@xyflow/react'

type RelationshipEdgeType = Edge<{ sourceColumn: string; targetColumn: string }, 'relationshipEdge'>

interface RelationshipEdgeProps {
  id: string
  sourceX: number
  sourceY: number
  targetX: number
  targetY: number
  selected?: boolean
  data?: RelationshipEdgeType['data']
}

export function RelationshipEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  selected,
}: RelationshipEdgeProps) {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  })

  return (
    <>
      <path
        d={edgePath}
        fill="none"
        stroke={selected ? '#336791' : '#9ca3af'}
        strokeWidth={selected ? 2 : 1.5}
        className="transition-all duration-200"
      />
      <circle
        cx={sourceX}
        cy={sourceY}
        r={3}
        fill="#336791"
      />
      <circle
        cx={targetX}
        cy={targetY}
        r={3}
        fill="#336791"
      />
    </>
  )
}
