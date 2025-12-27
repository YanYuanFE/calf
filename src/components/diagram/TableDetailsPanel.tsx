import { Button } from '@/components/ui/button'
import { X, Play, FileText, Copy, Database } from 'lucide-react'
import { useDiagramStore } from '@/stores/diagramStore'
import { toast } from '@/components/ui/toaster'

interface TableDetailsPanelProps {
  tableName: string
  onClose: () => void
}

export function TableDetailsPanel({ tableName, onClose }: TableDetailsPanelProps) {
  const { data } = useDiagramStore()
  const table = data?.tables.find((t) => t.name === tableName)

  const handleViewData = () => {
    const sql = `SELECT * FROM "public"."${tableName}" LIMIT 100;`
    navigator.clipboard.writeText(sql)
    toast.success('Query copied to clipboard')
  }

  const handleViewStructure = () => {
    const sql = `SELECT
  column_name as "Column",
  data_type as "Type",
  is_nullable as "Nullable",
  column_default as "Default"
FROM information_schema.columns
WHERE table_name = '${tableName}'
ORDER BY ordinal_position;`
    navigator.clipboard.writeText(sql)
    toast.success('Query copied to clipboard')
  }

  const handleCopyName = () => {
    navigator.clipboard.writeText(tableName)
    toast.success(`"${tableName}" copied to clipboard`)
  }

  return (
    <div className="w-80 border-l border-gray-200 bg-white flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-[var(--color-postgres-blue)]" />
          <span className="font-semibold text-sm truncate max-w-[150px]">{tableName}</span>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Columns ({table?.columns.length || 0})
          </h3>
          {table && table.columns.length > 0 ? (
            <div className="space-y-1">
              {table.columns.map((col) => (
                <div key={col.name} className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-gray-50 text-sm">
                  <span className="w-4 text-center">
                    {col.isPrimaryKey ? '🔑' : col.isForeignKey ? '🔗' : ''}
                  </span>
                  <span className="font-medium text-gray-700 truncate">{col.name}</span>
                  <span className="text-xs text-gray-400 ml-auto shrink-0">{col.dataType}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No columns found</p>
          )}
        </div>
      </div>

      <div className="p-4 border-t border-gray-100 space-y-2">
        <Button className="w-full" size="sm" onClick={handleViewData}>
          <Play className="h-4 w-4 mr-2" />
          View Data
        </Button>
        <Button variant="outline" className="w-full" size="sm" onClick={handleViewStructure}>
          <FileText className="h-4 w-4 mr-2" />
          View Structure
        </Button>
        <Button variant="outline" className="w-full" size="sm" onClick={handleCopyName}>
          <Copy className="h-4 w-4 mr-2" />
          Copy Name
        </Button>
      </div>
    </div>
  )
}
