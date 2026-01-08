import { app, shell, BrowserWindow, ipcMain, nativeImage } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { setupIpcHandlers } from './ipc'
import updater from 'electron-updater'

const { autoUpdater } = updater

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.cjs'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // 开发环境加载 vite dev server，生产环境加载打包后的文件
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// 配置更新检查（仅检查，不自动下载）
function setupUpdateChecker(): void {
  // 禁用自动下载，只检查更新
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = false

  // 开发环境设置日志
  if (is.dev) {
    autoUpdater.logger = console
    autoUpdater.logger.info = console.log
    autoUpdater.logger.warn = console.warn
    autoUpdater.logger.error = console.error
  }

  // 只检查更新，不通知（由用户手动触发检查）
  autoUpdater.checkForUpdates().catch((error) => {
    console.log('检查更新失败:', error)
  })

  // 更新事件处理
  autoUpdater.on('error', (error) => {
    console.log('更新错误:', error)
    if (mainWindow) {
      mainWindow.webContents.send('update-error', error.message || error)
    }
  })

  autoUpdater.on('checking-for-update', () => {
    console.log('检查更新...')
  })

  autoUpdater.on('update-available', (info) => {
    console.log('发现新版本:', info.version)
    if (mainWindow) {
      mainWindow.webContents.send('update-available', info)
    }
  })

  autoUpdater.on('update-not-available', (info) => {
    console.log('当前是最新版本:', info.version)
    if (mainWindow) {
      mainWindow.webContents.send('update-not-available', info)
    }
  })
}

// IPC 处理更新相关请求
ipcMain.handle('check-for-updates', async () => {
  if (is.dev) {
    // 开发环境模拟返回"已是最新版本"
    if (mainWindow) {
      mainWindow.webContents.send('update-not-available', {
        version: app.getVersion(),
      })
    }
    return
  }
  await autoUpdater.checkForUpdates()
})

// 打开下载页面（使用系统默认浏览器）
ipcMain.handle('open-download-page', (_, url: string) => {
  shell.openExternal(url)
})

// 设置 IPC 处理器
setupIpcHandlers()

app.whenReady().then(() => {
  // 设置应用 ID (Windows)
  electronApp.setAppUserModelId('com.postgresql-app')

  // macOS 开发环境下设置 Dock 图标
  if (process.platform === 'darwin' && is.dev) {
    try {
      const iconPath = join(__dirname, '../../public/icon.png')
      console.log('Dock 图标路径:', iconPath)
      const icon = nativeImage.createFromPath(iconPath)
      console.log('图标是否为空:', icon.isEmpty(), '尺寸:', icon.getSize())
      if (!icon.isEmpty()) {
        app.dock?.setIcon(icon)
        console.log('Dock 图标设置成功')
      }
    } catch (e) {
      console.log('设置 Dock 图标失败:', e)
    }
  }

  // 开发环境下的优化
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()
  setupUpdateChecker()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
