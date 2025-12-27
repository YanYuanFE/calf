import { useState } from 'react'
import { useConnectionStore } from '@/stores/connectionStore'
import { useRecentConnectionsStore, type RecentConnection } from '@/stores/recentConnectionsStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Database, Loader2, Link, Clock, X, Trash2 } from 'lucide-react'
import type { ConnectionConfig } from '@/types/database'

interface ConnectionDialogProps {
  onClose?: () => void
}

// 解析 PostgreSQL URL
function parseConnectionUrl(url: string): ConnectionConfig | null {
  try {
    const normalizedUrl = url.replace(/^postgres:\/\//, 'postgresql://')
    if (!normalizedUrl.startsWith('postgresql://')) {
      return null
    }
    const urlObj = new URL(normalizedUrl)
    return {
      host: urlObj.hostname || 'localhost',
      port: parseInt(urlObj.port) || 5432,
      database: urlObj.pathname.slice(1) || 'postgres',
      user: decodeURIComponent(urlObj.username) || 'postgres',
      password: decodeURIComponent(urlObj.password) || '',
      ssl: urlObj.searchParams.get('sslmode') === 'require',
    }
  } catch {
    return null
  }
}

// 格式化时间
function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function ConnectionDialog({ onClose }: ConnectionDialogProps) {
  const { connect, testConnection, status } = useConnectionStore()
  const { connections, addConnection, removeConnection } = useRecentConnectionsStore()
  const [connectionUrl, setConnectionUrl] = useState('')
  const [config, setConfig] = useState<ConnectionConfig>({
    host: 'localhost',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: '',
    ssl: false,
  })
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<{
    success: boolean
    message: string
  } | null>(null)
  const [urlError, setUrlError] = useState<string | null>(null)

  const handleUrlChange = (url: string) => {
    setConnectionUrl(url)
    setUrlError(null)
    if (url.trim()) {
      const parsed = parseConnectionUrl(url.trim())
      if (parsed) {
        setConfig(parsed)
      } else {
        setUrlError('Invalid connection URL format')
      }
    }
  }

  const handleConnect = async () => {
    await connect(config)
    if (useConnectionStore.getState().status === 'connected') {
      addConnection(config)
      onClose?.()
    }
  }

  const handleTest = async () => {
    setIsTesting(true)
    setTestResult(null)
    const success = await testConnection(config)
    setTestResult({
      success,
      message: success ? 'Connection successful!' : 'Connection failed',
    })
    setIsTesting(false)
  }

  const handleSelectRecent = (recent: RecentConnection) => {
    setConfig({ ...recent.config, password: '' })
    setConnectionUrl('')
    setTestResult(null)
  }

  const handleQuickConnect = async (recent: RecentConnection) => {
    // 如果没有密码，需要用户输入
    if (!config.password && recent.config.host === config.host) {
      // 当前选中的就是这个连接，直接连接
      await connect(config)
      if (useConnectionStore.getState().status === 'connected') {
        addConnection(config)
        onClose?.()
      }
    } else {
      // 选中这个连接
      handleSelectRecent(recent)
    }
  }

  const isConnecting = status === 'connecting'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 animate-fadeIn">
      <div className="w-full max-w-5xl rounded-xl bg-white border border-gray-200 shadow-lg animate-slideIn max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[var(--color-postgres-blue)] flex items-center justify-center">
              <Database className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[var(--color-foreground)]">Connect to PostgreSQL</h2>
              <p className="text-xs text-[var(--color-muted-foreground)]">Configure your database connection</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hover:bg-gray-100"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-5 gap-6 p-6">
          {connections.length > 0 && (
            <div className="col-span-2 border-r border-gray-100 pr-6">
              <div className="flex items-center gap-2 text-sm font-semibold mb-4 text-[var(--color-foreground)]">
                <Clock className="h-4 w-4 text-[var(--color-muted-foreground)]" />
                Recent Connections
              </div>
              <ScrollArea className="h-[400px] pr-2">
                <div className="space-y-2">
                  {connections.map((recent) => (
                    <div
                      key={recent.id}
                      className="group flex items-center gap-3 rounded-lg p-3 hover:bg-gray-100 cursor-pointer text-sm transition-colors border border-transparent hover:border-gray-200 bg-gray-50"
                      onClick={() => handleSelectRecent(recent)}
                      onDoubleClick={() => handleQuickConnect(recent)}
                    >
                      <div className="h-8 w-8 rounded-lg bg-[var(--color-postgres-blue)]/10 flex items-center justify-center shrink-0">
                        <Database className="h-4 w-4 text-[var(--color-postgres-blue)]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="truncate font-medium text-[var(--color-foreground)]">
                          {recent.config.database}
                        </div>
                        <div className="truncate text-xs text-[var(--color-muted-foreground)] font-mono">
                          {recent.config.user}@{recent.config.host}:{recent.config.port}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[var(--color-muted-foreground)] bg-gray-100 px-2 py-1 rounded">
                          {formatTimeAgo(recent.lastUsed)}
                        </span>
                        <button
                          className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-50 rounded-md transition-all"
                          onClick={(e) => {
                            e.stopPropagation()
                            removeConnection(recent.id)
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-[var(--color-destructive)]" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          <div className={connections.length > 0 ? 'col-span-3 space-y-4' : 'col-span-5 space-y-4'}>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold mb-2 flex items-center gap-2 text-[var(--color-foreground)]">
                  <Link className="h-4 w-4 text-[var(--color-muted-foreground)]" />
                  Connection URL
                </label>
                <Input
                  value={connectionUrl}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  placeholder="postgresql://user:pass@host:port/db"
                  className="font-mono text-sm border-gray-200 focus:border-[var(--color-primary)]"
                />
                {urlError && (
                  <p className="text-xs text-[var(--color-destructive)] mt-2 flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-[var(--color-destructive)]" />
                    {urlError}
                  </p>
                )}
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-100" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-3 text-[var(--color-muted-foreground)] font-medium">OR</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="text-sm font-semibold mb-2 block text-[var(--color-foreground)]">Host</label>
                  <Input
                    value={config.host}
                    onChange={(e) => setConfig({ ...config, host: e.target.value })}
                    placeholder="localhost"
                    className="border-gray-200 focus:border-[var(--color-primary)]"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold mb-2 block text-[var(--color-foreground)]">Port</label>
                  <Input
                    type="number"
                    value={config.port}
                    onChange={(e) => setConfig({ ...config, port: parseInt(e.target.value) || 5432 })}
                    placeholder="5432"
                    className="border-gray-200 focus:border-[var(--color-primary)]"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold mb-2 block text-[var(--color-foreground)]">Database</label>
                <Input
                  value={config.database}
                  onChange={(e) => setConfig({ ...config, database: e.target.value })}
                  placeholder="postgres"
                  className="border-gray-200 focus:border-[var(--color-primary)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold mb-2 block text-[var(--color-foreground)]">User</label>
                  <Input
                    value={config.user}
                    onChange={(e) => setConfig({ ...config, user: e.target.value })}
                    placeholder="postgres"
                    className="border-gray-200 focus:border-[var(--color-primary)]"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold mb-2 block text-[var(--color-foreground)]">Password</label>
                  <Input
                    type="password"
                    value={config.password}
                    onChange={(e) => setConfig({ ...config, password: e.target.value })}
                    placeholder="password"
                    className="border-gray-200 focus:border-[var(--color-primary)]"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100">
                <input
                  type="checkbox"
                  id="ssl"
                  checked={config.ssl}
                  onChange={(e) => setConfig({ ...config, ssl: e.target.checked })}
                  className="rounded border-gray-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)]/20"
                />
                <label htmlFor="ssl" className="text-sm font-medium text-[var(--color-foreground)] cursor-pointer">
                  Use SSL connection
                </label>
              </div>

              {testResult && (
                <div
                  className={`rounded-lg p-3 text-sm border transition-colors ${testResult.success
                      ? 'bg-green-50 text-green-700 border-green-200'
                      : 'bg-red-50 text-red-700 border-red-200'
                    }`}
                >
                  <div className="flex items-center gap-2">
                    {testResult.success ? (
                      <div className="h-2 w-2 rounded-full bg-green-500" />
                    ) : (
                      <div className="h-2 w-2 rounded-full bg-red-500" />
                    )}
                    {testResult.message}
                  </div>
                </div>
              )}

              {status === 'error' && (
                <div className="rounded-lg p-3 text-sm text-[var(--color-error)] bg-red-50 border border-red-200">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-red-500" />
                    {useConnectionStore.getState().error}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
              <Button
                variant="outline"
                onClick={handleTest}
                disabled={isTesting}
              >
                {isTesting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Test Connection
              </Button>
              <Button
                onClick={handleConnect}
                disabled={isConnecting}
                className="bg-[var(--color-postgres-blue)] hover:bg-[var(--color-postgres-blue)]/90 text-white"
              >
                {isConnecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Connect
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
