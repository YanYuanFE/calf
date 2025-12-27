import { useMemo, useState } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import { useQueryStore } from '@/stores/queryStore'
import { useConnectionStore } from '@/stores/connectionStore'
import type { FieldInfo } from '@/types/database'
import { Button } from '@/components/ui/button'
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  FileText,
  AlertTriangle,
  Wifi,
  Loader2,
} from 'lucide-react'

interface CellModalProps {
  value: string
  fieldName: string
  onClose: () => void
}

function CellModal({ value, fieldName, onClose }: CellModalProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 shrink-0">
          <div>
            <h3 className="font-semibold text-gray-900">{fieldName}</h3>
            <p className="text-xs text-gray-500">点击单元格查看完整内容</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded"
            >
              {copied ? '已复制' : '复制'}
            </button>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
              ✕
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-4 min-h-[200px]">
          <pre className="bg-gray-50 p-4 rounded-lg text-sm font-mono whitespace-pre-wrap break-word">
            {value}
          </pre>
        </div>
      </div>
    </div>
  )
}

export function ResultTable() {
  const { result } = useQueryStore()
  const { connect, config } = useConnectionStore()
  const [isReconnecting, setIsReconnecting] = useState(false)
  const [sorting, setSorting] = useState<SortingState>([])
  const [modalInfo, setModalInfo] = useState<{ value: string; fieldName: string } | null>(null)

  const isConnectionError = useMemo(() => {
    if (!result?.error) return false
    const errorLower = result.error.toLowerCase()
    return (
      errorLower.includes('not connected') ||
      errorLower.includes('connection') ||
      errorLower.includes('database connection')
    )
  }, [result?.error])

  const handleReconnect = async () => {
    if (!config) return
    setIsReconnecting(true)
    try {
      await connect(config)
    } finally {
      setIsReconnecting(false)
    }
  }

  const columns = useMemo<ColumnDef<Record<string, unknown>>[]>(() => {
    if (!result?.fields) return []

    return result.fields.map((field: FieldInfo) => ({
      accessorKey: field.name,
      header: ({ column }: { column: { toggleSorting: (asc?: boolean) => void; getIsSorted: () => string | false } }) => (
        <button
          className="flex items-center gap-1 hover:bg-gray-100 rounded px-1 -ml-1 py-0.5 text-xs font-semibold"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          <span className="truncate max-w-[80px]">{field.name}</span>
          <ArrowUpDown className="h-3 w-3 text-gray-400 flex-shrink-0" />
        </button>
      ),
      cell: ({ getValue }: { getValue: () => unknown }) => {
        const value = getValue()
        const displayValue = value === null 
          ? 'NULL' 
          : typeof value === 'object' 
            ? JSON.stringify(value) 
            : String(value)
        
        const handleClick = () => {
          if (value !== null) {
            setModalInfo({ value: displayValue, fieldName: field.name })
          }
        }

        if (value === null) {
          return <span className="text-[var(--color-muted-foreground)] italic">NULL</span>
        }
        
        const isLong = displayValue.length > 100

        return (
          <div 
            onClick={handleClick}
            className={`cursor-pointer hover:bg-gray-100 rounded px-1 -mx-1 py-0.5 ${isLong ? 'text-[var(--color-muted-foreground)]' : ''}`}
            title={displayValue}
          >
            {isLong ? displayValue.slice(0, 100) + '...' : displayValue}
          </div>
        )
      },
    }))
  }, [result?.fields])

  const table = useReactTable({
    data: result?.rows ?? [],
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize: 50 },
    },
  })

  if (!result) {
    return (
      <div className="flex h-full items-center justify-center text-[var(--color-muted-foreground)]">
        <div className="text-center">
          <div className="h-16 w-16 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center mx-auto mb-4">
            <FileText className="h-8 w-8 text-[var(--color-muted-foreground)]" />
          </div>
          <p className="font-medium text-[var(--color-foreground)] mb-1">No Query Results</p>
          <p className="text-sm">Execute a query to see results</p>
        </div>
      </div>
    )
  }

  if (!result.success) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="rounded-xl bg-red-50 border border-red-200 p-6 text-[var(--color-error)] max-w-md text-center">
          <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <p className="font-semibold text-lg mb-2">Query Error</p>
          <p className="text-sm opacity-80 mb-4">{result.error}</p>
          {isConnectionError && config && (
            <Button
              onClick={handleReconnect}
              disabled={isReconnecting}
              className="bg-[var(--color-postgres-blue)] hover:bg-[var(--color-postgres-blue)]/90 text-white"
            >
              {isReconnecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Reconnecting...
                </>
              ) : (
                <>
                  <Wifi className="mr-2 h-4 w-4" />
                  Reconnect
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    )
  }

  if (!result.rows?.length) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-[var(--color-muted-foreground)]">
        <div className="text-center">
          <div className="h-16 w-16 rounded-xl bg-green-50 border border-green-200 flex items-center justify-center mx-auto mb-4">
            <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
              <div className="h-2 w-2 rounded-full bg-green-500" />
            </div>
          </div>
          <p className="font-medium text-[var(--color-foreground)] mb-1">Query Executed Successfully</p>
          <div className="text-sm opacity-80">
            <p>{result.rowCount} row(s) affected</p>
            <p className="text-xs mt-1 font-mono">{result.duration}ms</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex-1 overflow-auto">
        <div className="min-w-0">
          <table className="w-full text-sm border-collapse table-fixed">
            <colgroup>
              {result.fields?.map((_: FieldInfo, i: number) => (
                <col key={i} className="min-w-[120px] max-w-[300px]" />
              ))}
            </colgroup>
            <thead className="sticky top-0 bg-gray-50 z-10">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-4 py-2.5 text-left font-semibold text-[var(--color-foreground)] bg-gray-50 border-b border-gray-200 max-w-[300px] overflow-hidden"
                    >
                      <div className="truncate" title={header.column.columnDef.header as string}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </div>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row, index) => (
                <tr
                  key={row.id}
                  className={`border-b border-gray-100 hover:bg-gray-50 ${
                    index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                  }`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-2.5 max-w-[300px] overflow-hidden">
                      <div className="min-w-0">
                        <div className="truncate" title={String(flexRender(cell.column.columnDef.cell, cell.getContext()) ?? '')}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </div>
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-gray-200 px-6 py-2.5 bg-white shrink-0">
        <div className="text-sm text-[var(--color-muted-foreground)]">
          <span className="font-medium text-[var(--color-foreground)]">{result.rowCount}</span> row(s) •{' '}
          <span className="font-mono text-xs">{result.duration}ms</span>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-gray-100"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-gray-100"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium text-[var(--color-foreground)] min-w-[60px] text-center px-2">
            {table.getState().pagination.pageIndex + 1}/{table.getPageCount()}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-gray-100"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-gray-100"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {modalInfo && (
        <CellModal
          value={modalInfo.value}
          fieldName={modalInfo.fieldName}
          onClose={() => setModalInfo(null)}
        />
      )}
    </div>
  )
}
