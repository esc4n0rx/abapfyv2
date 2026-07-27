import { app, ipcMain, BrowserWindow } from 'electron'
import electronUpdater from 'electron-updater'

const { autoUpdater } = electronUpdater

autoUpdater.autoDownload = false
autoUpdater.autoInstallOnAppQuit = false

export function setupAutoUpdater(mainWindow: BrowserWindow): void {
  autoUpdater.on('checking-for-update', () => {
    mainWindow.webContents.send('updates:checking')
  })

  autoUpdater.on('update-available', (info) => {
    mainWindow.webContents.send('updates:available', {
      version: info.version,
      releaseNotes: typeof info.releaseNotes === 'string' ? info.releaseNotes : null,
      releaseDate: info.releaseDate
    })
  })

  autoUpdater.on('update-not-available', () => {
    mainWindow.webContents.send('updates:not-available')
  })

  autoUpdater.on('download-progress', (progress) => {
    mainWindow.webContents.send('updates:progress', {
      percent: progress.percent,
      bytesPerSecond: progress.bytesPerSecond,
      transferred: progress.transferred,
      total: progress.total
    })
  })

  autoUpdater.on('update-downloaded', () => {
    mainWindow.webContents.send('updates:downloaded')
  })

  autoUpdater.on('error', (error) => {
    mainWindow.webContents.send('updates:error', error.message)
  })

  ipcMain.handle('updates:getVersion', () => app.getVersion())

  ipcMain.handle('updates:check', async () => {
    if (!app.isPackaged) {
      mainWindow.webContents.send('updates:error', 'Verificação de atualizações indisponível em modo de desenvolvimento.')
      return
    }
    await autoUpdater.checkForUpdates()
  })

  ipcMain.handle('updates:download', async () => {
    if (!app.isPackaged) return
    await autoUpdater.downloadUpdate()
  })

  ipcMain.handle('updates:install', () => {
    autoUpdater.quitAndInstall()
  })
}
