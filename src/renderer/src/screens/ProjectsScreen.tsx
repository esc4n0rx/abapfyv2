import { useEffect, useState } from 'react'
import { FolderKanban, MessageSquarePlus, Plus } from 'lucide-react'
import { NewProjectModal } from '@renderer/components/NewProjectModal'
import { useChatStore, type ProjectSummary } from '@renderer/store/chatStore'
import { useAgentsStore } from '@renderer/store/agentsStore'
import './SkillsScreen.css'
import './ProjectsScreen.css'

interface ProjectsScreenProps {
  onOpenProject: (project: ProjectSummary) => void
}

export function ProjectsScreen({ onOpenProject }: ProjectsScreenProps): JSX.Element {
  const [createOpen, setCreateOpen] = useState(false)

  const { projects, loaded, load, createProject } = useChatStore((state) => ({
    projects: state.projects,
    loaded: state.loaded,
    load: state.load,
    createProject: state.createProject
  }))
  const agents = useAgentsStore((state) => state.agents)

  useEffect(() => {
    if (!loaded) load()
  }, [loaded, load])

  async function handleCreate(input: Parameters<typeof createProject>[0]): Promise<void> {
    await createProject(input)
  }

  function agentLabel(project: ProjectSummary): string | null {
    if (!project.defaultAgentSource || !project.defaultAgentId) return null
    const agent = agents.find(
      (item) => item.source === project.defaultAgentSource && item.id === project.defaultAgentId
    )
    return agent?.name ?? null
  }

  return (
    <div className="skills-screen">
      <div className="skills-header">
        <div>
          <h1 className="skills-title">Projetos</h1>
          <p className="skills-subtitle">
            Agrupe chats sob um contexto e, opcionalmente, um agente padrão fixo.
          </p>
        </div>
        <button type="button" className="skills-import-btn" onClick={() => setCreateOpen(true)}>
          <Plus size={14} strokeWidth={1.75} />
          Novo projeto
        </button>
      </div>

      <div className="skills-grid">
        {projects.length === 0 ? (
          <div className="skills-empty">
            <FolderKanban size={28} strokeWidth={1.25} />
            <p>Nenhum projeto ainda.</p>
          </div>
        ) : (
          projects.map((project) => (
            <div key={project.id} className="skill-card project-card">
              <div className="skill-card-header">
                <div className="skill-card-title-row">
                  <span className="skill-card-name" title={project.name}>
                    {project.name}
                  </span>
                  {agentLabel(project) && (
                    <span className="agent-card-badge agent-card-badge-default">
                      {agentLabel(project)}
                    </span>
                  )}
                </div>
              </div>

              {project.description && <p className="skill-card-summary">{project.description}</p>}

              <button
                type="button"
                className="agent-card-action project-card-open"
                onClick={() => onOpenProject(project)}
              >
                <MessageSquarePlus size={13} strokeWidth={1.75} />
                Novo chat no projeto
              </button>
            </div>
          ))
        )}
      </div>

      <NewProjectModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={handleCreate}
      />
    </div>
  )
}
