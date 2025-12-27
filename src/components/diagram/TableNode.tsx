import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import type { ERDNodeData } from '@/types/erd'

type TableNodeType = Node<{ tableName: string; schema: string; columns: ERDNodeData['columns'] }, 'tableNode'>

export function TableNode({ data, selected }: NodeProps<TableNodeType>) {
  const primaryKeys = data.columns.filter((c) => c.isPrimaryKey)
  const regularCols = data.columns.filter((c) => !c.isPrimaryKey)
  const displayColumns = [...primaryKeys, ...regularCols].slice(0, 10)
  const hasMore = data.columns.length > 10

  return (
    <div
      className={`
        min-w-[180px] bg-white rounded-lg border shadow-sm overflow-hidden
        transition-all duration-200
        ${selected ? 'border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/20' : 'border-gray-200'}
      `}
    >
      <Handle type="target" position={Position.Left} className="!w-2 !h-2 !bg-gray-400" />

      <div className="bg-gray-50 px-3 py-2 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-[var(--color-postgres-blue)]/10 flex items-center justify-center">
            <span className="text-[10px] font-bold text-[var(--color-postgres-blue)]">
              {data.tableName.charAt(0).toUpperCase()}
            </span>
          </div>
          <span className="font-semibold text-sm text-gray-800 truncate max-w-[120px]">
            {data.tableName}
          </span>
        </div>
      </div>

      <div className="px-3 py-1.5 space-y-0.5 max-h-[200px] overflow-y-auto">
        {displayColumns.map((col) => (
          <div key={col.name} className="flex items-center gap-2 text-xs">
            <span className="text-gray-400 w-4 text-center">
              {col.isPrimaryKey ? '🔑' : col.isForeignKey ? '🔗' : ''}
            </span>
            <span className={col.isPrimaryKey ? 'font-medium text-gray-700' : 'text-gray-600'}>
              {col.name}
            </span>
            <span className="text-gray-400 text-[10px] ml-auto shrink-0">
              {col.dataType}
            </span>
          </div>
        ))}
        {hasMore && (
          <div className="text-xs text-gray-400 text-center py-1">
            +{data.columns.length - 10} more
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Right} className="!w-2 !h-2 !bg-gray-400" />
    </div>
  )
}
