import { ElectronAPI } from '@electron-toolkit/preload'

export interface WindowControlsApi {
  minimize: () => Promise<void>
  maximizeToggle: () => Promise<void>
  close: () => Promise<void>
  isMaximized: () => Promise<boolean>
  onMaximizedChange: (callback: (isMaximized: boolean) => void) => () => void
}

export interface Api {
  windowControls: WindowControlsApi
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: Api
  }
}
