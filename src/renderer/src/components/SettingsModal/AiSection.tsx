import { FormEvent, useEffect, useRef, useState } from 'react'
import { Check, ExternalLink, KeyRound, Trash2 } from 'lucide-react'
import { supabase } from '@renderer/lib/supabaseClient'
import { useAuthStore } from '@renderer/store/authStore'
import { useSettingsStore } from '@renderer/store/settingsStore'
import { useAgentsStore } from '@renderer/store/agentsStore'
import { useMcpStore, type McpServerItem } from '@renderer/store/mcpStore'
import { AI_PROVIDERS, type AiProviderId } from '@renderer/lib/aiProviders'
import './SettingsSections.css'

interface AccessUser { user_id: string; display_name: string; email: string }
interface KeyStatus { provider: AiProviderId; updated_at: string }
interface ServerRow extends McpServerItem { user_id: string }
interface BindingRow { id: string; server_id: string; agent_source: string; agent_id: string }

export function AiSection(): JSX.Element {
  const { role, user } = useAuthStore()
  const canManage = role === 'MASTER' || role === 'ADMIN'
  const { apiKeys, defaultProvider, defaultModel, setDefaultModel, load: loadSettings } = useSettingsStore()
  const agents = useAgentsStore((state) => state.agents)
  const reloadOwnMcp = useMcpStore((state) => state.load)
  const [users, setUsers] = useState<AccessUser[]>([])
  const [targetId, setTargetId] = useState(user?.id ?? '')
  const [keys, setKeys] = useState<KeyStatus[]>([])
  const [servers, setServers] = useState<ServerRow[]>([])
  const [bindings, setBindings] = useState<BindingRow[]>([])
  const [customAgents, setCustomAgents] = useState<{ id: string; name: string }[]>([])
  const [drafts, setDrafts] = useState<Record<AiProviderId, string>>({ openai: '', gemini: '', claude: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const ownTarget = targetId === user?.id
  const targetRef = useRef(targetId)
  targetRef.current = targetId

  useEffect(() => {
    if (!canManage) return
    void supabase.rpc('list_ai_access_users').then(({ data, error: cause }) => {
      if (cause) setError(cause.message)
      else setUsers((data ?? []) as AccessUser[])
    })
  }, [canManage])

  useEffect(() => {
    if (!canManage) void loadSettings()
  }, [canManage, loadSettings])

  async function refresh(target: string): Promise<void> {
    const [keyResult, serverResult, bindingResult, customResult] = await Promise.all([
      supabase.rpc('list_ai_key_status', { p_user_id: target }),
      supabase.from('mcp_servers').select('*').eq('user_id', target).order('created_at'),
      supabase.from('mcp_agent_bindings').select('id, server_id, agent_source, agent_id').eq('user_id', target),
      supabase.rpc('list_ai_custom_agents', { p_user_id: target })
    ])
    const cause = keyResult.error ?? serverResult.error ?? bindingResult.error ?? customResult.error
    if (cause) throw cause
    if (target !== targetRef.current) return
    setKeys((keyResult.data ?? []) as KeyStatus[])
    setServers((serverResult.data ?? []) as ServerRow[])
    setBindings((bindingResult.data ?? []) as BindingRow[])
    setCustomAgents((customResult.data ?? []) as { id: string; name: string }[])
  }

  useEffect(() => {
    if (!canManage || !targetId) return
    setKeys([]); setServers([]); setBindings([]); setCustomAgents([]); setDrafts({ openai: '', gemini: '', claude: '' })
    void refresh(targetId).catch((cause) => setError((cause as Error).message))
  }, [canManage, targetId])

  async function act(task: () => Promise<void>): Promise<void> {
    setBusy(true); setError(null)
    try {
      await task()
      await refresh(targetId)
      if (ownTarget) { await loadSettings(); await reloadOwnMcp() }
    } catch (cause) { setError((cause as Error).message) }
    finally { setBusy(false) }
  }

  async function saveKey(event: FormEvent, provider: AiProviderId): Promise<void> {
    event.preventDefault()
    const value = drafts[provider].trim()
    if (!value) return
    await act(async () => {
      const { error: cause } = await supabase.rpc('set_ai_api_key', {
        p_user_id: targetId, p_provider: provider, p_api_key: value
      })
      if (cause) throw cause
      setDrafts((old) => ({ ...old, [provider]: '' }))
    })
  }

  async function addPreset(preset: 'sap_docs' | 'sap_abap'): Promise<void> {
    await act(async () => {
      const base = preset === 'sap_docs'
        ? { slug: 'sap-docs', name: 'SAP Docs', description: 'Documentação SAP.', transport: 'streamable_http', url: 'http://mcp-sap-docs.marianzeis.de/mcp', command: null, args: [] }
        : { slug: 'sap-abap', name: 'SAP ABAP', description: 'Acesso SAP via perfil local.', transport: 'stdio', url: null, command: navigator.userAgent.includes('Windows') ? 'npx.cmd' : 'npx', args: ['--yes', '--prefer-online', '@coaspe/sap-abap-mcp@latest', 'serve', '--profile', 'DEV100'] }
      const { error: cause } = await supabase.from('mcp_servers').insert({ ...base, user_id: targetId, enabled: true })
      if (cause) throw cause
    })
  }

  return <div className="settings-section">
    <header className="settings-section-header">
      <h2>Inteligência Artificial</h2>
      <p>{canManage ? 'Gerencie chaves de API e integrações para cada usuário.' : 'Consulte suas integrações e escolha o modelo de IA padrão.'}</p>
    </header>
    {canManage && <label className="settings-field-label">Usuário
      <select className="ai-provider-input" value={targetId} disabled={busy} onChange={(event) => setTargetId(event.target.value)}>
        {user && !users.some((item) => item.user_id === user.id) && <option value={user.id}>{user.email}</option>}
        {users.map((item) => <option key={item.user_id} value={item.user_id}>{item.display_name} · {item.email}</option>)}
      </select>
    </label>}
    {error && <div className="mcp-error" role="alert">{error}</div>}
    <div className="ai-provider-list">{AI_PROVIDERS.map((provider) => {
      const key = canManage ? keys.find((item) => item.provider === provider.id) : null
      const configured = canManage ? !!key : !!apiKeys[provider.id]?.configured
      const updatedAt = canManage ? key?.updated_at : apiKeys[provider.id]?.updatedAt
      return <div key={provider.id} className="ai-provider-card">
        <div className="ai-provider-header"><div className="ai-provider-title"><KeyRound size={15} /><span>{provider.name}</span></div>
          <span className={`ai-provider-status ${configured ? 'ai-provider-status-on' : ''}`}>{configured ? 'Conectado' : 'Não configurado'}</span></div>
        {canManage && <form className="ai-provider-form" onSubmit={(event) => void saveKey(event, provider.id)}>
          <input type="password" className="ai-provider-input" placeholder={configured ? 'Substituir chave' : provider.keyPlaceholder}
            value={drafts[provider.id]} onChange={(event) => setDrafts((old) => ({ ...old, [provider.id]: event.target.value }))} autoComplete="off" />
          <button type="submit" className="ai-provider-save" disabled={busy || !drafts[provider.id].trim()}>Salvar</button>
          {configured && <button type="button" className="ai-provider-remove" title="Remover chave" disabled={busy}
            onClick={() => void act(async () => { const { error: cause } = await supabase.rpc('remove_ai_api_key', { p_user_id: targetId, p_provider: provider.id }); if (cause) throw cause })}><Trash2 size={14} /></button>}
        </form>}
        <div className="ai-provider-meta"><a className="ai-provider-help" href={provider.keyHelpUrl} target="_blank" rel="noreferrer">{provider.keyHint} <ExternalLink size={11} /></a>
          {updatedAt && <span className="ai-provider-updated">Atualizada em {new Date(updatedAt).toLocaleString('pt-BR')}</span>}</div>
        {ownTarget && configured && <div className="ai-model-chips">{provider.models.map((model) => {
          const selected = defaultProvider === provider.id && defaultModel === model.id
          return <button key={model.id} type="button" className={`ai-model-chip ${selected ? 'ai-model-chip-active' : ''}`}
            title={model.description} onClick={() => void setDefaultModel(provider.id, model.id)}>{selected && <Check size={12} />}{model.label}</button>
        })}</div>}
      </div>
    })}</div>
    {canManage && <div className="ai-integrations-panel"><h3>Integrações MCP</h3>
      <div className="mcp-preset-actions">
        <button type="button" className="mcp-preset-button" disabled={busy || servers.some((server) => server.slug === 'sap-docs')} onClick={() => void addPreset('sap_docs')}>Adicionar SAP Docs</button>
        <button type="button" className="mcp-preset-button" disabled={busy || servers.some((server) => server.slug === 'sap-abap')} onClick={() => void addPreset('sap_abap')}>Adicionar SAP ABAP</button>
      </div>
      {servers.map((server) => <div key={server.id} className="mcp-server-card">
        <div className="mcp-server-header"><strong>{server.name}</strong><label className="mcp-enabled-label">
          <input type="checkbox" checked={server.enabled} disabled={busy} onChange={() => void act(async () => {
            const { error: cause } = await supabase.from('mcp_servers').update({ enabled: !server.enabled }).eq('id', server.id).eq('user_id', targetId)
            if (cause) throw cause
          })} /> Ativo</label></div>
        <span className="settings-muted">{server.transport === 'stdio' ? server.command : server.url}</span>
        <div className="mcp-agent-grid">{[
          ...agents.filter((agent) => agent.source === 'default'),
          ...customAgents.map((agent) => ({ ...agent, source: 'custom' as const }))
        ].map((agent) => {
          const bound = bindings.some((binding) => binding.server_id === server.id && binding.agent_source === agent.source && binding.agent_id === agent.id)
          return <label key={`${agent.source}:${agent.id}`} className="mcp-agent-option"><input type="checkbox" checked={bound} disabled={busy}
            onChange={() => void act(async () => {
              const query = bound
                ? supabase.from('mcp_agent_bindings').delete().eq('user_id', targetId).eq('server_id', server.id).eq('agent_source', agent.source).eq('agent_id', agent.id)
                : supabase.from('mcp_agent_bindings').insert({ user_id: targetId, server_id: server.id, agent_source: agent.source, agent_id: agent.id })
              const { error: cause } = await query
              if (cause) throw cause
            })} /> {agent.name}</label>
        })}</div>
        <button type="button" className="ai-provider-remove" title="Remover integração" disabled={busy}
          onClick={() => void act(async () => { const { error: cause } = await supabase.from('mcp_servers').delete().eq('id', server.id).eq('user_id', targetId); if (cause) throw cause })}><Trash2 size={14} /></button>
      </div>)}
    </div>}
  </div>
}
