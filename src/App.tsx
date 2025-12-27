import { useState } from 'react'
import { Header } from '@/components/layout/Header'
import { Sidebar } from '@/components/layout/Sidebar'
import { MainContent } from '@/components/layout/MainContent'
import { ConnectionDialog } from '@/components/layout/ConnectionDialog'
import { useConnectionStore } from '@/stores/connectionStore'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/toaster'

export default function App() {
  const [showConnectionDialog, setShowConnectionDialog] = useState(false)
  const { status } = useConnectionStore()

  const shouldShowDialog = showConnectionDialog || status === 'disconnected' || status === 'error'

  return (
    <TooltipProvider>
      <div className="flex h-screen flex-col bg-white text-foreground text-rendering-optimize">
        <Header onConnectClick={() => setShowConnectionDialog(true)} />

        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <MainContent />
        </div>

        {shouldShowDialog && status !== 'connected' && (
          <ConnectionDialog
            onClose={() => setShowConnectionDialog(false)}
          />
        )}
        <Toaster />
      </div>
    </TooltipProvider>
  )
}
