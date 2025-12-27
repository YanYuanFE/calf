import { useState } from 'react'
import { useConnectionStore } from '@/stores/connectionStore'
import { useQueryStore } from '@/stores/queryStore'
import { Button } from '@/components/ui/button'
import {
  Database,
  Play,
  Square,
  Loader2,
  Unplug,
  RotateCw,
} from 'lucide-react'
import { UpdateDialog } from './UpdateDialog'

interface HeaderProps {
  onConnectClick: () => void
}

export function Header({ onConnectClick }: HeaderProps) {
  const { status, serverVersion, disconnect } = useConnectionStore()
  const { execute, cancel, isExecuting, sql } = useQueryStore()
  const [showUpdateDialog, setShowUpdateDialog] = useState(false)

  const getStatusColor = () => {
    switch (status) {
      case 'connected':
        return 'bg-[var(--color-success)]'
      case 'connecting':
        return 'bg-[var(--color-warning)] animate-pulse'
      case 'error':
        return 'bg-[var(--color-error)]'
      default:
        return 'bg-[var(--color-muted-foreground)]'
    }
  }

  const getStatusText = () => {
    switch (status) {
      case 'connected':
        return serverVersion?.split(' ')[0] || 'Connected'
      case 'connecting':
        return 'Connecting...'
      case 'error':
        return 'Error'
      default:
        return 'Disconnected'
    }
  }

  return (
    <header className="flex h-14 items-center justify-between border-b border-gray-100 bg-white px-6">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-postgres-blue)] text-white shadow-sm">
            <Database className="h-4 w-4" />
          </div>
          <div>
            <span className="font-semibold text-[var(--color-foreground)] tracking-tight">PostgreSQL Client</span>
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${getStatusColor()} shadow-sm`} />
              <span className="text-xs text-[var(--color-muted-foreground)]">
                {getStatusText()}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {status === 'connected' ? (
          <>
            <Button
              size="sm"
              onClick={execute}
              disabled={isExecuting || !sql.trim()}
              className="bg-[var(--color-postgres-blue)] hover:bg-[var(--color-postgres-blue)]/90 text-white shadow-sm"
            >
              {isExecuting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              Run
            </Button>
            {isExecuting && (
              <Button 
                size="sm" 
                variant="destructive" 
                onClick={cancel}
              >
                <Square className="mr-2 h-4 w-4" />
                Cancel
              </Button>
            )}
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => setShowUpdateDialog(true)}
            >
              <RotateCw className="mr-2 h-4 w-4" />
              Update
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={disconnect}
            >
              <Unplug className="mr-2 h-4 w-4" />
              Disconnect
            </Button>
          </>
        ) : (
          <>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => setShowUpdateDialog(true)}
            >
              <RotateCw className="mr-2 h-4 w-4" />
              Update
            </Button>
            <Button 
              size="sm" 
              onClick={onConnectClick}
              className="bg-[var(--color-postgres-blue)] hover:bg-[var(--color-postgres-blue)]/90 text-white shadow-sm"
            >
              <Database className="mr-2 h-4 w-4" />
              Connect
            </Button>
          </>
        )}
      </div>

      <UpdateDialog open={showUpdateDialog} onClose={() => setShowUpdateDialog(false)} />
    </header>
  )
}
