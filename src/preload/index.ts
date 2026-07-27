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

const api = {
  windowControls
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
