import { useState } from 'react'
import { SqlEditor } from '@/components/editor/SqlEditor'
import { ResultTable } from '@/components/table/ResultTable'
import { ERDiagram } from '@/components/diagram'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FileText, Database } from 'lucide-react'

type ContentTab = 'query' | 'diagram'

export function MainContent() {
  const [editorHeight, setEditorHeight] = useState(300)
  const [isDragging, setIsDragging] = useState(false)
  const [activeTab, setActiveTab] = useState<ContentTab>('query')

  const handleMouseDown = () => {
    setIsDragging(true)
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return

    const container = e.currentTarget as HTMLDivElement
    const rect = container.getBoundingClientRect()
    const newHeight = e.clientY - rect.top

    const minHeight = 100
    const maxHeight = rect.height - 100
    setEditorHeight(Math.max(minHeight, Math.min(maxHeight, newHeight)))
  }

  return (
    <main
      className="flex-1 flex flex-col overflow-hidden bg-white"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="flex items-center px-4 border-b border-gray-100 relative z-10">
        <Tabs value={activeTab} onValueChange={(v: string) => setActiveTab(v as ContentTab)}>
          <TabsList className="bg-transparent border-none shadow-none p-0 h-auto">
            <TabsTrigger
              value="query"
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-[var(--color-primary)] rounded-none px-3 py-2"
            >
              <FileText className="h-4 w-4 mr-2" />
              Query
            </TabsTrigger>
            <TabsTrigger
              value="diagram"
              className="data-[state=active]:bg-transparent data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-[var(--color-primary)] rounded-none px-3 py-2"
            >
              <Database className="h-4 w-4 mr-2" />
              ER Diagram
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {activeTab === 'query' ? (
        <>
          <div
            style={{ height: editorHeight }}
            className="shrink-0 bg-white border-b border-gray-100"
          >
            <SqlEditor />
          </div>

          <div
            className={`h-1 cursor-row-resize transition-all duration-200 ${
              isDragging ? 'bg-[var(--color-primary)]' : 'bg-transparent hover:bg-gray-200'
            }`}
            onMouseDown={handleMouseDown}
          >
            <div className="h-full w-full flex items-center justify-center">
              <div className={`h-0.5 w-8 bg-gray-200 rounded-full transition-all duration-200 ${
                isDragging ? 'bg-[var(--color-primary)]' : ''
              }`} />
            </div>
          </div>

          <div className="flex-1 overflow-hidden bg-white">
            <ResultTable />
          </div>
        </>
      ) : (
        <div className="flex-1 overflow-hidden">
          <ERDiagram />
        </div>
      )}
    </main>
  )
}
