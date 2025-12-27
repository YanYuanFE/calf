import { ipcMain } from 'electron'
import { getERDData, getTableRelationships } from '../database/diagram'
import { IPC_CHANNELS } from '../../shared/constants'

export function setupDiagramHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.DIAGRAM_ERD_DATA, async (_, schema: string) => {
    try {
      const data = await getERDData(schema)
      return { success: true, data }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get ERD data',
      }
    }
  })

  ipcMain.handle(IPC_CHANNELS.DIAGRAM_TABLE_RELATIONSHIPS, async (_, tableName: string, schema: string) => {
    try {
      const relationships = await getTableRelationships(tableName, schema)
      return { success: true, relationships }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get table relationships',
      }
    }
  })
}
