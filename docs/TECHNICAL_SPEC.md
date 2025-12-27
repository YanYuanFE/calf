# PostgreSQL Client 技术规格文档

## 项目概述

一个轻量级的 PostgreSQL 查询工具，用于执行 SQL 查询和浏览数据库结构。

## 技术栈

| 类别 | 技术选型 |
|------|----------|
| 框架 | Electron + React 19 |
| 构建工具 | electron-vite |
| 包管理 | pnpm |
| 语言 | TypeScript |
| UI 组件 | shadcn/ui (基于 Radix UI) |
| 样式 | Tailwind CSS v4 |
| 状态管理 | Zustand |
| SQL 编辑器 | Monaco Editor |
| 数据表格 | TanStack Table |
| 数据库驱动 | node-postgres (pg) |

## 架构设计

### 进程架构

```
┌─────────────────────────────────────────────────────────────┐
│                      Main Process                            │
│  ┌─────────────────┐  ┌─────────────────┐                   │
│  │ DatabaseClient  │  │   IPC Handlers  │                   │
│  │   (node-pg)     │  │                 │                   │
│  └─────────────────┘  └─────────────────┘                   │
└─────────────────────────────────────────────────────────────┘
                              │
                         IPC Bridge
                              │
┌─────────────────────────────────────────────────────────────┐
│                    Preload Script                            │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              contextBridge.exposeInMainWorld         │    │
│  │                     window.api                       │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    Renderer Process                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │    React     │  │    Zustand   │  │   Monaco     │      │
│  │  Components  │  │    Stores    │  │   Editor     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### 目录结构

```
postgresql-app/
├── electron/
│   ├── main/
│   │   ├── index.ts              # 主进程入口
│   │   ├── database/
│   │   │   ├── client.ts         # 数据库连接客户端
│   │   │   └── schema.ts         # Schema 查询函数
│   │   └── ipc/
│   │       ├── connection.ts     # 连接相关 IPC 处理
│   │       └── query.ts          # 查询相关 IPC 处理
│   ├── preload/
│   │   └── index.ts              # Preload 脚本
│   └── shared/
│       └── constants.ts          # 共享常量和类型
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.tsx        # 顶部导航栏
│   │   │   ├── Sidebar.tsx       # 左侧边栏
│   │   │   ├── MainContent.tsx   # 主内容区
│   │   │   └── ConnectionDialog.tsx  # 连接对话框
│   │   ├── editor/
│   │   │   └── SqlEditor.tsx     # Monaco SQL 编辑器
│   │   ├── table/
│   │   │   └── ResultTable.tsx   # 查询结果表格
│   │   ├── tree/
│   │   │   └── SchemaTree.tsx    # Schema 树形浏览
│   │   └── ui/                   # shadcn/ui 组件
│   ├── stores/
│   │   ├── connectionStore.ts    # 连接状态
│   │   ├── queryStore.ts         # 查询状态
│   │   ├── schemaStore.ts        # Schema 状态
│   │   └── recentConnectionsStore.ts  # 最近连接 (持久化)
│   ├── types/
│   │   └── database.ts           # TypeScript 类型定义
│   ├── styles/
│   │   └── globals.css           # 全局样式 + Tailwind
│   ├── App.tsx                   # 应用根组件
│   └── main.tsx                  # React 入口
├── docs/
│   └── TECHNICAL_SPEC.md         # 本文档
├── electron.vite.config.ts       # electron-vite 配置
├── tailwind.config.js            # Tailwind 配置
├── postcss.config.js             # PostCSS 配置
├── tsconfig.json                 # TypeScript 配置
└── package.json
```

## IPC 通信协议

### Channel 定义

```typescript
// 连接相关
'db:connect'         // 建立数据库连接
'db:disconnect'      // 断开连接
'db:test-connection' // 测试连接

// 查询相关
'db:execute-query'   // 执行 SQL 查询
'db:cancel-query'    // 取消正在执行的查询

// Schema 相关
'db:get-schemas'     // 获取所有 Schema
'db:get-tables'      // 获取表和视图列表
'db:get-columns'     // 获取表的列信息
'db:get-functions'   // 获取函数列表
```

### API 接口

```typescript
interface DatabaseAPI {
  // 连接
  connect(config: ConnectionConfig): Promise<ConnectResult>
  disconnect(): Promise<void>
  testConnection(config: ConnectionConfig): Promise<TestResult>

  // 查询
  executeQuery(sql: string): Promise<QueryResult>
  cancelQuery(): Promise<void>

  // Schema
  getSchemas(): Promise<SchemaInfo[]>
  getTables(schema: string): Promise<TableInfo[]>
  getColumns(table: string, schema: string): Promise<ColumnInfo[]>
  getFunctions(schema: string): Promise<FunctionInfo[]>
}
```

## 类型定义

```typescript
// 连接配置
interface ConnectionConfig {
  host: string
  port: number
  database: string
  user: string
  password: string
  ssl?: boolean
}

// 连接状态
type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

// 查询结果
interface QueryResult {
  success: boolean
  columns?: string[]
  rows?: Record<string, unknown>[]
  rowCount?: number
  duration?: number
  error?: string
}

// Schema 信息
interface SchemaInfo {
  name: string
}

// 表信息
interface TableInfo {
  name: string
  schema: string
  type: 'table' | 'view'
}

// 列信息
interface ColumnInfo {
  name: string
  dataType: string
  isNullable: boolean
  isPrimaryKey: boolean
  defaultValue?: string
}

// 函数信息
interface FunctionInfo {
  name: string
  schema: string
  returnType: string
  arguments: string
}
```

## 状态管理

### connectionStore

管理数据库连接状态：
- `config`: 当前连接配置
- `status`: 连接状态
- `serverVersion`: PostgreSQL 版本
- `error`: 错误信息
- Actions: `connect()`, `disconnect()`, `testConnection()`

### queryStore

管理 SQL 查询状态：
- `sql`: 当前 SQL 语句
- `result`: 查询结果
- `isExecuting`: 执行状态
- `history`: 查询历史 (最近 50 条)
- Actions: `setSql()`, `execute()`, `cancel()`, `clear()`

### schemaStore

管理 Schema 浏览状态：
- `schemas`: Schema 列表
- `tables`: 表/视图列表
- `functions`: 函数列表
- `selectedSchema`: 当前选中的 Schema
- Actions: `refresh()`, `loadColumns()`, `clear()`

### recentConnectionsStore (持久化)

管理最近连接记录：
- `connections`: 最近连接列表 (不含密码)
- Actions: `addConnection()`, `removeConnection()`
- 使用 `zustand/middleware/persist` 持久化到 localStorage

## 功能特性

### 已实现功能

1. **数据库连接**
   - 表单连接 (Host, Port, Database, User, Password)
   - URL 连接 (`postgresql://user:pass@host:port/db`)
   - 最近连接快速选择
   - 连接测试
   - SSL 支持

2. **Schema 浏览**
   - 树形结构显示 Tables, Views, Functions
   - 展开表显示列信息 (名称、类型、主键标识)
   - 右键菜单操作

3. **右键菜单功能**
   - View Data (Top 100) - 查看前 100 条数据
   - View Structure - 查看表结构
   - Generate SELECT - 生成 SELECT 语句
   - Copy Name - 复制名称
   - Truncate Table - 清空表数据 (需二次确认)
   - Drop Table - 删除表 (需二次确认)

4. **SQL 编辑器**
   - Monaco Editor 集成
   - SQL 语法高亮
   - 执行按钮 (F5 快捷键)
   - 取消查询

5. **结果显示**
   - TanStack Table 表格
   - 列排序
   - 分页
   - 执行时间、行数统计
   - 错误信息显示

### 安全特性

- Preload 脚本使用 `contextIsolation: true`
- 不启用 `nodeIntegration`
- 最近连接不保存密码
- 危险操作 (Truncate/Drop) 需要输入表名确认

## 构建配置

### electron-vite 配置要点

```typescript
// electron.vite.config.ts
export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        output: {
          format: 'cjs',
          entryFileNames: '[name].cjs',  // 输出 .cjs 格式
        },
      },
    },
  },
  renderer: {
    resolve: {
      alias: {
        '@': resolve('src'),
      },
    },
    plugins: [react()],
  },
})
```

### CSP 配置

```html
<meta http-equiv="Content-Security-Policy"
  content="default-src 'self';
    script-src 'self' https://cdn.jsdelivr.net;
    style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net;
    font-src 'self' data: https://cdn.jsdelivr.net;">
```

## 开发命令

```bash
# 安装依赖
pnpm install

# 开发模式
pnpm dev

# 构建应用
pnpm build

# 打包分发
pnpm build:mac   # macOS
pnpm build:win   # Windows
pnpm build:linux # Linux
```

## 已解决的问题

1. **Preload 脚本格式**: package.json 使用 `"type": "module"`，preload 需要输出为 `.cjs` 格式
2. **Monaco Editor CSP**: 需要在 CSP 中允许 jsdelivr CDN
3. **IPC 通道常量**: 不能从 src/ 导入到 preload，需要在 electron/shared/ 定义共享常量
4. **断开连接清理**: disconnect 时需要清空 queryStore 和 schemaStore
5. **连接失败处理**: 连接失败时保持对话框打开，显示错误信息
