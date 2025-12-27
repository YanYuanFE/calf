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

// 连接配置
export interface ConnectionConfig {
  host: string
  port: number
  database: string
  user: string
  password: string
  ssl?: boolean
}

// 连接结果
export interface ConnectionResult {
  success: boolean
  error?: string
  serverVersion?: string
}

// 测试连接结果
export interface TestResult {
  success: boolean
  error?: string
  latency?: number
}

// 查询结果
export interface QueryResult {
  success: boolean
  rows?: Record<string, unknown>[]
  fields?: FieldInfo[]
  rowCount?: number
  duration?: number
  error?: string
}

// 字段信息
export interface FieldInfo {
  name: string
  dataTypeID: number
  dataTypeName: string
}

// Schema 信息
export interface SchemaInfo {
  name: string
  owner: string
}

// 表信息
export interface TableInfo {
  name: string
  schema: string
  type: 'table' | 'view'
}

// 列信息
export interface ColumnInfo {
  name: string
  dataType: string
  nullable: boolean
  defaultValue: string | null
  isPrimaryKey: boolean
}

// 函数信息
export interface FunctionInfo {
  name: string
  schema: string
  returnType: string
  arguments: string
}

// 表关系信息
export interface TableRelationship {
  constraintName: string
  sourceTable: string
  sourceColumn: string
  targetTable: string
  targetColumn: string
  onDelete: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION'
  onUpdate: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION'
}

// DDL 结果
export interface DDLResult {
  success: boolean
  ddl?: string
  error?: string
}
