import { app, ipcMain, webContents } from 'electron'
import { Client } from 'pg'
import type {
  ConnectionConfig,
  ConnectionResult,
  QueryResult,
  FieldInfo
} from '../../shared/constants'

// 连接状态变化通知通道
const CONNECTION_STATUS_CHANNEL = 'db:connection:status'

class DatabaseClient {
  private client: Client | null = null
  private isConnecting = false
  private reconnectTimer: NodeJS.Timeout | null = null

  private notifyConnectionLost() {
    // 通知所有渲染进程连接已断开
    webContents.getAllWebContents().forEach(wc => {
      wc.send(CONNECTION_STATUS_CHANNEL, {
        connected: false,
        reason: 'Connection to database was lost'
      })
    })
  }

  async connect(config: ConnectionConfig): Promise<ConnectionResult> {
    if (this.isConnecting) {
      return { success: false, error: 'Connection already in progress' }
    }

    this.isConnecting = true

    try {
      if (this.client) {
        await this.disconnect()
      }

      this.client = new Client({
        host: config.host,
        port: config.port,
        database: config.database,
        user: config.user,
        password: config.password,
        ssl: config.ssl ? { rejectUnauthorized: false } : false,
        connectionTimeoutMillis: 10000,
      })

      this.client.on('error', (err) => {
        console.error('Database connection error:', err.message)
        this.handleConnectionError()
      })

      this.client.on('end', () => {
        console.log('Database connection ended')
        this.handleConnectionError()
      })

      await this.client.connect()

      const result = await this.client.query('SELECT version()')
      const serverVersion = result.rows[0]?.version as string

      // 通知连接成功
      webContents.getAllWebContents().forEach(wc => {
        wc.send(CONNECTION_STATUS_CHANNEL, {
          connected: true,
          serverVersion
        })
      })

      return {
        success: true,
        serverVersion,
      }
    } catch (error) {
      this.client = null
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    } finally {
      this.isConnecting = false
    }
  }

  private handleConnectionError() {
    this.client = null
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this.notifyConnectionLost()
  }

  async disconnect(): Promise<void> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    if (this.client) {
      try {
        this.client.removeAllListeners('error')
        this.client.removeAllListeners('end')
        await this.client.end()
      } catch {
        // 忽略断开连接时的错误
      }
      this.client = null
    }
  }

  async query(sql: string): Promise<QueryResult> {
    if (!this.client || !this.isClientConnected()) {
      return { success: false, error: 'Not connected to database' }
    }

    const startTime = Date.now()

    try {
      const result = await this.client.query(sql)
      const duration = Date.now() - startTime

      const fields: FieldInfo[] = result.fields.map((field) => ({
        name: field.name,
        dataTypeID: field.dataTypeID,
        dataTypeName: this.getDataTypeName(field.dataTypeID),
      }))

      return {
        success: true,
        rows: result.rows,
        fields,
        rowCount: result.rowCount ?? 0,
        duration,
      }
    } catch (error) {
      if (this.isConnectionTerminatedError(error)) {
        this.client = null
        return {
          success: false,
          error: 'Connection to database was lost',
          duration: Date.now() - startTime,
        }
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Query failed',
        duration: Date.now() - startTime,
      }
    }
  }

  private isClientConnected(): boolean {
    return this.client !== null
  }

  private isConnectionTerminatedError(error: unknown): boolean {
    if (!(error instanceof Error)) return false
    const message = error.message.toLowerCase()
    return (
      message.includes('connection terminated') ||
      message.includes('connection reset') ||
      message.includes('socket hang up') ||
      message.includes('ECONNRESET') ||
      message.includes('connection refused') ||
      message.includes('database connection') ||
      message.includes('connection lost')
    )
  }

  isConnected(): boolean {
    return this.client !== null && this.isClientConnected()
  }

  private getDataTypeName(dataTypeID: number): string {
    const typeMap: Record<number, string> = {
      16: 'boolean',
      20: 'bigint',
      21: 'smallint',
      23: 'integer',
      25: 'text',
      700: 'real',
      701: 'double precision',
      1043: 'varchar',
      1082: 'date',
      1114: 'timestamp',
      1184: 'timestamptz',
      2950: 'uuid',
      3802: 'jsonb',
      114: 'json',
    }
    return typeMap[dataTypeID] || `oid:${dataTypeID}`
  }
}

export const databaseClient = new DatabaseClient()
