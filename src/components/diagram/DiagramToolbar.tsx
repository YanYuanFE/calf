import { useReactFlow } from '@xyflow/react'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'

export function DiagramToolbar() {
  const { getNodes, getEdges } = useReactFlow()

  const handleExport = () => {
    const nodes = getNodes()
    const edges = getEdges()
    const data = JSON.stringify({ nodes, edges }, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'erd-diagram.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      className="flex items-center gap-2"
    >
      <Download className="h-4 w-4" />
      导出 JSON
    </Button>
  )
}
