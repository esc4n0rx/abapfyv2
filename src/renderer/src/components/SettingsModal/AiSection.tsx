import { FormEvent, useState } from 'react'
import { Check, ExternalLink, KeyRound, Trash2 } from 'lucide-react'
import { useSettingsStore } from '@renderer/store/settingsStore'
import { AI_PROVIDERS, type AiProviderId } from '@renderer/lib/aiProviders'
import './SettingsSections.css'

function formatUpdatedAt(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function AiSection(): JSX.Element {
  const { apiKeys, defaultProvider, defaultModel, saveApiKey, removeApiKey, setDefaultModel } =
    useSettingsStore((state) => ({
      apiKeys: state.apiKeys,
      defaultProvider: state.defaultProvider,
      defaultModel: state.defaultModel,
      saveApiKey: state.saveApiKey,
      removeApiKey: state.removeApiKey,
      setDefaultModel: state.setDefaultModel
    }))

  const [drafts, setDrafts] = useState<Record<AiProviderId, string>>({
    openai: '',
    gemini: '',
    claude: ''
  })
  const [savingProvider, setSavingProvider] = useState<AiProviderId | null>(null)

  async function handleSave(event: FormEvent, providerId: AiProviderId): Promise<void> {
    event.preventDefault()
    const value = drafts[providerId]
    if (!value.trim()) return

    setSavingProvider(providerId)
    await saveApiKey(providerId, value)
    setSavingProvider(null)
    setDrafts((prev) => ({ ...prev, [providerId]: '' }))
  }

  return (
    <div className="settings-section">
      <header className="settings-section-header">
        <h2>Inteligência Artificial</h2>
        <p>Configure as chaves de API dos provedores e escolha um modelo padrão.</p>
      </header>

      <div className="ai-provider-list">
        {AI_PROVIDERS.map((provider) => {
          const status = apiKeys[provider.id]
          const isSaving = savingProvider === provider.id

          return (
            <div key={provider.id} className="ai-provider-card">
              <div className="ai-provider-header">
                <div className="ai-provider-title">
                  <KeyRound size={15} strokeWidth={1.75} />
                  <span>{provider.name}</span>
                </div>
                <span
                  className={`ai-provider-status ${status?.configured ? 'ai-provider-status-on' : ''}`}
                >
                  {status?.configured ? 'Conectado' : 'Não configurado'}
                </span>
              </div>

              <form
                className="ai-provider-form"
                onSubmit={(event) => handleSave(event, provider.id)}
              >
                <input
                  type="password"
                  className="ai-provider-input"
                  placeholder={status?.configured ? '•••••••••••••••••••' : provider.keyPlaceholder}
                  value={drafts[provider.id]}
                  onChange={(event) =>
                    setDrafts((prev) => ({ ...prev, [provider.id]: event.target.value }))
                  }
                  autoComplete="off"
                />
                <button
                  type="submit"
                  className="ai-provider-save"
                  disabled={!drafts[provider.id].trim() || isSaving}
                >
                  {isSaving ? 'Salvando…' : 'Salvar'}
                </button>
                {status?.configured && (
                  <button
                    type="button"
                    className="ai-provider-remove"
                    title="Remover chave"
                    onClick={() => removeApiKey(provider.id)}
                  >
                    <Trash2 size={14} strokeWidth={1.75} />
                  </button>
                )}
              </form>

              <div className="ai-provider-meta">
                <a
                  className="ai-provider-help"
                  href={provider.keyHelpUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  {provider.keyHint}
                  <ExternalLink size={11} strokeWidth={1.75} />
                </a>
                {status?.configured && status.updatedAt && (
                  <span className="ai-provider-updated">
                    Atualizada em {formatUpdatedAt(status.updatedAt)}
                  </span>
                )}
              </div>

              {status?.configured && (
                <div className="ai-model-chips">
                  {provider.models.map((model) => {
                    const isDefault = defaultProvider === provider.id && defaultModel === model.id
                    return (
                      <button
                        key={model.id}
                        type="button"
                        className={`ai-model-chip ${isDefault ? 'ai-model-chip-active' : ''}`}
                        title={model.description}
                        onClick={() => setDefaultModel(provider.id, model.id)}
                      >
                        {isDefault && <Check size={12} strokeWidth={2.5} />}
                        {model.label}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
