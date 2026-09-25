import { create } from 'zustand'
import { supabase } from '@renderer/lib/supabaseClient'
import { useAuthStore } from './authStore'
import type { AiProviderId } from '@renderer/lib/aiProviders'

export interface ManagedAiModel {
  provider: AiProviderId
  model_id: string
  label: string
  description: string
  enabled: boolean
}

interface AiModelsState {
  models: ManagedAiModel[]
  blocks: { user_id: string; provider: AiProviderId; model_id: string }[]
  error: string | null
  load: () => Promise<void>
  save: (model: ManagedAiModel) => Promise<void>
  remove: (provider: AiProviderId, modelId: string) => Promise<void>
  setBlocked: (userId: string, provider: AiProviderId, modelId: string, blocked: boolean) => Promise<void>
  availableFor: (userId: string | null) => ManagedAiModel[]
}

function requireAdmin(): void {
  if (!useAuthStore.getState().role) throw new Error('Acesso de administrador necessário.')
}

export const useAiModelsStore = create<AiModelsState>((set, get) => ({
  models: [], blocks: [], error: null,
  load: async () => {
    const user = useAuthStore.getState().user
    if (!user) return
    const [modelsResult, blocksResult] = await Promise.all([
      supabase.from('ai_models').select('provider, model_id, label, description, enabled').order('provider').order('label'),
      supabase.from('ai_model_blocks').select('user_id, provider, model_id')
    ])
    const error = modelsResult.error ?? blocksResult.error
    if (error) { set({ error: error.message }); return }
    set({ models: (modelsResult.data ?? []) as ManagedAiModel[], blocks: (blocksResult.data ?? []) as AiModelsState['blocks'], error: null })
  },
  save: async (model) => {
    requireAdmin()
    const { error } = await supabase.from('ai_models').upsert(model, { onConflict: 'provider,model_id' })
    if (error) throw error
    await get().load()
  },
  remove: async (provider, modelId) => {
    requireAdmin()
    const { error } = await supabase.from('ai_models').delete().eq('provider', provider).eq('model_id', modelId)
    if (error) throw error
    await get().load()
  },
  setBlocked: async (userId, provider, modelId, blocked) => {
    requireAdmin()
    const query = blocked
      ? supabase.from('ai_model_blocks').upsert({ user_id: userId, provider, model_id: modelId })
      : supabase.from('ai_model_blocks').delete().eq('user_id', userId).eq('provider', provider).eq('model_id', modelId)
    const { error } = await query
    if (error) throw error
    await get().load()
  },
  availableFor: (userId) => get().models.filter((model) => model.enabled &&
    !get().blocks.some((block) => block.user_id === userId && block.provider === model.provider && block.model_id === model.model_id))
}))
