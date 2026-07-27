import { useEffect, useMemo, useState } from 'react'
import { Bot, Download, Lock, Search, Trash2, Upload } from 'lucide-react'
import { ImportAgentModal } from '@renderer/components/ImportAgentModal'
import { useAgentsStore } from '@renderer/store/agentsStore'
import './SkillsScreen.css'
import './AgentsScreen.css'

function downloadMarkdown(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export function AgentsScreen(): JSX.Element {
  const [search, setSearch] = useState('')
  const [importOpen, setImportOpen] = useState(false)

  const { agents, loaded, load, importAgent, removeCustomAgent } = useAgentsStore((state) => ({
    agents: state.agents,
    loaded: state.loaded,
    load: state.load,
    importAgent: state.importAgent,
    removeCustomAgent: state.removeCustomAgent
  }))

  useEffect(() => {
    if (!loaded) load()
  }, [loaded, load])

  const filteredAgents = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return agents
    return agents.filter(
      (agent) =>
        agent.name.toLowerCase().includes(query) || agent.description.toLowerCase().includes(query)
    )
  }, [agents, search])

  return (
    <div className="skills-screen">
      <div className="skills-header">
        <div>
          <h1 className="skills-title">Agentes</h1>
          <p className="skills-subtitle">
            Catálogo do harness — o roteador (Claude Haiku) ativa o agente ideal pra cada conversa.
            Padrão não pode ser excluído; baixe pra copiar ou envie o seu.
          </p>
        </div>
        <button type="button" className="skills-import-btn" onClick={() => setImportOpen(true)}>
          <Upload size={14} strokeWidth={1.75} />
          Importar agente
        </button>
      </div>

      <div className="skills-toolbar">
        <div className="skills-search">
          <Search size={14} strokeWidth={1.75} />
          <input
            type="text"
            placeholder="Buscar agentes…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </div>

      <div className="skills-grid">
        {filteredAgents.length === 0 ? (
          <div className="skills-empty">
            <Bot size={28} strokeWidth={1.25} />
            <p>Nenhum agente encontrado.</p>
          </div>
        ) : (
          filteredAgents.map((agent) => (
            <div key={`${agent.source}-${agent.id}`} className="skill-card agent-card">
              <div className="skill-card-header">
                <div className="skill-card-title-row">
                  <span className="skill-card-name" title={agent.name}>
                    {agent.name}
                  </span>
                  {agent.source === 'default' ? (
                    <span className="agent-card-badge agent-card-badge-default">
                      <Lock size={10} strokeWidth={2} />
                      Padrão
                    </span>
                  ) : (
                    <span className="skill-card-custom-badge">Importado</span>
                  )}
                </div>
              </div>

              <p className="skill-card-summary" title={agent.description}>
                {agent.description}
              </p>

              <div className="agent-card-actions">
                <button
                  type="button"
                  className="agent-card-action"
                  onClick={() => downloadMarkdown(`${agent.id}.md`, agent.content)}
                >
                  <Download size={12} strokeWidth={1.75} />
                  Baixar .md
                </button>
                {agent.source === 'custom' && (
                  <button
                    type="button"
                    className="agent-card-action agent-card-action-danger"
                    onClick={() => removeCustomAgent(agent.id)}
                  >
                    <Trash2 size={12} strokeWidth={1.75} />
                    Remover
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <ImportAgentModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImport={importAgent}
      />
    </div>
  )
}
