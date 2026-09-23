import { useEffect, useState } from 'react'
import { FileText, RotateCcw, Trash2 } from 'lucide-react'
import { supabase } from '@renderer/lib/supabaseClient'
import type { ClientModule } from '@renderer/store/clientsStore'
import { useAuthStore } from '@renderer/store/authStore'

interface TrashFile {
  id: string
  module_id: string
  name: string
  storage_path: string | null
  user_id: string
  deleted_by: string
  deleted_at: string
}

interface TrashEvent {
  id: string
  module_id: string
  file_name: string
  action: 'TRASHED' | 'RESTORED' | 'PURGED'
  actor_id: string
  occurred_at: string
}

interface Props {
  clientId: string
  modules: ClientModule[]
  canEmpty: boolean
}

const actionLabel: Record<TrashEvent['action'], string> = {
  TRASHED: 'Enviado à lixeira',
  RESTORED: 'Restaurado',
  PURGED: 'Excluído definitivamente'
}

export function ClientTrash({ clientId, modules, canEmpty }: Props): JSX.Element {
  const user = useAuthStore((state) => state.user)
  const [files, setFiles] = useState<TrashFile[]>([])
  const [events, setEvents] = useState<TrashEvent[]>([])
  const [names, setNames] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let active = true
    void Promise.all([
      supabase.from('client_files')
        .select('id, module_id, name, storage_path, user_id, deleted_by, deleted_at')
        .eq('client_id', clientId).not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false }),
      supabase.from('client_file_events')
        .select('id, module_id, file_name, action, actor_id, occurred_at')
        .eq('client_id', clientId).order('occurred_at', { ascending: false })
    ]).then(async ([fileResult, eventResult]) => {
      if (!active) return
      if (fileResult.error || eventResult.error) {
        setError((fileResult.error ?? eventResult.error)?.message ?? 'Erro ao abrir a lixeira.')
        return
      }
      const trashFiles = (fileResult.data ?? []) as TrashFile[]
      const history = (eventResult.data ?? []) as TrashEvent[]
      setFiles(trashFiles)
      setEvents(history)
      const ids = [...new Set([
        ...trashFiles.flatMap((file) => [file.user_id, file.deleted_by]),
        ...history.map((event) => event.actor_id)
      ])]
      if (ids.length) {
        const { data } = await supabase.from('profiles').select('id, nome').in('id', ids)
        if (active) setNames(Object.fromEntries((data ?? []).map((profile) => [profile.id, profile.nome])))
      }
    })
    return () => { active = false }
  }, [clientId])

  async function restore(file: TrashFile): Promise<void> {
    setBusy(true)
    setError(null)
    try {
      const { data, error: restoreError } = await supabase.from('client_files')
        .update({ deleted_at: null, deleted_by: null })
        .eq('id', file.id).not('deleted_at', 'is', null)
        .select('id').single()
      if (restoreError || !data) throw restoreError ?? new Error('Arquivo não encontrado na lixeira.')
      setFiles((current) => current.filter((item) => item.id !== file.id))
      const { data: history, error: historyError } = await supabase.from('client_file_events')
        .select('id, module_id, file_name, action, actor_id, occurred_at')
        .eq('client_id', clientId).order('occurred_at', { ascending: false })
      if (historyError) throw historyError
      setEvents((history ?? []) as TrashEvent[])
    } catch (cause) {
      setError((cause as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function emptyTrash(): Promise<void> {
    if (!canEmpty || !files.length || !window.confirm(`Excluir definitivamente ${files.length} arquivo(s) da lixeira?`)) return
    setBusy(true)
    setError(null)
    try {
      for (const file of files) {
        if (file.storage_path) {
          const { error: storageError } = await supabase.storage.from('client-files').remove([file.storage_path])
          if (storageError) throw storageError
        }
        const { data: deleted, error: deleteError } = await supabase.from('client_files')
          .delete().eq('id', file.id).not('deleted_at', 'is', null).select('id').single()
        if (deleteError || !deleted) throw deleteError ?? new Error('Arquivo não encontrado na lixeira.')
        setFiles((current) => current.filter((item) => item.id !== file.id))
      }
    } catch (cause) {
      setError((cause as Error).message)
    } finally {
      const [fileResult, eventResult] = await Promise.all([
        supabase.from('client_files').select('id, module_id, name, storage_path, user_id, deleted_by, deleted_at')
          .eq('client_id', clientId).not('deleted_at', 'is', null).order('deleted_at', { ascending: false }),
        supabase.from('client_file_events').select('id, module_id, file_name, action, actor_id, occurred_at')
          .eq('client_id', clientId).order('occurred_at', { ascending: false })
      ])
      if (!fileResult.error) setFiles((fileResult.data ?? []) as TrashFile[])
      if (!eventResult.error) setEvents((eventResult.data ?? []) as TrashEvent[])
      setBusy(false)
    }
  }

  const moduleName = (id: string): string => modules.find((item) => item.id === id)?.name ?? 'Módulo removido'
  const actorName = (id: string): string => names[id] ?? (id === user?.id ? 'Você' : 'Usuário')
  const timestamp = (value: string): string => new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))

  return (
    <div className="clients-trash">
      <div className="clients-content-heading">
        <div><small>Arquivos de todos os módulos deste cliente</small><h2>Lixeira</h2></div>
        {canEmpty && <button disabled={busy || files.length === 0} onClick={() => void emptyTrash()}><Trash2 size={15} /> Esvaziar lixeira</button>}
      </div>
      {error && <p className="clients-error">{error}</p>}
      <div className="clients-section-heading"><h3>Arquivos removidos</h3><small>{files.length} arquivo(s)</small></div>
      <div className="clients-list">
        {files.map((file) => (
          <div className="clients-trash-row" key={file.id}>
            <FileText size={16} />
            <div><strong>{file.name}</strong><small>{moduleName(file.module_id)} · enviado por {actorName(file.user_id)} · apagado por {actorName(file.deleted_by)} em {timestamp(file.deleted_at)}</small></div>
            <button disabled={busy} onClick={() => void restore(file)}><RotateCcw size={14} /> Restaurar</button>
          </div>
        ))}
        {files.length === 0 && <p>A lixeira está vazia.</p>}
      </div>
      <div className="clients-section-heading"><h3>Histórico</h3></div>
      <div className="clients-trash-history">
        {events.map((event) => (
          <div key={event.id}>
            <strong>{actionLabel[event.action]}: {event.file_name}</strong>
            <small>{moduleName(event.module_id)} · {actorName(event.actor_id)} · {timestamp(event.occurred_at)}</small>
          </div>
        ))}
        {events.length === 0 && <p>Nenhuma movimentação registrada.</p>}
      </div>
    </div>
  )
}
