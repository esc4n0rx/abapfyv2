import { app, shell, BrowserWindow, dialog, ipcMain, type MessageBoxOptions } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { setupAutoUpdater } from './updater'
import {
  callMcpTool,
  closeMcpClients,
  listMcpTools,
  mcpToolRequiresConfirmation,
  type McpServerConfig
} from './mcp'

let mainWindow: BrowserWindow | null = null
const approvedStdioConfigs = new Set<string>()

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    show: false,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#010102',
    roundedCorners: true,
    autoHideMenuBar: true,
    icon,
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false,
      contextIsolation: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.on('maximize', () => {
    mainWindow?.webContents.send('window:maximized-change', true)
  })

  mainWindow.on('unmaximize', () => {
    mainWindow?.webContents.send('window:maximized-change', false)
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function registerWindowControlIpc(): void {
  ipcMain.handle('window:minimize', () => {
    mainWindow?.minimize()
  })

  ipcMain.handle('window:maximizeToggle', () => {
    if (!mainWindow) return
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow.maximize()
    }
  })

  ipcMain.handle('window:close', () => {
    mainWindow?.close()
  })

  ipcMain.handle('window:isMaximized', () => {
    return mainWindow?.isMaximized() ?? false
  })
}

function registerMcpIpc(): void {
  ipcMain.handle('mcp:listTools', async (_event, configs: McpServerConfig[]) => {
    for (const config of configs.filter((item) => item.transport === 'stdio')) {
      const approvalKey = JSON.stringify([config.id, config.command, config.args])
      if (approvedStdioConfigs.has(approvalKey)) continue
      const options: MessageBoxOptions = {
        type: 'warning',
        buttons: ['Cancelar', 'Iniciar servidor'],
        defaultId: 0,
        cancelId: 0,
        title: 'Iniciar servidor MCP local',
        message: `O Abapfy precisa iniciar o servidor local ${config.name}.`,
        detail: `Executável: ${config.command ?? ''}\nArgumentos: ${config.args.join(' ')}\n\nConfirme apenas se reconhece esta configuração. A autorização vale até fechar o aplicativo.`,
        noLink: true
      }
      const answer = mainWindow
        ? await dialog.showMessageBox(mainWindow, options)
        : await dialog.showMessageBox(options)
      if (answer.response !== 1) throw new Error(`Inicialização de ${config.name} cancelada.`)
      approvedStdioConfigs.add(approvalKey)
    }
    return listMcpTools(configs)
  })
  ipcMain.handle(
    'mcp:callTool',
    async (_event, config: McpServerConfig, toolName: string, args: Record<string, unknown>) => {
      if (mcpToolRequiresConfirmation(config.id, toolName)) {
        const options: MessageBoxOptions = {
          type: 'warning',
          buttons: ['Cancelar', 'Autorizar uma vez'],
          defaultId: 0,
          cancelId: 0,
          title: 'Autorizar ferramenta MCP',
          message: `${config.name} solicita a ferramenta ${toolName}.`,
          detail: `Esta ferramenta pode alterar dados. Confira o servidor/perfil e os argumentos antes de autorizar.\n\nConfiguração: ${config.command ?? config.url ?? ''} ${config.args.join(' ')}\n\nArgumentos: ${JSON.stringify(args, null, 2)}`,
          noLink: true
        }
        const answer = mainWindow
          ? await dialog.showMessageBox(mainWindow, options)
          : await dialog.showMessageBox(options)
        if (answer.response !== 1) {
          return { isError: true, error: 'Chamada MCP recusada pelo usuário.' }
        }
      }
      return callMcpTool(config, toolName, args)
    }
  )
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.abapfy.app')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  registerWindowControlIpc()
  registerMcpIpc()
  createWindow()

  if (mainWindow) {
    setupAutoUpdater(mainWindow)
  }

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  void closeMcpClients()
})
