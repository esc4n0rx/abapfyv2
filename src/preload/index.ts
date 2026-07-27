import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const windowControls = {
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximizeToggle: () => ipcRenderer.invoke('window:maximizeToggle'),
  close: () => ipcRenderer.invoke('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  onMaximizedChange: (callback: (isMaximized: boolean) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, isMaximized: boolean): void =>
      callback(isMaximized)
    ipcRenderer.on('window:maximized-change', listener)
    return () => ipcRenderer.removeListener('window:maximized-change', listener)
  }
}

interface UpdateAvailableInfo {
  version: string
  releaseNotes: string | null
  releaseDate: string
}

interface UpdateProgressInfo {
  percent: number
  bytesPerSecond: number
  transferred: number
  total: number
}

const updates = {
  getVersion: () => ipcRenderer.invoke('updates:getVersion') as Promise<string>,
  check: () => ipcRenderer.invoke('updates:check'),
  download: () => ipcRenderer.invoke('updates:download'),
  install: () => ipcRenderer.invoke('updates:install'),
  onChecking: (callback: () => void) => {
    const listener = (): void => callback()
    ipcRenderer.on('updates:checking', listener)
    return () => ipcRenderer.removeListener('updates:checking', listener)
  },
  onAvailable: (callback: (info: UpdateAvailableInfo) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, info: UpdateAvailableInfo): void =>
      callback(info)
    ipcRenderer.on('updates:available', listener)
    return () => ipcRenderer.removeListener('updates:available', listener)
  },
  onNotAvailable: (callback: () => void) => {
    const listener = (): void => callback()
    ipcRenderer.on('updates:not-available', listener)
    return () => ipcRenderer.removeListener('updates:not-available', listener)
  },
  onProgress: (callback: (progress: UpdateProgressInfo) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, progress: UpdateProgressInfo): void =>
      callback(progress)
    ipcRenderer.on('updates:progress', listener)
    return () => ipcRenderer.removeListener('updates:progress', listener)
  },
  onDownloaded: (callback: () => void) => {
    const listener = (): void => callback()
    ipcRenderer.on('updates:downloaded', listener)
    return () => ipcRenderer.removeListener('updates:downloaded', listener)
  },
  onError: (callback: (message: string) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, message: string): void =>
      callback(message)
    ipcRenderer.on('updates:error', listener)
    return () => ipcRenderer.removeListener('updates:error', listener)
  }
}

const api = {
  windowControls,
  updates
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-expect-error contextIsolation is always enabled; this branch is unreachable in practice
  window.electron = electronAPI
  // @ts-expect-error contextIsolation is always enabled; this branch is unreachable in practice
  window.api = api
}
