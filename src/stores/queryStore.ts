import { create } from 'zustand'
import type { QueryResult, QueryHistoryItem } from '@/types/database'

interface QueryState {
  sql: string
  result: QueryResult | null
  isExecuting: boolean
  history: QueryHistoryItem[]

  // Actions
  setSql: (sql: string) => void
  execute: () => Promise<void>
  cancel: () => void
  clearResult: () => void
  clear: () => void
}

export const useQueryStore = create<QueryState>((set, get) => ({
  sql: '',
  result: null,
  isExecuting: false,
  history: [],

  setSql: (sql: string) => set({ sql }),

  execute: async () => {
    const { sql } = get()
    if (!sql.trim()) return

    set({ isExecuting: true, result: null })

    try {
      const result = await window.api.executeQuery(sql)

      // 添加到历史记录
      const historyItem: QueryHistoryItem = {
        id: Date.now().toString(),
        sql,
        executedAt: new Date(),
        duration: result.duration,
        rowCount: result.rowCount,
        error: result.error,
      }

      set((state) => ({
        result,
        isExecuting: false,
        history: [historyItem, ...state.history].slice(0, 50), // 保留最近 50 条
      }))
    } catch (error) {
      set({
        result: {
          success: false,
          error: error instanceof Error ? error.message : 'Query failed',
        },
        isExecuting: false,
      })
    }
  },

  cancel: async () => {
    try {
      await window.api.cancelQuery()
    } finally {
      set({ isExecuting: false })
    }
  },

  clearResult: () => set({ result: null }),

  clear: () => set({ sql: '', result: null, isExecuting: false }),
}))
