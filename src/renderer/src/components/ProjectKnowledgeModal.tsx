import { ChangeEvent, useEffect, useRef, useState } from 'react'
import { BookOpen, FileText, Loader2, Search, Trash2, Upload, X } from 'lucide-react'
import { useAuthStore } from '@renderer/store/authStore'
import {
  deleteProjectDocument,
  KNOWLEDGE_CATEGORY_LABELS,
  listProjectDocuments,
  uploadProjectDocument,
  type KnowledgeCategory,
  type ProjectDocument
} from '@renderer/lib/projectKnowledge'
import type { ProjectSummary } from '@renderer/store/chatStore'
import './ProjectKnowledgeModal.css'

interface Props {
  project: ProjectSummary | null
  onClose: () => void
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function ProjectKnowledgeModal({ project, onClose }: Props): JSX.Element | null {
  const user = useAuthStore((state) => state.user)
  const fileRef = useRef<HTMLInputElement>(null)
  const [documents, setDocuments] = useState<ProjectDocument[]>([])
  const [category, setCategory] = useState<KnowledgeCategory>('documentacao')
  const [version, setVersion] = useState('1.0')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!project) return
    setLoading(true)
    setError(null)
    void listProjectDocuments(project.id)
      .then(setDocuments)
      .catch(() => setError('Não foi possível carregar a base de conhecimento.'))
      .finally(() => setLoading(false))
  }, [project])

  if (!project) return null

  async function handleFile(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0]
    if (!file || !user || !project) return
    setUploading(true)
    setError(null)
    try {
      const document = await uploadProjectDocument({
        userId: user.id,
        projectId: project.id,
        file,
        category,
        version
      })
      setDocuments((current) => [document, ...current])
    } catch (uploadError) {
      setError((uploadError as Error).message || 'Não foi possível indexar o documento.')
    } finally {
      setUploading(false)
      event.target.value = ''
    }
  }

  async function handleDelete(document: ProjectDocument): Promise<void> {
    if (!window.confirm(`Remover “${document.name}” da base do projeto?`)) return
    try {
      await deleteProjectDocument(document.id)
      setDocuments((current) => current.filter((item) => item.id !== document.id))
    } catch {
      setError('Não foi possível remover o documento.')
    }
  }

  const normalized = query.trim().toLocaleLowerCase('pt-BR')
  const visible = normalized
    ? documents.filter(
        (document) =>
          document.name.toLocaleLowerCase('pt-BR').includes(normalized) ||
          KNOWLEDGE_CATEGORY_LABELS[document.category]
            .toLocaleLowerCase('pt-BR')
            .includes(normalized)
      )
    : documents

  return (
    <div className="knowledge-backdrop" onMouseDown={onClose}>
      <section className="knowledge-modal" onMouseDown={(event) => event.stopPropagation()}>
        <header className="knowledge-header">
          <div className="knowledge-heading">
            <span className="knowledge-heading-icon">
              <BookOpen size={19} />
            </span>
            <div>
              <h2>Base de conhecimento</h2>
              <p>{project.name} · documentos usados como evidência pelos agentes</p>
            </div>
          </div>
          <button type="button" className="knowledge-close" onClick={onClose} aria-label="Fechar">
            <X size={18} />
          </button>
        </header>

        <div className="knowledge-upload-bar">
          <label>
            <span>Categoria</span>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value as KnowledgeCategory)}
            >
              {Object.entries(KNOWLEDGE_CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="knowledge-version">
            <span>Versão</span>
            <input
              value={version}
              maxLength={30}
              onChange={(event) => setVersion(event.target.value)}
            />
          </label>
          <input
            ref={fileRef}
            type="file"
            hidden
            accept=".txt,.md,.pdf,.docx,.json,.csv,.abap,.cds,.sql,.xml,.yaml,.yml"
            onChange={handleFile}
          />
          <button
            type="button"
            className="knowledge-upload-button"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? <Loader2 size={15} className="knowledge-spin" /> : <Upload size={15} />}
            {uploading ? 'Extraindo e indexando…' : 'Carregar documento'}
          </button>
        </div>

        <div className="knowledge-toolbar">
          <div className="knowledge-search">
            <Search size={15} />
            <input
              value={query}
              placeholder="Filtrar documentos…"
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <span>
            {documents.length} documento{documents.length === 1 ? '' : 's'}
          </span>
        </div>

        {error && <div className="knowledge-error">{error}</div>}
        <div className="knowledge-list">
          {loading && (
            <div className="knowledge-empty">
              <Loader2 className="knowledge-spin" /> Carregando…
            </div>
          )}
          {!loading && visible.length === 0 && (
            <div className="knowledge-empty">
              <BookOpen size={26} />
              <strong>Nenhum documento encontrado</strong>
              <span>Carregue especificações, manuais ou convenções deste projeto.</span>
            </div>
          )}
          {visible.map((document) => (
            <article key={document.id} className="knowledge-document">
              <span className="knowledge-document-icon">
                <FileText size={17} />
              </span>
              <div className="knowledge-document-main">
                <strong title={document.name}>{document.name}</strong>
                <div className="knowledge-document-meta">
                  <span>{KNOWLEDGE_CATEGORY_LABELS[document.category]}</span>
                  <span>v{document.version}</span>
                  <span>{formatBytes(document.sizeBytes)}</span>
                  <span>
                    Atualizado{' '}
                    {new Intl.DateTimeFormat('pt-BR').format(new Date(document.updatedAt))}
                  </span>
                </div>
              </div>
              <span className={`knowledge-mode knowledge-mode-${document.indexingMode}`}>
                {document.indexingMode === 'semantic' ? 'Semântico' : 'Textual'}
              </span>
              <button
                type="button"
                className="knowledge-delete"
                onClick={() => handleDelete(document)}
                aria-label="Remover"
              >
                <Trash2 size={15} />
              </button>
            </article>
          ))}
        </div>
        <footer className="knowledge-footer">
          A indexação semântica usa OpenAI quando a chave está configurada; sem ela, o documento
          permanece pesquisável por texto.
        </footer>
      </section>
    </div>
  )
}
