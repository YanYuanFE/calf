import { app, shell, BrowserWindow, ipcMain } from 'electron'
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

// 配置自动更新
function setupAutoUpdater(): void {
  // 开发环境禁用自动更新
  if (is.dev) {
    autoUpdater.logger = console
    autoUpdater.logger.info = console.log
    autoUpdater.logger.warn = console.warn
    autoUpdater.logger.error = console.error
  }

  // 检查更新
  autoUpdater.checkForUpdatesAndNotify()

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

  autoUpdater.on('download-progress', (progressObj) => {
    if (mainWindow) {
      mainWindow.webContents.send('update-download-progress', progressObj)
    }
  })

  autoUpdater.on('update-downloaded', (info) => {
    console.log('更新下载完成:', info.version)
    if (mainWindow) {
      mainWindow.webContents.send('update-downloaded', info)
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

ipcMain.handle('download-update', async () => {
  if (!is.dev) {
    await autoUpdater.downloadUpdate()
  }
})

ipcMain.handle('quit-and-install', () => {
  // 使用 setImmediate 确保 IPC 响应完成后再退出
  setImmediate(() => {
    app.removeAllListeners('window-all-closed')
    autoUpdater.quitAndInstall()
  })
})

// 设置 IPC 处理器
setupIpcHandlers()

app.whenReady().then(() => {
  // 设置应用 ID (Windows)
  electronApp.setAppUserModelId('com.postgresql-app')

  // 开发环境下的优化
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()
  setupAutoUpdater()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
