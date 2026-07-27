import { create } from 'zustand'
import { supabase } from '@renderer/lib/supabaseClient'
import { useAuthStore } from '@renderer/store/authStore'
import type { UsageChat, UsageMessage } from '@renderer/lib/usage'

export interface UsageRank {
  totalTokens: number
  rank: number
  totalUsers: number
  percentile: number
}

interface UsageState {
  loaded: boolean
  loading: boolean
  chats: UsageChat[]
  messages: UsageMessage[]
  rank: UsageRank | null
  load: () => Promise<void>
  reset: () => void
}

function currentUserId(): string | null {
  return useAuthStore.getState().user?.id ?? null
}

export const useUsageStore = create<UsageState>((set) => ({
  loaded: false,
  loading: false,
  chats: [],
  messages: [],
  rank: null,

  load: async () => {
    const userId = currentUserId()
    if (!userId) return

    set({ loading: true })

    const [{ data: chatRows }, { data: messageRows }, { data: rankRows }] = await Promise.all([
      supabase.from('chats').select('id, model').eq('user_id', userId),
      supabase
        .from('chat_messages')
        .select('chat_id, role, tokens_input, tokens_output, created_at')
        .eq('user_id', userId),
      supabase.rpc('get_usage_rank')
    ])

    const chats: UsageChat[] = (chatRows ?? []).map((row) => ({ id: row.id, model: row.model }))
    const messages: UsageMessage[] = (messageRows ?? []).map((row) => ({
      chatId: row.chat_id,
      role: row.role,
      tokensInput: row.tokens_input,
      tokensOutput: row.tokens_output,
      createdAt: row.created_at
    }))

    const rankRow = rankRows?.[0]
    const rank: UsageRank | null = rankRow
      ? {
          totalTokens: rankRow.my_total_tokens,
          rank: rankRow.rank,
          totalUsers: rankRow.total_users,
          percentile: rankRow.percentile
        }
      : null

    set({ loaded: true, loading: false, chats, messages, rank })
  },

  reset: () => set({ loaded: false, loading: false, chats: [], messages: [], rank: null })
}))
