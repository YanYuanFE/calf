import { useState } from 'react'
import { SchemaTree } from '@/components/tree/SchemaTree'
import { UpdateDialog } from './UpdateDialog'
import { RotateCw, Info } from 'lucide-react'

// 从 package.json 读取版本号
const APP_VERSION = (() => {
  try {
    // 在渲染进程中，通过 import.meta.env 访问
    return (import.meta as unknown as { env: { VITE_APP_VERSION: string } }).env?.VITE_APP_VERSION || '1.0.0'
  } catch {
    return '1.0.0'
  }
})()

export function Sidebar() {
  const [showUpdateDialog, setShowUpdateDialog] = useState(false)

  return (
    <aside className="w-72 border-r border-gray-100 bg-[var(--color-sidebar)] flex flex-col">
      <div className="flex-1 overflow-hidden">
        <SchemaTree />
      </div>
      
      <div className="border-t border-gray-200 px-3 py-2 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-[var(--color-muted-foreground)]">
            <Info className="h-3 w-3" />
            <span>v{APP_VERSION}</span>
          </div>
          
          <button
            onClick={() => setShowUpdateDialog(true)}
            className="flex items-center gap-1 text-xs text-[var(--color-primary)] hover:underline"
          >
            <RotateCw className="h-3 w-3" />
            检查更新
          </button>
        </div>
      </div>

      <UpdateDialog open={showUpdateDialog} onClose={() => setShowUpdateDialog(false)} />
    </aside>
  )
}
