import { useEffect, useState } from 'react'
import { useSchemaStore } from '@/stores/schemaStore'
import { useQueryStore } from '@/stores/queryStore'
import { useConnectionStore } from '@/stores/connectionStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/toaster'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import {
  ChevronRight,
  ChevronDown,
  Table,
  Eye,
  FunctionSquare,
  RefreshCw,
  Columns,
  Key,
  Play,
  FileText,
  Copy,
  Trash2,
  AlertTriangle,
  Database,
} from 'lucide-react'
import type { ColumnInfo } from '@/types/database'

interface TreeNode {
  id: string
  name: string
  type: 'schema' | 'folder' | 'table' | 'view' | 'function' | 'column'
  schema?: string
  children?: TreeNode[]
  isExpanded?: boolean
  isPrimaryKey?: boolean
  dataType?: string
}

interface ConfirmDialogState {
  visible: boolean
  type: 'truncate' | 'drop' | null
  tableName: string
  schema: string
}

export function SchemaTree() {
  const { tables, functions, isLoading, refresh } = useSchemaStore()
  const { setSql, execute } = useQueryStore()
  const { status } = useConnectionStore()
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(
    new Set(['tables', 'views'])
  )
  const [tableColumns, setTableColumns] = useState<Record<string, ColumnInfo[]>>(
    {}
  )
  
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    visible: false,
    type: null,
    tableName: '',
    schema: '',
  })
  const [confirmInput, setConfirmInput] = useState('')

  useEffect(() => {
    if (status === 'connected') {
      refresh()
    }
  }, [status, refresh])

  

  const toggleNode = async (nodeId: string, nodeType: string, tableName?: string) => {
    const newExpanded = new Set(expandedNodes)

    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId)
    } else {
      newExpanded.add(nodeId)

      // 如果是表节点，加载列信息
      if (nodeType === 'table' && tableName && !tableColumns[tableName]) {
        const columns = await useSchemaStore.getState().loadColumns(tableName)
        setTableColumns((prev) => ({ ...prev, [tableName]: columns }))
      }
    }

    setExpandedNodes(newExpanded)
  }

  

const handleViewData = (tableName: string, schema: string = 'public') => {
    const sql = `SELECT * FROM "${schema}"."${tableName}" LIMIT 100;`
    setSql(sql)
    execute()
  }

  const handleViewStructure = async (tableName: string) => {
    const sql = `SELECT
  column_name as "Column",
  data_type as "Type",
  is_nullable as "Nullable",
  column_default as "Default"
 FROM information_schema.columns
 WHERE table_name = '${tableName}'
 ORDER BY ordinal_position;`
    setSql(sql)
    execute()
  }

  const handleCopyName = (name: string) => {
    navigator.clipboard.writeText(name)
    toast.success(`"${name}" copied to clipboard`)
  }

  const handleGenerateSelect = (tableName: string, schema: string = 'public') => {
    const sql = `SELECT * FROM "${schema}"."${tableName}" WHERE 1=1;`
    setSql(sql)
  }

  const handleShowDDL = async (tableName: string, schema?: string) => {
    const schemaParam = schema && schema.length > 0 ? schema : 'public'
    const result = await window.api.getTableDDL(tableName, schemaParam)
    if (result.success && result.ddl) {
      setSql(result.ddl)
    }
  }

  const handleTruncateTable = (tableName: string, schema: string = 'public') => {
    setConfirmDialog({
      visible: true,
      type: 'truncate',
      tableName,
      schema,
    })
    setConfirmInput('')
  }

  const handleDropTable = (tableName: string, schema: string = 'public') => {
    setConfirmDialog({
      visible: true,
      type: 'drop',
      tableName,
      schema,
    })
    setConfirmInput('')
  }

  const executeConfirmedAction = async () => {
    if (confirmInput !== confirmDialog.tableName) return

    const { type, tableName, schema } = confirmDialog
    let sql = ''

    if (type === 'truncate') {
      sql = `TRUNCATE TABLE "${schema}"."${tableName}";`
    } else if (type === 'drop') {
      sql = `DROP TABLE "${schema}"."${tableName}";`
    }

    setSql(sql)
    await execute()

    setConfirmDialog({ visible: false, type: null, tableName: '', schema: '' })
    setConfirmInput('')

    // 刷新 schema
    setTimeout(() => refresh(), 500)
  }

  const closeConfirmDialog = () => {
    setConfirmDialog({ visible: false, type: null, tableName: '', schema: '' })
    setConfirmInput('')
  }

  const tableNodes = tables.filter((t) => t.type === 'table')
  const viewNodes = tables.filter((t) => t.type === 'view')

  const renderTreeNode = (node: TreeNode, depth: number = 0) => {
    const hasChildren = node.children && node.children.length > 0
    const isExpanded = expandedNodes.has(node.id)
    const paddingLeft = depth * 16 + 8

    const getIcon = () => {
      switch (node.type) {
        case 'table':
          return <Table className="h-4 w-4 text-[var(--color-postgres-blue)]" />
        case 'view':
          return <Eye className="h-4 w-4 text-[var(--color-postgres-green)]" />
        case 'function':
          return <FunctionSquare className="h-4 w-4 text-[var(--color-postgres-purple)]" />
        case 'column':
          return node.isPrimaryKey ? (
            <Key className="h-4 w-4 text-[var(--color-postgres-orange)]" />
          ) : (
            <Columns className="h-4 w-4 text-[var(--color-muted-foreground)]" />
          )
        default:
          return null
      }
    }

    return (
      <div key={node.id} className="animate-fadeIn">
        <ContextMenu>
          <ContextMenuTrigger asChild>
            <div
              className={`flex items-center gap-2 py-1.5 px-3 hover:bg-gray-100 cursor-pointer text-sm rounded-md transition-colors ${
                node.type === 'folder' ? 'font-medium' : ''
              }`}
              style={{ paddingLeft }}
              onClick={() => toggleNode(node.id, node.type, node.name)}
            >
              {hasChildren || node.type === 'table' ? (
                isExpanded ? (
                  <ChevronDown className="h-4 w-4 shrink-0 text-[var(--color-muted-foreground)] transition-transform" />
                ) : (
                  <ChevronRight className="h-4 w-4 shrink-0 text-[var(--color-muted-foreground)] transition-transform" />
                )
              ) : (
                <span className="w-4" />
              )}
              <div className="flex items-center gap-2 flex-1">
                {getIcon()}
                <span className="truncate select-none">{node.name}</span>
              </div>
              {node.dataType && (
                <span className="text-xs text-[var(--color-muted-foreground)] font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                  {node.dataType}
                </span>
              )}
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent>
            {(node.type === 'table' || node.type === 'view') && (
              <>
                <ContextMenuItem onClick={() => handleViewData(node.name, node.schema)}>
                  <Play className="mr-2 h-4 w-4" />
                  View Data (Top 100)
                </ContextMenuItem>
                <ContextMenuItem onClick={() => handleViewStructure(node.name)}>
                  <FileText className="mr-2 h-4 w-4" />
                  View Structure
                </ContextMenuItem>
                <ContextMenuItem onClick={() => handleGenerateSelect(node.name, node.schema)}>
                  <FileText className="mr-2 h-4 w-4" />
                  Generate SELECT
                </ContextMenuItem>
                <ContextMenuItem onClick={() => handleShowDDL(node.name, node.schema)}>
                  <FileText className="mr-2 h-4 w-4" />
                  Show Create Table
                </ContextMenuItem>
                <ContextMenuSeparator />
              </>
            )}
            <ContextMenuItem onClick={() => handleCopyName(node.name)}>
              <Copy className="mr-2 h-4 w-4" />
              Copy Name
            </ContextMenuItem>
            {node.type === 'table' && (
              <>
                <ContextMenuSeparator />
                <ContextMenuItem 
                  className="text-[var(--color-warning)]" 
                  onClick={() => handleTruncateTable(node.name, node.schema)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Truncate Table
                </ContextMenuItem>
                <ContextMenuItem 
                  className="text-[var(--color-destructive)]" 
                  onClick={() => handleDropTable(node.name, node.schema)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Drop Table
                </ContextMenuItem>
              </>
            )}
          </ContextMenuContent>
        </ContextMenu>
        {isExpanded && hasChildren && (
          <div>
            {node.children!.map((child) => renderTreeNode(child, depth + 1))}
          </div>
        )}
        {isExpanded && node.type === 'table' && tableColumns[node.name] && (
          <div>
            {tableColumns[node.name].map((col) =>
              renderTreeNode(
                {
                  id: `${node.id}-${col.name}`,
                  name: col.name,
                  type: 'column',
                  isPrimaryKey: col.isPrimaryKey,
                  dataType: col.dataType,
                },
                depth + 1
              )
            )}
          </div>
        )}
      </div>
    )
  }

  if (status !== 'connected') {
    return (
      <div className="flex h-full flex-col items-center justify-center text-[var(--color-muted-foreground)] text-sm p-6 text-center">
        <div className="h-12 w-12 rounded-full bg-gray-50 flex items-center justify-center mb-4">
          <Database className="h-6 w-6 text-[var(--color-muted-foreground)]" />
        </div>
        <p className="font-medium text-[var(--color-foreground)] mb-1">No Database Connection</p>
        <p className="text-xs">Connect to a database to browse schema</p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-[var(--color-postgres-blue)]" />
          <span className="text-sm font-semibold text-[var(--color-foreground)] tracking-tight">Schema</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 hover:bg-gray-100"
          onClick={refresh}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 text-[var(--color-muted-foreground)] ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>
      <div className="flex-1 overflow-auto px-2 py-2">
        <div className="space-y-0.5">
          <div>
            <div
              className="flex items-center gap-2 py-2 px-3 hover:bg-gray-100 cursor-pointer text-sm font-medium rounded-lg transition-colors"
              onClick={() => toggleNode('tables', 'folder')}
            >
              {expandedNodes.has('tables') ? (
                <ChevronDown className="h-4 w-4 text-[var(--color-muted-foreground)] transition-transform" />
              ) : (
                <ChevronRight className="h-4 w-4 text-[var(--color-muted-foreground)] transition-transform" />
              )}
              <Table className="h-4 w-4 text-[var(--color-postgres-blue)]" />
              <span>Tables</span>
              <span className="ml-auto text-xs text-[var(--color-muted-foreground)]">
                {tableNodes.length}
              </span>
            </div>
            {expandedNodes.has('tables') &&
              tableNodes.map((table) =>
                renderTreeNode(
                  {
                    id: `table-${table.name}`,
                    name: table.name,
                    type: 'table',
                    schema: table.schema,
                  },
                  1
                )
              )}
          </div>

          <div>
            <div
              className="flex items-center gap-2 py-2 px-3 hover:bg-gray-100 cursor-pointer text-sm font-medium rounded-lg transition-colors"
              onClick={() => toggleNode('views', 'folder')}
            >
              {expandedNodes.has('views') ? (
                <ChevronDown className="h-4 w-4 text-[var(--color-muted-foreground)] transition-transform" />
              ) : (
                <ChevronRight className="h-4 w-4 text-[var(--color-muted-foreground)] transition-transform" />
              )}
              <Eye className="h-4 w-4 text-[var(--color-postgres-green)]" />
              <span>Views</span>
              <span className="ml-auto text-xs text-[var(--color-muted-foreground)]">
                {viewNodes.length}
              </span>
            </div>
            {expandedNodes.has('views') &&
              viewNodes.map((view) =>
                renderTreeNode(
                  {
                    id: `view-${view.name}`,
                    name: view.name,
                    type: 'view',
                    schema: view.schema,
                  },
                  1
                )
              )}
          </div>

          <div>
            <div
              className="flex items-center gap-2 py-2 px-3 hover:bg-gray-100 cursor-pointer text-sm font-medium rounded-lg transition-colors"
              onClick={() => toggleNode('functions', 'folder')}
            >
              {expandedNodes.has('functions') ? (
                <ChevronDown className="h-4 w-4 text-[var(--color-muted-foreground)] transition-transform" />
              ) : (
                <ChevronRight className="h-4 w-4 text-[var(--color-muted-foreground)] transition-transform" />
              )}
              <FunctionSquare className="h-4 w-4 text-[var(--color-postgres-purple)]" />
              <span>Functions</span>
              <span className="ml-auto text-xs text-[var(--color-muted-foreground)]">
                {functions.length}
              </span>
            </div>
            {expandedNodes.has('functions') &&
              functions.map((func) =>
                renderTreeNode(
                  {
                    id: `func-${func.name}`,
                    name: func.name,
                    type: 'function',
                    schema: func.schema,
                  },
                  1
                )
              )}
          </div>
        </div>
      </div>

      

      {/* Confirm Dialog */}
      {confirmDialog.visible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="w-full max-w-md rounded-xl bg-white border border-gray-200 p-6 shadow-lg">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="h-5 w-5 text-[var(--color-destructive)]" />
              <h3 className="text-lg font-semibold text-[var(--color-foreground)]">
                {confirmDialog.type === 'truncate' ? 'Truncate Table' : 'Drop Table'}
              </h3>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-[var(--color-muted-foreground)]">
                {confirmDialog.type === 'truncate' ? (
                  <>
                    This will permanently delete <strong>all data</strong> in the table{' '}
                    <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm">{confirmDialog.tableName}</code>.
                    The table structure will be preserved.
                  </>
                ) : (
                  <>
                    This will permanently delete the table{' '}
                    <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm">{confirmDialog.tableName}</code>{' '}
                    and <strong>all its data</strong>. This action cannot be undone.
                  </>
                )}
              </p>

              <div>
                <label className="text-sm font-medium mb-1.5 block text-[var(--color-foreground)]">
                  Type <code className="bg-gray-100 px-1 py-0.5 rounded text-sm">{confirmDialog.tableName}</code> to confirm:
                </label>
                <Input
                  value={confirmInput}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmInput(e.target.value)}
                  placeholder={confirmDialog.tableName}
                  className="font-mono text-sm"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={closeConfirmDialog}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={executeConfirmedAction}
                disabled={confirmInput !== confirmDialog.tableName}
              >
                {confirmDialog.type === 'truncate' ? 'Truncate' : 'Drop'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
