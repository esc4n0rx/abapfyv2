import { create } from 'zustand'
import { supabase } from '@renderer/lib/supabaseClient'
import { useAuthStore } from '@renderer/store/authStore'
import type { AgentSource } from '@renderer/store/agentsStore'

export type McpTransport = 'streamable_http' | 'stdio'

export interface McpServerItem {
  id: string
  slug: string
  name: string
  description: string
  transport: McpTransport
  url: string | null
  command: string | null
  args: string[]
  enabled: boolean
}

export interface McpBindingItem {
  id: string
  serverId: string
  agentSource: AgentSource
  agentId: string
  enabled: boolean
}

interface McpState {
  loaded: boolean
  loading: boolean
  servers: McpServerItem[]
  bindings: McpBindingItem[]
  error: string | null
  load: () => Promise<void>
  createPreset: (preset: 'sap_docs' | 'sap_abap') => Promise<void>
  updateServer: (id: string, changes: Partial<Omit<McpServerItem, 'id'>>) => Promise<void>
  removeServer: (id: string) => Promise<void>
  toggleBinding: (serverId: string, agentSource: AgentSource, agentId: string) => Promise<void>
  configsForAgent: (agentSource: AgentSource, agentId: string) => McpServerItem[]
  reset: () => void
}

interface ServerRow {
  id: string
  slug: string
  name: string
  description: string | null
  transport: McpTransport
  url: string | null
  command: string | null
  args: unknown
  enabled: boolean
}

interface BindingRow {
  id: string
  server_id: string
  agent_source: AgentSource
  agent_id: string
  enabled: boolean
}

function currentUserId(): string | null {
  return useAuthStore.getState().user?.id ?? null
}

function parseArgs(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function mapServer(row: ServerRow): McpServerItem {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description ?? '',
    transport: row.transport,
    url: row.url,
    command: row.command,
    args: parseArgs(row.args),
    enabled: row.enabled
  }
}

export const useMcpStore = create<McpState>((set, get) => ({
  loaded: false,
  loading: false,
  servers: [],
  bindings: [],
  error: null,

  load: async () => {
    const userId = currentUserId()
    if (!userId) return
    set({ loading: true, error: null })
    const [{ data: serverRows, error: serverError }, { data: bindingRows, error: bindingError }] =
      await Promise.all([
        supabase.from('mcp_servers').select('*').eq('user_id', userId).order('created_at'),
        supabase.from('mcp_agent_bindings').select('*').eq('user_id', userId)
      ])

    const error = serverError ?? bindingError
    if (error) {
      set({ loading: false, error: error.message })
      return
    }

    set({
      loaded: true,
      loading: false,
      servers: ((serverRows as ServerRow[] | null) ?? []).map(mapServer),
      bindings: ((bindingRows as BindingRow[] | null) ?? []).map((row) => ({
        id: row.id,
        serverId: row.server_id,
        agentSource: row.agent_source,
        agentId: row.agent_id,
        enabled: row.enabled
      }))
    })
  },

  createPreset: async (preset) => {
    const userId = currentUserId()
    if (!userId) return
    const base =
      preset === 'sap_docs'
        ? {
            slug: 'sap-docs',
            name: 'SAP Docs',
            description: 'Documentação SAP compartilhável entre vários agentes.',
            transport: 'streamable_http' as const,
            url: 'http://mcp-sap-docs.marianzeis.de/mcp',
            command: null,
            args: []
          }
        : {
            slug: 'sap-abap',
            name: 'SAP ABAP',
            description: 'Acesso governado ao SAP via ADT. Configure o perfil local antes de usar.',
            transport: 'stdio' as const,
            url: null,
            command: navigator.userAgent.includes('Windows') ? 'npx.cmd' : 'npx',
            args: [
              '--yes',
              '--prefer-online',
              '@coaspe/sap-abap-mcp@latest',
              'serve',
              '--profile',
              'DEV100'
            ]
          }

    let slug = base.slug
    if (get().servers.some((server) => server.slug === slug)) slug = `${slug}-${Date.now().toString(36)}`
    const { data, error } = await supabase
      .from('mcp_servers')
      .insert({ user_id: userId, ...base, slug, enabled: true })
      .select('*')
      .single()
    if (error || !data) {
      set({ error: error?.message ?? 'Não foi possível criar o servidor MCP.' })
      return
    }
    set((state) => ({ servers: [...state.servers, mapServer(data as ServerRow)], error: null }))
  },

  updateServer: async (id, changes) => {
    const userId = currentUserId()
    if (!userId) return
    const payload: Record<string, unknown> = {}
    if (changes.name !== undefined) payload.name = changes.name
    if (changes.description !== undefined) payload.description = changes.description || null
    if (changes.url !== undefined) payload.url = changes.url
    if (changes.command !== undefined) payload.command = changes.command
    if (changes.args !== undefined) payload.args = changes.args
    if (changes.enabled !== undefined) payload.enabled = changes.enabled
    const { error } = await supabase
      .from('mcp_servers')
      .update(payload)
      .eq('user_id', userId)
      .eq('id', id)
    if (error) {
      set({ error: error.message })
      return
    }
    set((state) => ({
      servers: state.servers.map((server) => (server.id === id ? { ...server, ...changes } : server)),
      error: null
    }))
  },

  removeServer: async (id) => {
    const userId = currentUserId()
    if (!userId) return
    const { error } = await supabase.from('mcp_servers').delete().eq('user_id', userId).eq('id', id)
    if (error) {
      set({ error: error.message })
      return
    }
    set((state) => ({
      servers: state.servers.filter((server) => server.id !== id),
      bindings: state.bindings.filter((binding) => binding.serverId !== id),
      error: null
    }))
  },

  toggleBinding: async (serverId, agentSource, agentId) => {
    const userId = currentUserId()
    if (!userId) return
    const existing = get().bindings.find(
      (binding) =>
        binding.serverId === serverId &&
        binding.agentSource === agentSource &&
        binding.agentId === agentId
    )
    if (existing) {
      const { error } = await supabase
        .from('mcp_agent_bindings')
        .delete()
        .eq('user_id', userId)
        .eq('id', existing.id)
      if (!error) {
        set((state) => ({ bindings: state.bindings.filter((item) => item.id !== existing.id) }))
      }
      return
    }

    const { data, error } = await supabase
      .from('mcp_agent_bindings')
      .insert({ user_id: userId, server_id: serverId, agent_source: agentSource, agent_id: agentId })
      .select('*')
      .single()
    if (error || !data) {
      set({ error: error?.message ?? 'Não foi possível vincular o agente.' })
      return
    }
    const row = data as BindingRow
    set((state) => ({
      bindings: [
        ...state.bindings,
        {
          id: row.id,
          serverId: row.server_id,
          agentSource: row.agent_source,
          agentId: row.agent_id,
          enabled: row.enabled
        }
      ],
      error: null
    }))
  },

  configsForAgent: (agentSource, agentId) => {
    const activeServerIds = new Set(
      get()
        .bindings.filter(
          (binding) =>
            binding.enabled && binding.agentSource === agentSource && binding.agentId === agentId
        )
        .map((binding) => binding.serverId)
    )
    return get().servers.filter((server) => server.enabled && activeServerIds.has(server.id))
  },

  reset: () => set({ loaded: false, loading: false, servers: [], bindings: [], error: null })
}))
