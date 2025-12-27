import { ipcMain } from 'electron'
import { databaseClient } from '../database/client'
import { getSchemas, getTables, getColumns, getFunctions } from '../database/schema'
import { IPC_CHANNELS, type QueryResult, type DDLResult } from '../../shared/constants'

export function setupQueryHandlers(): void {
  // 执行 SQL 查询
  ipcMain.handle(
    IPC_CHANNELS.QUERY_EXECUTE,
    async (_event, sql: string): Promise<QueryResult> => {
      return databaseClient.query(sql)
    }
  )

  // 取消查询（暂未实现）
  ipcMain.handle(IPC_CHANNELS.QUERY_CANCEL, async (): Promise<void> => {
    // TODO: 实现查询取消功能
    console.log('Query cancel requested')
  })

  // 获取 DDL
  ipcMain.handle(
    IPC_CHANNELS.SCHEMA_GET_DDL,
    async (_event, tableName: string, schema?: string): Promise<DDLResult> => {
      try {
        // Construct DDL from information_schema
        const columnsResult = await databaseClient.query(`
          SELECT 
            column_name,
            data_type,
            is_nullable,
            column_default,
            ordinal_position
          FROM information_schema.columns
          WHERE table_schema = '${schema || 'public'}' AND table_name = '${tableName}'
          ORDER BY ordinal_position
        `)
        
        const constraintsResult = await databaseClient.query(`
          SELECT
            tc.constraint_name,
            tc.constraint_type,
            kcu.column_name,
            ccu.table_schema AS foreign_table_schema,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name
          FROM information_schema.table_constraints tc
          LEFT JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
          LEFT JOIN information_schema.constraint_column_usage ccu
            ON tc.constraint_name = ccu.constraint_name
            AND tc.table_schema = ccu.table_schema
          WHERE tc.table_schema = '${schema || 'public'}' AND tc.table_name = '${tableName}'
          ORDER BY tc.constraint_type, kcu.ordinal_position
        `)
        
        if (columnsResult.success && columnsResult.rows && columnsResult.rows.length > 0) {
          let ddl = `CREATE TABLE "${schema || 'public'}"."${tableName}" (\n`
          const columnDefs: string[] = []
          
          for (const row of columnsResult.rows as Record<string, unknown>[]) {
            const colName = row.column_name as string
            const dataType = row.data_type as string
            const nullable = row.is_nullable === 'YES' ? '' : ' NOT NULL'
            const defaultVal = row.column_default as string | null
            const defaultStr = defaultVal ? ` DEFAULT ${defaultVal}` : ''
            columnDefs.push(`  "${colName}" ${dataType}${nullable}${defaultStr}`)
          }
          
          // Add constraints
          if (constraintsResult.success && constraintsResult.rows) {
            const pkColumns: string[] = []
            const fkConstraints: string[] = []
            const uniqueConstraints: string[] = []
            
            for (const row of constraintsResult.rows as Record<string, unknown>[]) {
              const type = row.constraint_type as string
              const colName = row.column_name as string
              
              if (type === 'PRIMARY KEY') {
                pkColumns.push(`"${colName}"`)
              } else if (type === 'FOREIGN KEY') {
                const fkTable = row.foreign_table_name as string
                const fkCol = row.foreign_column_name as string
                fkConstraints.push(`  FOREIGN KEY ("${colName}") REFERENCES "${fkTable}" ("${fkCol}")`)
              } else if (type === 'UNIQUE') {
                uniqueConstraints.push(`  UNIQUE ("${colName}")`)
              }
            }
            
            if (pkColumns.length > 0) {
              columnDefs.push(`  PRIMARY KEY (${pkColumns.join(', ')})`)
            }
            columnDefs.push(...fkConstraints, ...uniqueConstraints)
          }
          
          ddl += columnDefs.join(',\n')
          ddl += '\n);'
          
          return { success: true, ddl }
        }
        
        return { success: false, error: 'Failed to generate DDL' }
      } catch (error) {
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        }
      }
    }
  )

  // 获取 Schemas
  ipcMain.handle(IPC_CHANNELS.SCHEMA_SCHEMAS, async () => {
    return getSchemas()
  })

  // 获取表列表
  ipcMain.handle(
    IPC_CHANNELS.SCHEMA_TABLES,
    async (_event, schema?: string) => {
      return getTables(schema)
    }
  )

  // 获取列信息
  ipcMain.handle(
    IPC_CHANNELS.SCHEMA_COLUMNS,
    async (_event, table: string, schema?: string) => {
      return getColumns(table, schema)
    }
  )

  // 获取函数列表
  ipcMain.handle(
    IPC_CHANNELS.SCHEMA_FUNCTIONS,
    async (_event, schema?: string) => {
      return getFunctions(schema)
    }
  )
}
