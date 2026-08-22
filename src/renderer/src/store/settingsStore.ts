import { create } from 'zustand'
import { supabase } from '@renderer/lib/supabaseClient'
import { useAuthStore } from '@renderer/store/authStore'
import { applyTheme, DEFAULT_THEME_ID, getTheme } from '@renderer/lib/themes'
import type { AiProviderId } from '@renderer/lib/aiProviders'

interface ApiKeyStatus {
  configured: boolean
  updatedAt: string | null
}

const EMPTY_KEY_STATUS: Record<AiProviderId, ApiKeyStatus> = {
  openai: { configured: false, updatedAt: null },
  gemini: { configured: false, updatedAt: null },
  claude: { configured: false, updatedAt: null }
}

interface SettingsState {
  loaded: boolean
  loading: boolean
  theme: string
  defaultProvider: AiProviderId | null
  defaultModel: string | null
  apiKeys: Record<AiProviderId, ApiKeyStatus>
  load: () => Promise<void>
  setTheme: (themeId: string) => Promise<void>
  setDefaultModel: (provider: AiProviderId, model: string) => Promise<void>
  saveApiKey: (provider: AiProviderId, apiKey: string) => Promise<void>
  removeApiKey: (provider: AiProviderId) => Promise<void>
  reset: () => void
}

function currentUserId(): string | null {
  return useAuthStore.getState().user?.id ?? null
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  loaded: false,
  loading: false,
  theme: DEFAULT_THEME_ID,
  defaultProvider: null,
  defaultModel: null,
  apiKeys: EMPTY_KEY_STATUS,

  load: async () => {
    const userId = currentUserId()
    if (!userId) return

    set({ loading: true })

    const [{ data: settingsRow }, { data: keyRows }] = await Promise.all([
      supabase
        .from('user_settings')
        .select('theme, default_ai_provider, default_ai_model')
        .eq('user_id', userId)
        .maybeSingle(),
      supabase.from('ai_api_keys').select('provider, updated_at').eq('user_id', userId)
    ])

    const apiKeys: Record<AiProviderId, ApiKeyStatus> = {
      openai: { configured: false, updatedAt: null },
      gemini: { configured: false, updatedAt: null },
      claude: { configured: false, updatedAt: null }
    }

    keyRows?.forEach((row) => {
      const provider = row.provider as AiProviderId
      apiKeys[provider] = { configured: true, updatedAt: row.updated_at }
    })

    const theme = getTheme(settingsRow?.theme).id
    applyTheme(theme)

    set({
      loaded: true,
      loading: false,
      theme,
      defaultProvider: (settingsRow?.default_ai_provider as AiProviderId | null) ?? null,
      defaultModel: settingsRow?.default_ai_model ?? null,
      apiKeys
    })
  },

  setTheme: async (themeId) => {
    applyTheme(themeId)
    set({ theme: themeId })

    const userId = currentUserId()
    if (!userId) return

    await supabase.from('user_settings').upsert({ user_id: userId, theme: themeId })
  },

  setDefaultModel: async (provider, model) => {
    set({ defaultProvider: provider, defaultModel: model })

    const userId = currentUserId()
    if (!userId) return

    await supabase.from('user_settings').upsert({
      user_id: userId,
      default_ai_provider: provider,
      default_ai_model: model
    })
  },

  saveApiKey: async (provider, apiKey) => {
    const userId = currentUserId()
    if (!userId || !apiKey.trim()) return

    const { data, error } = await supabase
      .from('ai_api_keys')
      .upsert(
        { user_id: userId, provider, api_key: apiKey.trim() },
        { onConflict: 'user_id,provider' }
      )
      .select('updated_at')
      .single()

    if (error) return

    set((state) => ({
      apiKeys: {
        ...state.apiKeys,
        [provider]: { configured: true, updatedAt: data?.updated_at ?? new Date().toISOString() }
      }
    }))
  },

  removeApiKey: async (provider) => {
    const userId = currentUserId()
    if (!userId) return

    await supabase.from('ai_api_keys').delete().eq('user_id', userId).eq('provider', provider)

    set((state) => ({
      apiKeys: { ...state.apiKeys, [provider]: { configured: false, updatedAt: null } }
    }))

    const { defaultProvider } = get()
    if (defaultProvider === provider) {
      set({ defaultProvider: null, defaultModel: null })
      await supabase
        .from('user_settings')
        .upsert({ user_id: userId, default_ai_provider: null, default_ai_model: null })
    }
  },

  reset: () => {
    applyTheme(DEFAULT_THEME_ID)
    set({
      loaded: false,
      loading: false,
      theme: DEFAULT_THEME_ID,
      defaultProvider: null,
      defaultModel: null,
      apiKeys: EMPTY_KEY_STATUS
    })
  }
}))
