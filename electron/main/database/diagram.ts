import { databaseClient } from './client'
import type { TableRelationship } from '../../shared/constants'

interface ERDTableColumn {
  name: string
  dataType: string
  isPrimaryKey: boolean
  isForeignKey: boolean
  foreignTable?: string
  foreignColumn?: string
}

interface ERDTable {
  name: string
  schema: string
  columns: ERDTableColumn[]
}

export interface ERDData {
  tables: ERDTable[]
  relationships: TableRelationship[]
}

export async function getERDData(schema: string = 'public'): Promise<ERDData> {
  const tablesResult = await databaseClient.query(`
    SELECT
      c.table_name as table_name,
      c.column_name as column_name,
      c.data_type as data_type,
      c.is_nullable as is_nullable,
      COALESCE(
        (SELECT true FROM information_schema.table_constraints tc
         JOIN information_schema.key_column_usage kcu
           ON tc.constraint_name = kcu.constraint_name
         WHERE tc.constraint_type = 'PRIMARY KEY'
           AND tc.table_schema = c.table_schema
           AND tc.table_name = c.table_name
           AND kcu.column_name = c.column_name
         LIMIT 1),
        false
      ) as is_primary_key,
      tc.constraint_type,
      kcu.column_name as fk_column,
      ccu.table_name as fk_table_name,
      ccu.column_name as fk_column_name,
      rc.update_rule,
      rc.delete_rule
    FROM information_schema.columns c
    LEFT JOIN information_schema.key_column_usage kcu
      ON c.table_name = kcu.table_name
      AND c.column_name = kcu.column_name
      AND c.table_schema = kcu.table_schema
    LEFT JOIN information_schema.table_constraints tc
      ON kcu.constraint_name = tc.constraint_name
      AND kcu.table_schema = tc.table_schema
    LEFT JOIN information_schema.referential_constraints rc
      ON kcu.constraint_name = rc.constraint_name
    LEFT JOIN information_schema.constraint_column_usage ccu
      ON rc.unique_constraint_name = ccu.constraint_name
    WHERE c.table_schema = '${schema}'
      AND c.table_name NOT LIKE 'pg_%'
      AND c.table_name NOT LIKE 'sql_%'
    ORDER BY c.table_name, c.ordinal_position
  `)

  if (!tablesResult.success || !tablesResult.rows) {
    return { tables: [], relationships: [] }
  }

  const rows = tablesResult.rows as any[]
  const tableMap = new Map<string, ERDTable>()
  const relationships: TableRelationship[] = []

  for (const row of rows) {
    const tableName = row.table_name

    if (!tableMap.has(tableName)) {
      tableMap.set(tableName, {
        name: tableName,
        schema: schema,
        columns: [],
      })
    }

    const table = tableMap.get(tableName)!
    const isPK = row.is_primary_key === true || row.is_primary_key === 'true'
    const isFK = row.constraint_type === 'FOREIGN KEY'

    const column: ERDTableColumn = {
      name: row.column_name,
      dataType: row.data_type,
      isPrimaryKey: isPK,
      isForeignKey: isFK,
    }

    if (isFK && row.fk_table_name) {
      column.foreignTable = row.fk_table_name
      column.foreignColumn = row.fk_column_name

      relationships.push({
        constraintName: `fk_${tableName}_${row.column_name}`,
        sourceTable: tableName,
        sourceColumn: row.column_name,
        targetTable: row.fk_table_name,
        targetColumn: row.fk_column_name,
        onDelete: (row.delete_rule as TableRelationship['onDelete']) || 'NO ACTION',
        onUpdate: (row.update_rule as TableRelationship['onUpdate']) || 'NO ACTION',
      })
    }

    table.columns.push(column)
  }

  return {
    tables: Array.from(tableMap.values()),
    relationships,
  }
}

export async function getTableRelationships(
  tableName: string,
  schema: string = 'public'
): Promise<TableRelationship[]> {
  const result = await databaseClient.query(`
    SELECT
      tc.constraint_name,
      kcu.table_name as source_table,
      kcu.column_name as source_column,
      ccu.table_name as target_table,
      ccu.column_name as target_column,
      rc.update_rule,
      rc.delete_rule
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.referential_constraints rc
      ON tc.constraint_name = rc.constraint_name
    JOIN information_schema.constraint_column_usage ccu
      ON rc.unique_constraint_name = ccu.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = '${schema}'
      AND kcu.table_name = '${tableName}'
  `)

  if (!result.success || !result.rows) {
    return []
  }

  return result.rows as TableRelationship[]
}
