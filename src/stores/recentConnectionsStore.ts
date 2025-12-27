import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ConnectionConfig } from '@/types/database'

export interface RecentConnection {
  id: string
  name: string
  config: ConnectionConfig
  lastUsed: number
}

interface RecentConnectionsState {
  connections: RecentConnection[]

  // Actions
  addConnection: (config: ConnectionConfig) => void
  removeConnection: (id: string) => void
  clearConnections: () => void
}

// 生成连接名称
function generateConnectionName(config: ConnectionConfig): string {
  return `${config.user}@${config.host}:${config.port}/${config.database}`
}

// 生成连接 ID
function generateConnectionId(config: ConnectionConfig): string {
  return `${config.host}:${config.port}:${config.database}:${config.user}`
}

export const useRecentConnectionsStore = create<RecentConnectionsState>()(
  persist(
    (set, get) => ({
      connections: [],

      addConnection: (config: ConnectionConfig) => {
        const id = generateConnectionId(config)
        const name = generateConnectionName(config)
        const now = Date.now()

        set((state) => {
          // 移除相同的连接（如果存在）
          const filtered = state.connections.filter((c) => c.id !== id)

          // 添加到最前面
          const newConnection: RecentConnection = {
            id,
            name,
            config: { ...config, password: '' }, // 不保存密码
            lastUsed: now,
          }

          // 最多保留 10 个最近连接
          const updated = [newConnection, ...filtered].slice(0, 10)

          return { connections: updated }
        })
      },

      removeConnection: (id: string) => {
        set((state) => ({
          connections: state.connections.filter((c) => c.id !== id),
        }))
      },

      clearConnections: () => {
        set({ connections: [] })
      },
    }),
    {
      name: 'postgresql-recent-connections',
    }
  )
)
