import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, BookOpen, Save, Server, Trash2 } from 'lucide-react'
import { useAgentsStore } from '@renderer/store/agentsStore'
import { useMcpStore, type McpServerItem } from '@renderer/store/mcpStore'
import './SettingsSections.css'

interface Draft {
  name: string
  endpoint: string
  args: string
}

function draftOf(server: McpServerItem): Draft {
  return {
    name: server.name,
    endpoint: server.transport === 'streamable_http' ? (server.url ?? '') : (server.command ?? ''),
    args: server.args.join('\n')
  }
}

export function McpSection(): JSX.Element {
  const agents = useAgentsStore((state) => state.agents)
  const { servers, bindings, loading, error, load, createPreset, updateServer, removeServer, toggleBinding } =
    useMcpStore()
  const [drafts, setDrafts] = useState<Record<string, Draft>>({})
  const [testStatus, setTestStatus] = useState<Record<string, string>>({})

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    setDrafts((current) => {
      const next = { ...current }
      for (const server of servers) if (!next[server.id]) next[server.id] = draftOf(server)
      return next
    })
  }, [servers])

  const bindingKeys = useMemo(
    () =>
      new Set(
        bindings.map(
          (binding) => `${binding.serverId}:${binding.agentSource}:${binding.agentId}`
        )
      ),
    [bindings]
  )

  async function save(server: McpServerItem): Promise<void> {
    const draft = drafts[server.id]
    if (!draft) return
    await updateServer(server.id, {
      name: draft.name.trim(),
      ...(server.transport === 'streamable_http'
        ? { url: draft.endpoint.trim() }
        : {
            command: draft.endpoint.trim(),
            args: draft.args.split(/\r?\n/).map((arg) => arg.trim()).filter(Boolean)
          })
    })
  }

  async function test(server: McpServerItem): Promise<void> {
    setTestStatus((current) => ({ ...current, [server.id]: 'Conectando…' }))
    try {
      const tools = await window.api.mcp.listTools([
        {
          id: server.id,
          name: server.name,
          transport: server.transport,
          url: server.url,
          command: server.command,
          args: server.args
        }
      ])
      setTestStatus((current) => ({
        ...current,
        [server.id]: `Conectado — ${tools.length} ferramenta(s)`
      }))
    } catch (testError) {
      setTestStatus((current) => ({
        ...current,
        [server.id]: testError instanceof Error ? testError.message : String(testError)
      }))
    }
  }

  return (
    <div className="settings-section settings-section-mcp">
      <header className="settings-section-header">
        <h2>Model Context Protocol</h2>
        <p>Conecte ferramentas MCP e escolha quais agentes podem utilizá-las junto das skills.</p>
      </header>

      <div className="mcp-preset-actions">
        <button type="button" className="mcp-preset-button" onClick={() => createPreset('sap_docs')}>
          <BookOpen size={15} /> Adicionar SAP Docs
        </button>
        <button type="button" className="mcp-preset-button" onClick={() => createPreset('sap_abap')}>
          <Server size={15} /> Adicionar SAP ABAP
        </button>
      </div>

      <div className="mcp-security-note">
        <AlertTriangle size={15} />
        <span>Credenciais SAP ficam no perfil local. Ferramentas de escrita sempre pedem confirmação.</span>
      </div>

      {error && <div className="mcp-error">{error}</div>}
      {loading && servers.length === 0 && <span className="settings-muted">Carregando…</span>}

      <div className="mcp-server-list">
        {servers.map((server) => {
          const draft = drafts[server.id] ?? draftOf(server)
          const insecure = server.transport === 'streamable_http' && draft.endpoint.startsWith('http://')
          return (
            <article key={server.id} className="mcp-server-card">
              <div className="mcp-server-header">
                <div>
                  <strong>{server.name}</strong>
                  <span>{server.transport === 'streamable_http' ? 'HTTP remoto' : 'Processo local stdio'}</span>
                </div>
                <label className="mcp-enabled-label">
                  <input
                    type="checkbox"
                    checked={server.enabled}
                    onChange={() => updateServer(server.id, { enabled: !server.enabled })}
                  />
                  Ativo
                </label>
              </div>
              {server.description && <p className="mcp-server-description">{server.description}</p>}

              <label className="settings-field-label">
                Nome
                <input
                  className="ai-provider-input"
                  value={draft.name}
                  onChange={(event) =>
                    setDrafts((current) => ({
                      ...current,
                      [server.id]: { ...draft, name: event.target.value }
                    }))
                  }
                />
              </label>
              <label className="settings-field-label">
                {server.transport === 'streamable_http' ? 'URL MCP' : 'Comando (node/npx)'}
                <input
                  className="ai-provider-input"
                  value={draft.endpoint}
                  onChange={(event) =>
                    setDrafts((current) => ({
                      ...current,
                      [server.id]: { ...draft, endpoint: event.target.value }
                    }))
                  }
                />
              </label>
              {insecure && (
                <span className="mcp-warning">Conexão sem TLS. Prefira HTTPS ou uma instalação local.</span>
              )}
              {server.transport === 'stdio' && (
                <label className="settings-field-label">
                  Argumentos — um por linha
                  <textarea
                    className="mcp-args-input"
                    rows={7}
                    value={draft.args}
                    onChange={(event) =>
                      setDrafts((current) => ({
                        ...current,
                        [server.id]: { ...draft, args: event.target.value }
                      }))
                    }
                  />
                </label>
              )}

              <div className="mcp-agent-bindings">
                <span className="settings-field-label">Agentes autorizados</span>
                <div className="mcp-agent-grid">
                  {agents.map((agent) => {
                    const key = `${server.id}:${agent.source}:${agent.id}`
                    return (
                      <label key={`${agent.source}:${agent.id}`} className="mcp-agent-option">
                        <input
                          type="checkbox"
                          checked={bindingKeys.has(key)}
                          onChange={() => toggleBinding(server.id, agent.source, agent.id)}
                        />
                        {agent.name}
                      </label>
                    )
                  })}
                </div>
              </div>

              <div className="mcp-card-actions">
                {testStatus[server.id] && <span className="mcp-test-status">{testStatus[server.id]}</span>}
                <button type="button" className="mcp-test-button" onClick={() => test(server)}>
                  Testar conexão
                </button>
                <button type="button" className="ai-provider-save" onClick={() => save(server)}>
                  <Save size={13} /> Salvar
                </button>
                <button type="button" className="ai-provider-remove" onClick={() => removeServer(server.id)}>
                  <Trash2 size={14} />
                </button>
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}
