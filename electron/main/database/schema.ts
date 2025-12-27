import { databaseClient } from './client'
import type {
  SchemaInfo,
  TableInfo,
  ColumnInfo,
  FunctionInfo
} from '../../shared/constants'

export async function getSchemas(): Promise<SchemaInfo[]> {
  const result = await databaseClient.query(`
    SELECT schema_name as name, schema_owner as owner
    FROM information_schema.schemata
    WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
    ORDER BY schema_name
  `)

  if (!result.success || !result.rows) {
    return []
  }

  return result.rows as SchemaInfo[]
}

export async function getTables(schema?: string): Promise<TableInfo[]> {
  const schemaFilter = schema ? `AND table_schema = '${schema}'` : ''

  const result = await databaseClient.query(`
    SELECT
      table_name as name,
      table_schema as schema,
      CASE table_type
        WHEN 'BASE TABLE' THEN 'table'
        WHEN 'VIEW' THEN 'view'
        ELSE 'table'
      END as type
    FROM information_schema.tables
    WHERE table_schema NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
    ${schemaFilter}
    ORDER BY table_schema, table_name
  `)

  if (!result.success || !result.rows) {
    return []
  }

  return result.rows as TableInfo[]
}

export async function getColumns(
  table: string,
  schema: string = 'public'
): Promise<ColumnInfo[]> {
  const result = await databaseClient.query(`
    SELECT
      c.column_name as name,
      c.data_type as "dataType",
      c.is_nullable = 'YES' as nullable,
      c.column_default as "defaultValue",
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
      ) as "isPrimaryKey"
    FROM information_schema.columns c
    WHERE c.table_schema = '${schema}'
      AND c.table_name = '${table}'
    ORDER BY c.ordinal_position
  `)

  if (!result.success || !result.rows) {
    return []
  }

  return result.rows as ColumnInfo[]
}

export async function getFunctions(schema?: string): Promise<FunctionInfo[]> {
  const schemaFilter = schema ? `AND n.nspname = '${schema}'` : ''

  const result = await databaseClient.query(`
    SELECT
      p.proname as name,
      n.nspname as schema,
      pg_get_function_result(p.oid) as "returnType",
      pg_get_function_arguments(p.oid) as arguments
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
    ${schemaFilter}
    ORDER BY n.nspname, p.proname
  `)

  if (!result.success || !result.rows) {
    return []
  }

  return result.rows as FunctionInfo[]
}
