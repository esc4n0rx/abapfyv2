import { useEffect, useState } from 'react'
import { Bot, Download, Palette, Server, SlidersHorizontal, X } from 'lucide-react'
import { GeneralSection } from './GeneralSection'
import { AiSection } from './AiSection'
import { ParametrosSection } from './ParametrosSection'
import { UpdatesSection } from './UpdatesSection'
import { McpSection } from './McpSection'
import './SettingsModal.css'

type SectionId = 'general' | 'ai' | 'mcp' | 'parametros' | 'updates'

const SECTIONS: { id: SectionId; label: string; icon: typeof Palette }[] = [
  { id: 'general', label: 'Geral', icon: Palette },
  { id: 'ai', label: 'Inteligência Artificial', icon: Bot },
  { id: 'mcp', label: 'MCP', icon: Server },
  { id: 'parametros', label: 'Parâmetros', icon: SlidersHorizontal },
  { id: 'updates', label: 'Atualizações', icon: Download }
]

interface SettingsModalProps {
  open: boolean
  onClose: () => void
}

export function SettingsModal({ open, onClose }: SettingsModalProps): JSX.Element | null {
  const [activeSection, setActiveSection] = useState<SectionId>('general')

  useEffect(() => {
    if (!open) return

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="settings-overlay" onMouseDown={onClose}>
      <div
        className={`settings-modal ${activeSection === 'parametros' || activeSection === 'mcp' ? 'settings-modal-wide' : ''}`}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <nav className="settings-nav">
          <span className="settings-nav-title">Configurações</span>
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              className={`settings-nav-item ${activeSection === id ? 'settings-nav-item-active' : ''}`}
              onClick={() => setActiveSection(id)}
            >
              <Icon size={15} strokeWidth={1.75} />
              {label}
            </button>
          ))}
        </nav>

        <div className="settings-content">
          <button type="button" className="settings-close" onClick={onClose} aria-label="Fechar">
            <X size={16} strokeWidth={1.75} />
          </button>

          {activeSection === 'general' && <GeneralSection />}
          {activeSection === 'ai' && <AiSection />}
          {activeSection === 'mcp' && <McpSection />}
          {activeSection === 'parametros' && <ParametrosSection />}
          {activeSection === 'updates' && <UpdatesSection />}
        </div>
      </div>
    </div>
  )
}
