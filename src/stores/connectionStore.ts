import { create } from 'zustand'
import type {
  ConnectionConfig,
  ConnectionStatus
} from '@/types/database'
import { useQueryStore } from './queryStore'
import { useSchemaStore } from './schemaStore'

interface ConnectionState {
  config: ConnectionConfig | null
  status: ConnectionStatus
  serverVersion: string | null
  error: string | null

  // Actions
  connect: (config: ConnectionConfig) => Promise<void>
  disconnect: () => Promise<void>
  testConnection: (config: ConnectionConfig) => Promise<boolean>
}

export const useConnectionStore = create<ConnectionState>((set) => ({
  config: null,
  status: 'disconnected',
  serverVersion: null,
  error: null,

  connect: async (config: ConnectionConfig) => {
    set({ status: 'connecting', error: null })

    try {
      const result = await window.api.connect(config)

      if (result.success) {
        set({
          config,
          status: 'connected',
          serverVersion: result.serverVersion || null,
          error: null,
        })
      } else {
        set({
          status: 'error',
          error: result.error || 'Connection failed',
        })
      }
    } catch (error) {
      set({
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  },

  disconnect: async () => {
    try {
      await window.api.disconnect()
    } finally {
      // 清空连接状态
      set({
        config: null,
        status: 'disconnected',
        serverVersion: null,
        error: null,
      })

      // 清空查询和 Schema
      useQueryStore.getState().clear()
      useSchemaStore.getState().clear()
    }
  },

  testConnection: async (config: ConnectionConfig): Promise<boolean> => {
    try {
      const result = await window.api.testConnection(config)
      return result.success
    } catch {
      return false
    }
  },
}))
