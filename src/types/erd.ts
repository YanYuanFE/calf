export interface TableRelationship {
  constraintName: string
  sourceTable: string
  sourceColumn: string
  targetTable: string
  targetColumn: string
  onDelete: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION'
  onUpdate: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION'
}

export interface ERDTableColumn {
  name: string
  dataType: string
  isPrimaryKey: boolean
  isForeignKey: boolean
  foreignTable?: string
  foreignColumn?: string
}

export interface ERDTable {
  name: string
  schema: string
  columns: ERDTableColumn[]
}

export interface ERDData {
  tables: ERDTable[]
  relationships: TableRelationship[]
}

export interface ERDNodeData {
  tableName: string
  schema: string
  columns: ERDTableColumn[]
}

export interface ERDEdgeData {
  sourceColumn: string
  targetColumn: string
  onDelete?: string
  onUpdate?: string
}
