import { create } from 'zustand'
import type {
  SchemaInfo,
  TableInfo,
  ColumnInfo,
  FunctionInfo
} from '@/types/database'

interface SchemaState {
  schemas: SchemaInfo[]
  tables: TableInfo[]
  functions: FunctionInfo[]
  isLoading: boolean
  selectedSchema: string

  // Actions
  setSelectedSchema: (schema: string) => void
  refresh: () => Promise<void>
  loadColumns: (tableName: string, schema?: string) => Promise<ColumnInfo[]>
  clear: () => void
}

export const useSchemaStore = create<SchemaState>((set, get) => ({
  schemas: [],
  tables: [],
  functions: [],
  isLoading: false,
  selectedSchema: 'public',

  setSelectedSchema: (schema: string) => {
    set({ selectedSchema: schema })
    get().refresh()
  },

  refresh: async () => {
    set({ isLoading: true })

    try {
      const { selectedSchema } = get()

      const [schemas, tables, functions] = await Promise.all([
        window.api.getSchemas(),
        window.api.getTables(selectedSchema),
        window.api.getFunctions(selectedSchema),
      ])

      set({
        schemas,
        tables,
        functions,
        isLoading: false,
      })
    } catch (error) {
      console.error('Failed to load schema:', error)
      set({ isLoading: false })
    }
  },

  loadColumns: async (
    tableName: string,
    schema?: string
  ): Promise<ColumnInfo[]> => {
    const { selectedSchema } = get()
    return window.api.getColumns(tableName, schema || selectedSchema)
  },

  clear: () => set({
    schemas: [],
    tables: [],
    functions: [],
    isLoading: false,
    selectedSchema: 'public',
  }),
}))
