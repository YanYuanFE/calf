import { contextBridge, ipcRenderer } from 'electron'

// IPC 通道常量（与 src/types/ipc.ts 保持同步）
const IPC_CHANNELS = {
  CONNECTION_CONNECT: 'db:connection:connect',
  CONNECTION_DISCONNECT: 'db:connection:disconnect',
  CONNECTION_TEST: 'db:connection:test',
  CONNECTION_STATUS: 'db:connection:status',
  QUERY_EXECUTE: 'db:query:execute',
  QUERY_CANCEL: 'db:query:cancel',
  SCHEMA_SCHEMAS: 'db:schema:schemas',
  SCHEMA_TABLES: 'db:schema:tables',
  SCHEMA_COLUMNS: 'db:schema:columns',
  SCHEMA_FUNCTIONS: 'db:schema:functions',
  DIAGRAM_ERD_DATA: 'db:diagram:erd-data',
  DIAGRAM_TABLE_RELATIONSHIPS: 'db:diagram:table-relationships',
  SCHEMA_GET_DDL: 'db:schema:get-ddl',
} as const

// 更新事件通道
const UPDATE_CHANNELS = [
  'update-available',
  'update-not-available',
  'update-download-progress',
  'update-downloaded',
  'update-error',
] as const

// 暴露安全的 API 到渲染进程
contextBridge.exposeInMainWorld('api', {
  // 连接管理
  connect: (config: unknown) =>
    ipcRenderer.invoke(IPC_CHANNELS.CONNECTION_CONNECT, config),

  disconnect: () =>
    ipcRenderer.invoke(IPC_CHANNELS.CONNECTION_DISCONNECT),

  testConnection: (config: unknown) =>
    ipcRenderer.invoke(IPC_CHANNELS.CONNECTION_TEST, config),

  // 查询执行
  executeQuery: (sql: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.QUERY_EXECUTE, sql),

  cancelQuery: () =>
    ipcRenderer.invoke(IPC_CHANNELS.QUERY_CANCEL),

  // Schema 查询
  getSchemas: () =>
    ipcRenderer.invoke(IPC_CHANNELS.SCHEMA_SCHEMAS),

  getTables: (schema?: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.SCHEMA_TABLES, schema),

  getColumns: (table: string, schema?: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.SCHEMA_COLUMNS, table, schema),

  getFunctions: (schema?: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.SCHEMA_FUNCTIONS, schema),

  // 关系图
  getERDData: (schema: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.DIAGRAM_ERD_DATA, schema),

  getTableRelationships: (tableName: string, schema: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.DIAGRAM_TABLE_RELATIONSHIPS, tableName, schema),

  // DDL
  getTableDDL: (tableName: string, schema: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.SCHEMA_GET_DDL, tableName, schema),

  // 更新检查
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  quitAndInstall: () => ipcRenderer.invoke('quit-and-install'),
})

// 暴露更新事件监听器
contextBridge.exposeInMainWorld('electron', {
  on: (channel: string, listener: (...args: unknown[]) => void) => {
    if (UPDATE_CHANNELS.includes(channel as (typeof UPDATE_CHANNELS)[number])) {
      ipcRenderer.on(channel, listener)
    }
  },
  off: (channel: string, listener: (...args: unknown[]) => void) => {
    if (UPDATE_CHANNELS.includes(channel as (typeof UPDATE_CHANNELS)[number])) {
      ipcRenderer.off(channel, listener)
    }
  },
})
