import { create } from 'zustand'
import type { ERDData } from '@/types/erd'
import type { TableRelationship } from '@/types/erd'

interface DiagramStore {
  data: ERDData | null
  selectedTable: string | null
  tableRelationships: TableRelationship[]
  isLoading: boolean
  error: string | null
  currentSchema: string

  loadDiagramData: (schema: string) => Promise<void>
  loadTableRelationships: (tableName: string, schema: string) => Promise<void>
  setSelectedTable: (tableName: string | null) => void
  setSchema: (schema: string) => void
  clear: () => void
}

export const useDiagramStore = create<DiagramStore>((set, get) => ({
  data: null,
  selectedTable: null,
  tableRelationships: [],
  isLoading: false,
  error: null,
  currentSchema: 'public',

  loadDiagramData: async (schema: string) => {
    set({ isLoading: true, error: null, currentSchema: schema })

    try {
      const result = await window.api.getERDData(schema) as {
        success: boolean
        data?: ERDData
        error?: string
      }

      if (result.success && result.data) {
        set({ data: result.data, isLoading: false })
      } else {
        set({ error: result.error || 'Failed to load diagram data', isLoading: false })
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Unknown error',
        isLoading: false,
      })
    }
  },

  loadTableRelationships: async (tableName: string, schema: string) => {
    try {
      const result = await window.api.getTableRelationships(tableName, schema) as {
        success: boolean
        relationships?: TableRelationship[]
        error?: string
      }

      if (result.success && result.relationships) {
        set({ tableRelationships: result.relationships })
      }
    } catch {
      set({ tableRelationships: [] })
    }
  },

  setSelectedTable: (tableName: string | null) => {
    set({ selectedTable: tableName })
    if (tableName) {
      const { currentSchema } = get()
      get().loadTableRelationships(tableName, currentSchema)
    } else {
      set({ tableRelationships: [] })
    }
  },

  setSchema: (schema: string) => {
    set({ currentSchema: schema })
    get().loadDiagramData(schema)
  },

  clear: () => {
    set({
      data: null,
      selectedTable: null,
      tableRelationships: [],
      error: null,
    })
  },
}))
