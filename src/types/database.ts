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

// 连接状态
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

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

// 数据库对象类型
export interface DatabaseObject {
  name: string
  schema: string
}

// 表信息
export interface TableInfo extends DatabaseObject {
  type: 'table' | 'view'
  rowCount?: number
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
export interface FunctionInfo extends DatabaseObject {
  returnType: string
  arguments: string
}

// Schema 信息
export interface SchemaInfo {
  name: string
  owner: string
}

// 查询历史记录
export interface QueryHistoryItem {
  id: string
  sql: string
  executedAt: Date
  duration?: number
  rowCount?: number
  error?: string
}
