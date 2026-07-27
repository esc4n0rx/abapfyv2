import { FormEvent, useRef, useState } from 'react'
import { FileText, Upload, X } from 'lucide-react'
import './ImportSkillModal.css'

interface ImportSkillModalProps {
  open: boolean
  onClose: () => void
  onImport: (input: { name: string; description: string; contentMd: string }) => Promise<void>
}

export function ImportSkillModal({
  open,
  onClose,
  onImport
}: ImportSkillModalProps): JSX.Element | null {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [fileName, setFileName] = useState('')
  const [contentMd, setContentMd] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!open) return null

  function resetAndClose(): void {
    setName('')
    setDescription('')
    setFileName('')
    setContentMd('')
    onClose()
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0]
    if (!file) return
    const text = await file.text()
    setFileName(file.name)
    setContentMd(text)
  }

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault()
    if (!name.trim() || !contentMd.trim() || submitting) return

    setSubmitting(true)
    await onImport({ name, description, contentMd })
    setSubmitting(false)
    resetAndClose()
  }

  return (
    <div className="import-skill-overlay" onMouseDown={resetAndClose}>
      <div className="import-skill-modal" onMouseDown={(event) => event.stopPropagation()}>
        <div className="import-skill-header">
          <h2>Importar skill</h2>
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
          Envie um arquivo .md com o conteúdo da skill. Ainda não conectada ao modelo — só fica
          disponível na sua lista para ativar/desativar depois.
        </p>

        <form className="import-skill-form" onSubmit={handleSubmit}>
          <div className="import-skill-field">
            <label htmlFor="skill-name">Nome</label>
            <input
              id="skill-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex: Rotina de faturamento Z"
              required
            />
          </div>

          <div className="import-skill-field">
            <label htmlFor="skill-description">Descrição</label>
            <textarea
              id="skill-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Quando essa skill deve ser usada"
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
            disabled={!name.trim() || !contentMd.trim() || submitting}
          >
            {submitting ? 'Importando…' : 'Importar skill'}
          </button>
        </form>
      </div>
    </div>
  )
}
