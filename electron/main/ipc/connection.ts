import { ipcMain } from 'electron'
import { Client } from 'pg'
import { databaseClient } from '../database/client'
import {
  IPC_CHANNELS,
  type ConnectionConfig,
  type ConnectionResult,
  type TestResult
} from '../../shared/constants'

export function setupConnectionHandlers(): void {
  // 连接数据库
  ipcMain.handle(
    IPC_CHANNELS.CONNECTION_CONNECT,
    async (_event, config: ConnectionConfig): Promise<ConnectionResult> => {
      return databaseClient.connect(config)
    }
  )

  // 断开连接
  ipcMain.handle(
    IPC_CHANNELS.CONNECTION_DISCONNECT,
    async (): Promise<void> => {
      await databaseClient.disconnect()
    }
  )

  // 测试连接
  ipcMain.handle(
    IPC_CHANNELS.CONNECTION_TEST,
    async (_event, config: ConnectionConfig): Promise<TestResult> => {
      const startTime = Date.now()

      const client = new Client({
        host: config.host,
        port: config.port,
        database: config.database,
        user: config.user,
        password: config.password,
        ssl: config.ssl ? { rejectUnauthorized: false } : false,
        connectionTimeoutMillis: 5000,
      })

      try {
        await client.connect()
        await client.query('SELECT 1')
        const latency = Date.now() - startTime
        await client.end()

        return { success: true, latency }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Connection failed',
        }
      }
    }
  )
}
