import { FormEvent, useRef, useState } from 'react'
import { FileText, Upload, X } from 'lucide-react'
import './ImportSkillModal.css'

interface ImportAgentModalProps {
  open: boolean
  onClose: () => void
  onImport: (input: { name: string; description: string; content: string }) => Promise<void>
}

export function ImportAgentModal({
  open,
  onClose,
  onImport
}: ImportAgentModalProps): JSX.Element | null {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [fileName, setFileName] = useState('')
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!open) return null

  function resetAndClose(): void {
    setName('')
    setDescription('')
    setFileName('')
    setContent('')
    onClose()
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0]
    if (!file) return
    const text = await file.text()
    setFileName(file.name)
    setContent(text)
  }

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault()
    if (!name.trim() || !content.trim() || submitting) return

    setSubmitting(true)
    await onImport({ name, description, content })
    setSubmitting(false)
    resetAndClose()
  }

  return (
    <div className="import-skill-overlay" onMouseDown={resetAndClose}>
      <div className="import-skill-modal" onMouseDown={(event) => event.stopPropagation()}>
        <div className="import-skill-header">
          <h2>Importar agente</h2>
          <button
            type="button"
            className="import-skill-close"
            onClick={resetAndClose}
            aria-label="Fechar"
          >
            <X size={16} strokeWidth={1.75} />
          </button>
        </div>
        <p className="import-skill-subtitle">
          Envie um arquivo .md com o system prompt do agente. Ele entra no catálogo junto dos padrão
          e passa a ser considerado pelo roteador.
        </p>

        <form className="import-skill-form" onSubmit={handleSubmit}>
          <div className="import-skill-field">
            <label htmlFor="agent-name">Nome</label>
            <input
              id="agent-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex: Migrador CDS"
              required
            />
          </div>

          <div className="import-skill-field">
            <label htmlFor="agent-description">Descrição</label>
            <textarea
              id="agent-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Quando o roteador deve escolher esse agente"
              rows={3}
            />
          </div>

          <div className="import-skill-field">
            <label>Arquivo .md</label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".md,text/markdown,text/plain"
              className="import-skill-file-input"
              onChange={handleFileChange}
            />
            <button
              type="button"
              className="import-skill-dropzone"
              onClick={() => fileInputRef.current?.click()}
            >
              {fileName ? (
                <>
                  <FileText size={16} strokeWidth={1.75} />
                  <span>{fileName}</span>
                </>
              ) : (
                <>
                  <Upload size={16} strokeWidth={1.75} />
                  <span>Selecionar arquivo .md</span>
                </>
              )}
            </button>
          </div>

          <button
            type="submit"
            className="import-skill-submit"
            disabled={!name.trim() || !content.trim() || submitting}
          >
            {submitting ? 'Importando…' : 'Importar agente'}
          </button>
        </form>
      </div>
    </div>
  )
}
