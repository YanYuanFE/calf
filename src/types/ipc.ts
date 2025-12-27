import type {
  ConnectionConfig,
  ConnectionResult,
  TestResult,
  QueryResult,
  TableInfo,
  ColumnInfo,
  FunctionInfo,
  SchemaInfo
} from './database'
import type { ERDData, TableRelationship } from './erd'

// IPC 通道定义
export const IPC_CHANNELS = {
  // 连接管理
  CONNECTION_CONNECT: 'db:connection:connect',
  CONNECTION_DISCONNECT: 'db:connection:disconnect',
  CONNECTION_TEST: 'db:connection:test',
  CONNECTION_STATUS: 'db:connection:status',

  // 查询执行
  QUERY_EXECUTE: 'db:query:execute',
  QUERY_CANCEL: 'db:query:cancel',

  // Schema 查询
  SCHEMA_SCHEMAS: 'db:schema:schemas',
  SCHEMA_TABLES: 'db:schema:tables',
  SCHEMA_COLUMNS: 'db:schema:columns',
  SCHEMA_FUNCTIONS: 'db:schema:functions',

  // 关系图
  DIAGRAM_ERD_DATA: 'db:diagram:erd-data',
  DIAGRAM_TABLE_RELATIONSHIPS: 'db:diagram:table-relationships',

  // DDL
  SCHEMA_GET_DDL: 'db:schema:get-ddl',
} as const

// IPC API 类型定义
export interface IpcApi {
  // 连接管理
  connect: (config: ConnectionConfig) => Promise<ConnectionResult>
  disconnect: () => Promise<void>
  testConnection: (config: ConnectionConfig) => Promise<TestResult>

  // 查询执行
  executeQuery: (sql: string) => Promise<QueryResult>
  cancelQuery: () => Promise<void>

  // Schema 查询
  getSchemas: () => Promise<SchemaInfo[]>
  getTables: (schema?: string) => Promise<TableInfo[]>
  getColumns: (table: string, schema?: string) => Promise<ColumnInfo[]>
  getFunctions: (schema?: string) => Promise<FunctionInfo[]>

  // 关系图
  getERDData: (schema: string) => Promise<{ success: boolean; data?: ERDData; error?: string }>
  getTableRelationships: (tableName: string, schema: string) => Promise<{ success: boolean; relationships?: TableRelationship[]; error?: string }>

  // DDL
  getTableDDL: (tableName: string, schema: string) => Promise<{ success: boolean; ddl?: string; error?: string }>

  // 更新检查
  checkForUpdates: () => Promise<void>
  quitAndInstall: () => Promise<void>
}

// 扩展 Window 接口
declare global {
  interface Window {
    api: IpcApi
  }
}
