import { create } from 'zustand'
import { supabase } from '@renderer/lib/supabaseClient'
import { useAuthStore } from '@renderer/store/authStore'

export type AgentSource = 'default' | 'custom'

export interface AgentItem {
  id: string
  source: AgentSource
  name: string
  description: string
  content: string
  flowKey: string | null
}

interface DefaultAgentRow {
  id: string
  name: string
  description: string
  content: string
  flow_key: string | null
  sort_order: number
}

interface UserAgentRow {
  id: string
  slug: string
  name: string
  description: string | null
  content: string
}

interface AgentsState {
  loaded: boolean
  loading: boolean
  agents: AgentItem[]
  load: () => Promise<void>
  importAgent: (input: { name: string; description: string; content: string }) => Promise<void>
  removeCustomAgent: (id: string) => Promise<void>
  getById: (source: AgentSource, id: string) => AgentItem | undefined
  reset: () => void
}

function currentUserId(): string | null {
  return useAuthStore.getState().user?.id ?? null
}

function slugify(value: string): string {
  const base = value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return base || 'agente'
}

export const useAgentsStore = create<AgentsState>((set, get) => ({
  loaded: false,
  loading: false,
  agents: [],

  load: async () => {
    const userId = currentUserId()
    if (!userId) return

    set({ loading: true })

    const [{ data: defaultRows }, { data: customRows }] = await Promise.all([
      supabase.from('default_agents').select('*').order('sort_order', { ascending: true }),
      supabase
        .from('user_agents')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true })
    ])

    const defaults: AgentItem[] = ((defaultRows as DefaultAgentRow[] | null) ?? []).map((row) => ({
      id: row.id,
      source: 'default',
      name: row.name,
      description: row.description,
      content: row.content,
      flowKey: row.flow_key
    }))

    const customs: AgentItem[] = ((customRows as UserAgentRow[] | null) ?? []).map((row) => ({
      id: row.id,
      source: 'custom',
      name: row.name,
      description: row.description ?? '',
      content: row.content,
      flowKey: null
    }))

    set({ loaded: true, loading: false, agents: [...defaults, ...customs] })
  },

  importAgent: async (input) => {
    const userId = currentUserId()
    if (!userId) return

    const existingSlugs = new Set(
      get()
        .agents.filter((agent) => agent.source === 'custom')
        .map((agent) => agent.id)
    )
    let slug = slugify(input.name)
    if (existingSlugs.has(slug)) {
      slug = `${slug}-${Date.now().toString(36)}`
    }

    const { data, error } = await supabase
      .from('user_agents')
      .insert({
        user_id: userId,
        slug,
        name: input.name.trim(),
        description: input.description.trim() || null,
        content: input.content
      })
      .select('*')
      .single()

    if (error || !data) return

    const row = data as UserAgentRow
    set((state) => ({
      agents: [
        ...state.agents,
        {
          id: row.id,
          source: 'custom',
          name: row.name,
          description: row.description ?? '',
          content: row.content,
          flowKey: null
        }
      ]
    }))
  },

  removeCustomAgent: async (id) => {
    const userId = currentUserId()
    if (!userId) return

    await supabase.from('user_agents').delete().eq('user_id', userId).eq('id', id)

    set((state) => ({
      agents: state.agents.filter((agent) => !(agent.source === 'custom' && agent.id === id))
    }))
  },

  getById: (source, id) => get().agents.find((agent) => agent.source === source && agent.id === id),

  reset: () => set({ loaded: false, loading: false, agents: [] })
}))
