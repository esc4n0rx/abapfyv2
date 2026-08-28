import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    // Bundle the MCP client into the main process. Keeping it external makes the
    // packaged app depend on pnpm's node_modules layout and can omit cross-spawn.
    plugins: [externalizeDepsPlugin({ exclude: ['@modelcontextprotocol/sdk', 'cross-spawn'] })]
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src')
      }
    },
    plugins: [react()]
  }
})
