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
  handleConnectionStatusChange: (status: { connected: boolean; serverVersion?: string; reason?: string }) => void
}

export const useConnectionStore = create<ConnectionState>((set) => ({
  config: null,
  status: 'disconnected',
  serverVersion: null,
  error: null,

  handleConnectionStatusChange: (status) => {
    if (status.connected) {
      set({
        status: 'connected',
        serverVersion: status.serverVersion || null,
        error: null,
      })
    } else {
      set({
        status: 'disconnected',
        serverVersion: null,
        error: status.reason || 'Connection lost',
      })
      useQueryStore.getState().clear()
      useSchemaStore.getState().clear()
    }
  },

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
      set({
        config: null,
        status: 'disconnected',
        serverVersion: null,
        error: null,
      })
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
