import { ElectronAPI } from '@electron-toolkit/preload'

export interface WindowControlsApi {
  minimize: () => Promise<void>
  maximizeToggle: () => Promise<void>
  close: () => Promise<void>
  isMaximized: () => Promise<boolean>
  onMaximizedChange: (callback: (isMaximized: boolean) => void) => () => void
}

export interface UpdateAvailableInfo {
  version: string
  releaseNotes: string | null
  releaseDate: string
}

export interface UpdateProgressInfo {
  percent: number
  bytesPerSecond: number
  transferred: number
  total: number
}

export interface UpdatesApi {
  getVersion: () => Promise<string>
  check: () => Promise<void>
  download: () => Promise<void>
  install: () => Promise<void>
  onChecking: (callback: () => void) => () => void
  onAvailable: (callback: (info: UpdateAvailableInfo) => void) => () => void
  onNotAvailable: (callback: () => void) => () => void
  onProgress: (callback: (progress: UpdateProgressInfo) => void) => () => void
  onDownloaded: (callback: () => void) => () => void
  onError: (callback: (message: string) => void) => () => void
}

export interface McpServerConfig {
  id: string
  name: string
  transport: 'streamable_http' | 'stdio'
  url: string | null
  command: string | null
  args: string[]
}

export interface McpToolInfo {
  qualifiedName: string
  serverId: string
  serverName: string
  name: string
  description: string
  inputSchema: Record<string, unknown>
  requiresConfirmation: boolean
}

export interface McpApi {
  listTools: (configs: McpServerConfig[]) => Promise<McpToolInfo[]>
  callTool: (
    config: McpServerConfig,
    toolName: string,
    args: Record<string, unknown>
  ) => Promise<unknown>
}

export interface Api {
  windowControls: WindowControlsApi
  updates: UpdatesApi
  mcp: McpApi
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: Api
  }
}
