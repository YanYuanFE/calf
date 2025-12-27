# 数据库关系图功能设计文档

## 1. 功能概述

### 1.1 目标
为 PostgreSQL Client 添加数据库关系图（ER Diagram）可视化功能，帮助用户直观理解数据库表结构、表之间的关系，以及外键约束。

### 1.2 核心功能
- **关系图可视化**：以节点-边的形式展示表及其关系
- **表结构展示**：显示表名、列信息（名称、类型、主键）
- **外键关系**：展示表之间的外键关联
- **交互操作**：拖拽、缩放、点击选中
- **筛选过滤**：按 Schema 筛选、搜索表
- **导出功能**：支持导出为图片

### 1.3 用户场景
- 新手理解现有数据库结构
- 开发时查看表关系
- 数据库重构前分析依赖
- 文档生成

---

## 2. 技术选型

### 2.1 可视化库对比

| 库 | 优点 | 缺点 | 推荐指数 |
|---|------|------|---------|
| **React Flow** | React 原生、交互丰富、文档完善 | 体积较大 (~200KB) | ⭐⭐⭐⭐⭐ |
| **React Diagrams** | 功能强大、节点类型丰富 | 文档较少、学习曲线陡 | ⭐⭐⭐ |
| **Vis.js** | 简单易用、力导向布局 | 样式老旧、React 集成一般 | ⭐⭐ |
| **Cytoscape.js** | 专业图库、算法丰富 | 体积大、上手难 | ⭐⭐⭐ |

### 2.2 推荐方案：React Flow + Dagre

**选择理由**：
1. React 生态原生支持，集成简单
2. 交互体验优秀（拖拽、缩放、选择）
3. 支持自定义节点
4. 可配合 Dagre 做自动布局
5. 社区活跃、文档完善

```bash
pnpm add @xyflow/react dagre
```

---

## 3. 数据模型设计

### 3.1 关系图节点类型

```typescript
// src/types/erd.ts

// 关系图节点
interface ERDNode {
  id: string                    // 节点唯一标识 (tableName)
  type: 'tableNode'            // 节点类型
  data: {
    tableName: string          // 表名
    schema: string             // Schema 名
    columns: ERDColumn[]       // 列信息
    position: { x: number; y: number }  // 位置
  }
  selected?: boolean
  dragging?: boolean
}

// 列信息（简化版）
interface ERDColumn {
  name: string                 // 列名
  dataType: string             // 数据类型
  isPrimaryKey: boolean        // 是否主键
  isForeignKey?: boolean       // 是否外键
  foreignTable?: string        // 关联表
  foreignColumn?: string       // 关联列
}

// 关系图边
interface ERDEdge {
  id: string                   // 边唯一标识
  source: string               // 源节点 (表名)
  target: string               // 目标节点 (表名)
  type: 'foreignKeyEdge'       // 边类型
  data: {
    sourceColumn: string       // 源列
    targetColumn: string       // 目标列
    onDelete?: string          // 删除规则
    onUpdate?: string          // 更新规则
  }
  animated?: boolean           // 是否动画
  selected?: boolean
}
```

### 3.2 后端返回类型

```typescript
// electron/main/database/types.ts

interface TableRelationship {
  constraintName: string
  sourceTable: string
  sourceColumn: string
  targetTable: string
  targetColumn: string
  onDelete: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION'
  onUpdate: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION'
}

interface ERDiagramData {
  tables: {
    name: string
    schema: string
    columns: {
      name: string
      dataType: string
      isPrimaryKey: boolean
      isForeignKey: boolean
      foreignTable?: string
      foreignColumn?: string
    }[]
  }[]
  relationships: TableRelationship[]
}
```

---

## 4. IPC 接口设计

### 4.1 新增 Channel

```typescript
// electron/main/ipc/diagram.ts

import { ipcMain } from 'electron'
import { dbClient } from '../database/client'

export function registerDiagramHandlers() {
  // 获取关系图数据
  ipcMain.handle('db:get-erd-data', async (_, schema: string) => {
    return await dbClient.getERDData(schema)
  })

  // 获取指定表的关系
  ipcMain.handle('db:get-table-relationships', async (_, tableName: string, schema: string) => {
    return await dbClient.getTableRelationships(tableName, schema)
  })
}
```

### 4.2 数据库查询

```typescript
// electron/main/database/diagram.ts

export async function getERDData(schema: string) {
  // 1. 获取所有表和列信息
  const tablesQuery = `
    SELECT
      c.table_name,
      c.column_name,
      c.data_type,
      c.is_nullable,
      c.column_default,
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
    WHERE c.table_schema = $1
      AND c.table_name NOT LIKE 'pg_%'
      AND c.table_name NOT LIKE 'sql_%'
    ORDER BY c.table_name, c.ordinal_position
  `

  // 2. 获取所有外键关系
  const relationshipsQuery = `
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
      AND tc.table_schema = $1
  `

  // 执行查询并组装数据...
}
```

---

## 5. 组件架构

### 5.1 组件结构

```
src/components/diagram/
├── ERDiagram.tsx           # 主组件
├── TableNode.tsx           # 自定义节点组件
├── RelationshipEdge.tsx    # 自定义边组件
├── DiagramToolbar.tsx      # 工具栏
├── DiagramMiniMap.tsx      # 缩略图
├── TableDetailsPanel.tsx   # 表详情侧边栏
└── index.ts
```

### 5.2 主组件设计

```typescript
// src/components/diagram/ERDiagram.tsx

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  Panel,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import dagre from 'dagre'
import { useConnectionStore } from '@/stores/connectionStore'
import { useDiagramStore } from '@/stores/diagramStore'
import { TableNode } from './TableNode'
import { RelationshipEdge } from './RelationshipEdge'
import { DiagramToolbar } from './DiagramToolbar'
import { TableDetailsPanel } from './TableDetailsPanel'
import type { ERDNode, ERDEdge, TableRelationship } from '@/types/erd'

const nodeTypes = {
  tableNode: TableNode,
}

const edgeTypes = {
  foreignKeyEdge: RelationshipEdge,
}

export function ERDiagram() {
  const { status } = useConnectionStore()
  const { data, selectedTable, setSelectedTable, loadDiagramData } = useDiagramStore()

  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [showDetails, setShowDetails] = useState(false)

  // 根据数据生成节点和边
  const { initialNodes, initialEdges } = useMemo(() => {
    if (!data) return { initialNodes: [], initialEdges: [] }

    // 使用 Dagre 自动布局
    const layouted = layoutDiagram(data.tables, data.relationships)

    const nodes: ERDNode[] = layouted.tables.map((table) => ({
      id: table.name,
      type: 'tableNode',
      position: table.position,
      data: {
        tableName: table.name,
        schema: table.schema,
        columns: table.columns,
      },
    }))

    const edges: ERDEdge[] = data.relationships.map((rel) => ({
      id: `edge-${rel.sourceTable}-${rel.targetTable}-${rel.sourceColumn}`,
      source: rel.targetTable,
      target: rel.sourceTable,
      type: 'foreignKeyEdge',
      data: {
        sourceColumn: rel.targetColumn,
        targetColumn: rel.sourceColumn,
        onDelete: rel.onDelete,
        onUpdate: rel.onUpdate,
      },
      animated: true,
    }))

    return { initialNodes: nodes, initialEdges: edges }
  }, [data])

  // 初始化加载数据
  useEffect(() => {
    if (status === 'connected') {
      loadDiagramData('public')
    }
  }, [status])

  // 设置节点和边
  useEffect(() => {
    setNodes(initialNodes)
    setEdges(initialEdges)
  }, [initialNodes, initialEdges])

  // 点击节点
  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedTable(node.data.tableName)
    setShowDetails(true)
  }, [])

  // 点击空白处
  const onPaneClick = useCallback(() => {
    setSelectedTable(null)
    setShowDetails(false)
  }, [])

  if (status !== 'connected') {
    return <div className="flex items-center justify-center h-full">请先连接数据库</div>
  }

  return (
    <div className="flex h-full w-full">
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          fitView
          minZoom={0.1}
          maxZoom={2}
          attributionPosition="bottom-left"
        >
          <Background />
          <Controls />
          <MiniMap />
          <Panel position="top-right">
            <DiagramToolbar />
          </Panel>
        </ReactFlow>
      </div>

      {showDetails && selectedTable && (
        <TableDetailsPanel
          tableName={selectedTable}
          onClose={() => setShowDetails(false)}
        />
      )}
    </div>
  )
}

// Dagre 自动布局
function layoutDiagram(tables: any[], relationships: TableRelationship[]) {
  const g = new dagre.graphlib.Graph()
  g.setGraph({ rankdir: 'LR', nodesep: 50, ranksep: 150 })
  g.setDefaultEdgeLabel(() => ({}))

  // 添加节点
  tables.forEach((table) => {
    const width = 200
    const height = 40 + table.columns.length * 28
    g.setNode(table.name, { width, height })
  })

  // 添加边（用于布局）
  relationships.forEach((rel) => {
    g.setEdge(rel.sourceTable, rel.targetTable)
  })

  dagre.layout(g)

  return tables.map((table) => ({
    ...table,
    position: {
      x: g.node(table.name).x - g.node(table.name).width / 2,
      y: g.node(table.name).y - g.node(table.name).height / 2,
    },
  }))
}
```

### 5.3 自定义节点组件

```typescript
// src/components/diagram/TableNode.tsx

import { Handle, Position, type NodeProps } from '@xyflow/react'
import type { ERDNode } from '@/types/erd'

export function TableNode({ data, selected }: NodeProps<ERDNode>) {
  const primaryKeys = data.columns.filter((c) => c.isPrimaryKey)
  const regularCols = data.columns.filter((c) => !c.isPrimaryKey)

  return (
    <div
      className={`
        min-w-[200px] bg-white rounded-lg border shadow-md overflow-hidden
        transition-all duration-200
        ${selected ? 'border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/20' : 'border-gray-200'}
      `}
    >
      <Handle type="target" position={Position.Left} className="!bg-gray-400" />

      {/* 表头 */}
      <div className="bg-gradient-to-r from-gray-50 to-white px-3 py-2 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-[var(--color-postgres-blue)]/10 flex items-center justify-center">
            <span className="text-[10px] font-bold text-[var(--color-postgres-blue)]">
              {data.tableName.charAt(0).toUpperCase()}
            </span>
          </div>
          <span className="font-semibold text-sm text-gray-800 truncate">
            {data.tableName}
          </span>
        </div>
      </div>

      {/* 列列表 */}
      <div className="px-3 py-1.5 space-y-0.5">
        {primaryKeys.map((col) => (
          <div key={col.name} className="flex items-center gap-2 text-xs">
            <span className="text-yellow-500">🔑</span>
            <span className="font-medium text-gray-700">{col.name}</span>
            <span className="text-gray-400 text-[10px] ml-auto">{col.dataType}</span>
          </div>
        ))}
        {regularCols.map((col) => (
          <div key={col.name} className="flex items-center gap-2 text-xs">
            <span className="w-4" />
            <span className="text-gray-600">{col.name}</span>
            <span className="text-gray-400 text-[10px] ml-auto">{col.dataType}</span>
            {col.isForeignKey && <span className="text-blue-400 text-[10px]">FK</span>}
          </div>
        ))}
      </div>

      <Handle type="source" position={Position.Right} className="!bg-gray-400" />
    </div>
  )
}
```

### 5.4 Store 设计

```typescript
// src/stores/diagramStore.ts

import { create } from 'zustand'
import type { ERDiagramData } from '@/types/erd'

interface DiagramStore {
  data: ERDiagramData | null
  selectedTable: string | null
  isLoading: boolean
  error: string | null

  // Actions
  loadDiagramData: (schema: string) => Promise<void>
  setSelectedTable: (tableName: string | null) => void
  clear: () => void
}
```

---

## 6. 用户交互设计

### 6.1 界面布局

```
┌─────────────────────────────────────────────────────────────┐
│  Header (现有)                                              │
├──────────────┬─────────────────────────────────────────────┤
│              │  ┌─────────────────────────────────────────┐ │
│   Schema     │  │                                     [🔍] │ │
│   筛选器     │  │                                         │ │
│              │  │         React Flow 画布                  │ │
│  ┌────────┐  │  │                                         │ │
│  │ Table1 │  │  │     ┌──────┐      ┌──────┐             │ │
│  │ Table2 │  │  │     │ tbl1  │ ───► │ tbl2  │             │ │
│  │ Table3 │  │  │     └──────┘      └──────┘             │ │
│  └────────┘  │  │                                         │ │
│              │  │                                     [📐] │ │
│  ──────────  │  └─────────────────────────────────────────┘ │
│              │         [缩略图]                             │
├──────────────┴─────────────────────────────────────────────┤
│  Footer (现有)                                              │
└─────────────────────────────────────────────────────────────┘
          ↑
    可选：表详情侧边栏
```

### 6.2 操作说明

| 操作 | 方式 |
|------|------|
| 拖拽移动 | 拖拽节点 |
| 缩放画布 | 滚轮 / 缩放按钮 |
| 平移画布 | 拖拽空白区域 |
| 选择表 | 点击节点 |
| 查看表详情 | 点击后显示侧边栏 |
| 筛选表 | 顶部搜索框 |
| 自动布局 | 工具栏按钮 |
| 导出图片 | 工具栏按钮 |

---

## 7. 性能优化

### 7.1 大表处理
- 限制显示的列数（默认显示前 20 列）
- 支持展开/收起列列表
- 虚拟化长列表

### 7.2 大量节点优化
- 分页加载（>100 表时）
- 只显示有关系的表
- 懒加载子节点

### 7.3 缓存策略
```typescript
// 缓存关系图数据
const CACHE_KEY = 'erd-data'
const CACHE_DURATION = 5 * 60 * 1000  // 5分钟

function getCachedData(schema: string) {
  const cached = localStorage.getItem(`${CACHE_KEY}-${schema}`)
  if (!cached) return null

  const { data, timestamp } = JSON.parse(cached)
  if (Date.now() - timestamp > CACHE_DURATION) return null

  return data
}
```

---

## 8. 目录结构

```
postgresql-app/
├── electron/
│   └── main/
│       └── database/
│           └── diagram.ts         # 关系图数据查询 (新增)
├── src/
│   ├── components/
│   │   └── diagram/              # 关系图组件 (新增)
│   │       ├── ERDiagram.tsx
│   │       ├── TableNode.tsx
│   │       ├── RelationshipEdge.tsx
│   │       ├── DiagramToolbar.tsx
│   │       ├── DiagramMiniMap.tsx
│   │       ├── TableDetailsPanel.tsx
│   │       └── index.ts
│   ├── stores/
│   │   └── diagramStore.ts       # 关系图状态 (新增)
│   ├── types/
│   │   └── erd.ts               # 关系图类型 (新增)
│   └── App.tsx                  # 添加 Tab 切换
├── docs/
│   └── ERD_FEATURE_DESIGN.md    # 本文档
```

---

## 9. 依赖清单

```json
{
  "dependencies": {
    "@xyflow/react": "^12.0.0",
    "dagre": "^0.8.5",
    "@types/dagre": "^0.7.52"
  }
}
```

---

## 10. 实施计划

### Phase 1: 后端数据获取
- [ ] 实现 `getERDData` 数据库查询
- [ ] 实现 `getTableRelationships` 查询
- [ ] 注册 IPC handlers

### Phase 2: 基础组件
- [ ] 创建 diagramStore
- [ ] 创建基本类型定义
- [ ] 实现 ERDiagram 主组件
- [ ] 实现 TableNode 节点组件

### Phase 3: 关系展示
- [ ] 实现 RelationshipEdge 边组件
- [ ] 实现 Dagre 自动布局
- [ ] 添加缩略图和工具栏

### Phase 4: 交互增强
- [ ] 实现 TableDetailsPanel
- [ ] 添加搜索筛选
- [ ] 实现导出功能

---

## 11. 风险评估

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| 数据库表过多 (>500) | 性能问题 | 分页懒加载 |
| 外键关系复杂 | 界面混乱 | 筛选高亮 |
| 跨 Schema 引用 | 数据不完整 | 提示用户 |
| 无外键表 | 无法展示关系 | 提供手动关联功能（可选） |
