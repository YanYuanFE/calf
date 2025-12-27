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

export function ResultTable() {
  const { result } = useQueryStore()
  const { connect, config } = useConnectionStore()
  const [isReconnecting, setIsReconnecting] = useState(false)
  const [sorting, setSorting] = useState<SortingState>([])

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

    return result.fields.map((field) => ({
      accessorKey: field.name,
      header: ({ column }) => (
        <Button
          variant="ghost"
          size="sm"
          className="-ml-3 h-8 data-[state=open]:bg-accent"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          {field.name}
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ getValue }) => {
        const value = getValue()
        if (value === null) {
          return <span className="text-[var(--color-muted-foreground)] italic">NULL</span>
        }
        if (typeof value === 'object') {
          return (
            <span className="text-xs font-mono">
              {JSON.stringify(value)}
            </span>
          )
        }
        return String(value)
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
        <div className="min-w-max">
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0 bg-gray-50 z-10">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-4 py-2.5 text-left font-semibold text-[var(--color-foreground)] bg-gray-50 border-b border-gray-200 min-w-[150px]"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
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
                    <td key={cell.id} className="px-4 py-2.5 min-w-[150px] max-w-[400px] truncate">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
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
    </div>
  )
}
