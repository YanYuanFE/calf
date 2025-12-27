import { useEffect, useState, useRef } from 'react'
import { X, Loader2, ArrowDownCircle, CheckCircle, ExternalLink, Download } from 'lucide-react'

interface UpdateInfo {
  version: string
  files: Array<{
    url: string
    size: number
  }>
  releaseDate: string
  releaseName: string
}

// GitHub Release 下载地址
const GITHUB_RELEASE_URL = 'https://github.com/YanYuanFE/calf/releases/latest'

interface UpdateDialogProps {
  open: boolean
  onClose: () => void
}

// 扩展 Window 接口以支持 electron 事件
declare global {
  interface Window {
    electron: {
      on: (event: string, listener: (event: unknown, ...args: unknown[]) => void) => void
      off: (event: string, listener: (event: unknown, ...args: unknown[]) => void) => void
    }
  }
}

export function UpdateDialog({ open, onClose }: UpdateDialogProps) {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [status, setStatus] = useState<'checking' | 'available' | 'downloading' | 'downloaded' | 'error' | 'upToDate'>('checking')
  const statusRef = useRef(status)

  // 保持 statusRef 同步
  useEffect(() => {
    statusRef.current = status
  }, [status])

  useEffect(() => {
    if (!open) return

    // 重置状态
    setStatus('checking')
    setDownloadProgress(0)

    // 超时处理：10秒后显示错误
    const timeoutId = setTimeout(() => {
      if (statusRef.current === 'checking') {
        setStatus('error')
      }
    }, 10000)

    window.api.checkForUpdates()

    const handleUpdateNotAvailable = (..._args: unknown[]) => {
      clearTimeout(timeoutId)
      const info = _args[1] as UpdateInfo | undefined
      if (info) {
        setUpdateInfo(info)
      }
      setStatus('upToDate')
    }

    const handleUpdateAvailable = (..._args: unknown[]) => {
      clearTimeout(timeoutId)
      const info = _args[1] as UpdateInfo | undefined
      if (info) {
        setUpdateInfo(info)
        setStatus('available')
      }
    }

    const handleDownloadProgress = (..._args: unknown[]) => {
      const progress = _args[1] as { percent: number } | undefined
      if (progress) {
        setDownloadProgress(Math.round(progress.percent))
      }
    }

    const handleUpdateDownloaded = () => {
      setStatus('downloaded')
    }

    const handleUpdateError = () => {
      clearTimeout(timeoutId)
      setStatus('error')
    }

    window.electron.on('update-available', handleUpdateAvailable)
    window.electron.on('update-not-available', handleUpdateNotAvailable)
    window.electron.on('update-download-progress', handleDownloadProgress)
    window.electron.on('update-downloaded', handleUpdateDownloaded)
    window.electron.on('update-error', handleUpdateError)

    return () => {
      clearTimeout(timeoutId)
      window.electron.off('update-available', handleUpdateAvailable)
      window.electron.off('update-not-available', handleUpdateNotAvailable)
      window.electron.off('update-download-progress', handleDownloadProgress)
      window.electron.off('update-downloaded', handleUpdateDownloaded)
      window.electron.off('update-error', handleUpdateError)
    }
  }, [open])

  const handleDownload = () => {
    setStatus('downloading')
    window.api.downloadUpdate()
  }

  const handleInstall = () => {
    window.api.quitAndInstall()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-[var(--color-postgres-blue)] text-white">
          <div className="flex items-center gap-2">
            <ArrowDownCircle className="h-5 w-5" />
            <h3 className="font-semibold">
              {status === 'checking' && '检查更新...'}
              {status === 'available' && '发现新版本'}
              {status === 'downloading' && '下载中...'}
              {status === 'downloaded' && '下载完成'}
              {status === 'upToDate' && '已是最新版本'}
              {status === 'error' && '更新检查失败'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {status === 'checking' && (
            <div className="flex flex-col items-center py-6">
              <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)] mb-3" />
              <p className="text-sm text-[var(--color-muted-foreground)]">正在检查更新...</p>
            </div>
          )}

          {status === 'available' && updateInfo && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                  <Download className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-[var(--color-foreground)]">
                    版本 {updateInfo.version}
                  </p>
                  <p className="text-sm text-[var(--color-muted-foreground)]">
                    {updateInfo.releaseName || '新版本可用'}
                  </p>
                </div>
              </div>
              <p className="text-sm text-[var(--color-muted-foreground)]">
                发布时间: {new Date(updateInfo.releaseDate).toLocaleDateString('zh-CN')}
              </p>
              <div className="flex flex-col gap-2">
                <button
                  onClick={handleDownload}
                  className="flex items-center justify-center gap-2 bg-[var(--color-postgres-blue)] hover:bg-[var(--color-postgres-blue)]/90 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors"
                >
                  <Download className="h-4 w-4" />
                  自动下载更新
                </button>
                <button
                  onClick={() => window.open(GITHUB_RELEASE_URL, '_blank')}
                  className="flex items-center justify-center gap-2 border border-gray-200 hover:bg-gray-50 py-2 px-4 rounded-lg text-sm font-medium transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                  手动下载
                </button>
                <button
                  onClick={onClose}
                  className="text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
                >
                  稍后
                </button>
              </div>
            </div>
          )}

          {status === 'downloading' && (
            <div className="space-y-4">
              <div className="flex flex-col items-center py-4">
                <div className="relative h-16 w-16">
                  <svg className="transform -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-gray-200"
                      stroke="currentColor"
                      strokeWidth="3"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className="text-[var(--color-primary)]"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      fill="none"
                      strokeDasharray={`${downloadProgress}, 100`}
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-sm font-medium">
                    {downloadProgress}%
                  </span>
                </div>
                <p className="text-sm text-[var(--color-muted-foreground)] mt-2">
                  正在下载 {updateInfo?.version}...
                </p>
              </div>
            </div>
          )}

          {status === 'downloaded' && (
            <div className="space-y-4">
              <div className="flex flex-col items-center py-4">
                <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mb-3">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <p className="text-sm text-[var(--color-muted-foreground)]">
                  更新已下载完成
                </p>
                <p className="text-xs text-[var(--color-muted-foreground)] mt-1">
                  重启应用后即可使用新版本
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleInstall}
                  className="flex-1 bg-[var(--color-postgres-blue)] hover:bg-[var(--color-postgres-blue)]/90 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors"
                >
                  重启并更新
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 border border-gray-200 hover:bg-gray-50 py-2 px-4 rounded-lg text-sm font-medium transition-colors"
                >
                  下次重启
                </button>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center py-4">
              <p className="text-sm text-[var(--color-error)] mb-3">
                {status === 'error' ? '检查更新失败，请稍后重试' : '开发环境无法检查更新'}
              </p>
              <button
                onClick={() => {
                  setStatus('checking')
                  window.api.checkForUpdates()
                }}
                className="text-sm text-[var(--color-primary)] hover:underline"
              >
                重新检查
              </button>
            </div>
          )}

          {status === 'upToDate' && (
            <div className="flex flex-col items-center py-6">
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mb-3">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <p className="text-sm text-[var(--color-foreground)] mb-1">
                当前是最新版本
              </p>
              <p className="text-xs text-[var(--color-muted-foreground)]">
                v{updateInfo?.version || '1.0.0'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
