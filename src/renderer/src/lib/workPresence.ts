import { useEffect, useState } from 'react'
import { supabase } from '@renderer/lib/supabaseClient'

export interface WorkScope {
  clientId: string
  moduleId: string
  folderId: string | null
  chatId: string | null
}

export interface WorkPresence {
  id: string
  userId: string
  userName: string
  surface: 'CHAT' | 'DRIVE'
  clientId: string
  moduleId: string
  folderId: string | null
  chatId: string | null
  lastSeenAt: string
}

function useHeartbeat(userId: string | null, surface: 'CHAT' | 'DRIVE', scope: WorkScope | null): void {
  const clientId = scope?.clientId ?? null
  const moduleId = scope?.moduleId ?? null
  const folderId = scope?.folderId ?? null
  const chatId = scope?.chatId ?? null
  useEffect(() => {
    if (!userId || !clientId || !moduleId) return
    const id = crypto.randomUUID()
    const publish = (): void => {
      void supabase.from('client_work_presence').upsert({
        id, user_id: userId, surface, client_id: clientId, module_id: moduleId,
        folder_id: folderId, chat_id: chatId
      })
    }
    publish()
    const timer = window.setInterval(publish, 25_000)
    return () => {
      window.clearInterval(timer)
      void supabase.from('client_work_presence').delete().eq('id', id)
    }
  }, [userId, surface, clientId, moduleId, folderId, chatId])
}

export function useWorkPresence(
  userId: string | null,
  chatScope: WorkScope | null,
  driveScope: WorkScope | null
): { presence: WorkPresence[]; error: string | null } {
  const [presence, setPresence] = useState<WorkPresence[]>([])
  const [error, setError] = useState<string | null>(null)
  useHeartbeat(userId, 'CHAT', chatScope)
  useHeartbeat(userId, 'DRIVE', driveScope)

  useEffect(() => {
    if (!userId) { setPresence([]); return }
    let active = true
    const refresh = (): void => {
      const cutoff = new Date(Date.now() - 90_000).toISOString()
      void supabase.from('client_work_presence')
        .select('id, user_id, surface, client_id, module_id, folder_id, chat_id, last_seen_at')
        .gte('last_seen_at', cutoff)
        .then(async ({ data, error: queryError }) => {
          if (!active) return
          if (queryError) { setError(queryError.message); return }
          const rows = data ?? []
          const ids = [...new Set(rows.map((row) => row.user_id))]
          const profileResult = ids.length
            ? await supabase.from('profiles').select('id, nome').in('id', ids)
            : { data: [] }
          if (!active) return
          const names = Object.fromEntries((profileResult.data ?? []).map((row) => [row.id, row.nome]))
          setPresence(rows.map((row) => ({
            id: row.id, userId: row.user_id,
            userName: names[row.user_id] ?? (row.user_id === userId ? 'Você' : 'Usuário'),
            surface: row.surface, clientId: row.client_id, moduleId: row.module_id,
            folderId: row.folder_id, chatId: row.chat_id, lastSeenAt: row.last_seen_at
          })))
          setError(null)
        })
    }
    refresh()
    const timer = window.setInterval(refresh, 15_000)
    return () => { active = false; window.clearInterval(timer) }
  }, [userId])
  return { presence, error }
}

export function presenceLabel(presence: WorkPresence[], ownUserId: string | null): string | null {
  const others = [...new Map(presence.filter((item) => item.userId !== ownUserId).map((item) => [item.userId, item])).values()]
  if (!others.length) return null
  return others.length === 1 ? `Em uso · ${others[0].userName}` : `Em uso · ${others[0].userName} +${others.length - 1}`
}
