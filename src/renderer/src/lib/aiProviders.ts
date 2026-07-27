export type AiProviderId = 'openai' | 'gemini' | 'claude'

export interface AiModelOption {
  id: string
  label: string
  description: string
}

export interface AiProviderDefinition {
  id: AiProviderId
  name: string
  keyPlaceholder: string
  keyHelpUrl: string
  keyHint: string
  models: AiModelOption[]
}

/**
 * Catálogo de provedores e modelos suportados. Atualizado em 2026-07-23 —
 * revise periodicamente, os provedores lançam variantes com frequência.
 */
export const AI_PROVIDERS: AiProviderDefinition[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    keyPlaceholder: 'sk-...',
    keyHelpUrl: 'https://platform.openai.com/api-keys',
    keyHint: 'Gerada em platform.openai.com → API keys.',
    models: [
      {
        id: 'gpt-5.6-sol',
        label: 'GPT-5.6 Sol',
        description: 'Modelo principal — raciocínio complexo e código.'
      },
      {
        id: 'gpt-5.6-terra',
        label: 'GPT-5.6 Terra',
        description: 'Equilíbrio entre qualidade e custo para uso diário.'
      },
      {
        id: 'gpt-5.6-luna',
        label: 'GPT-5.6 Luna',
        description: 'Mais rápido e barato, para alto volume.'
      },
      {
        id: 'gpt-5-codex',
        label: 'GPT-5 Codex',
        description: 'Variante otimizada para codificação agêntica.'
      }
    ]
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    keyPlaceholder: 'AIza...',
    keyHelpUrl: 'https://aistudio.google.com/apikey',
    keyHint: 'Gerada no Google AI Studio → Get API key.',
    models: [
      {
        id: 'gemini-3.6-flash',
        label: 'Gemini 3.6 Flash',
        description: 'Modelo de trabalho padrão — bom custo-benefício.'
      },
      {
        id: 'gemini-3.1-pro-preview',
        label: 'Gemini 3.1 Pro',
        description: 'Maior capacidade de raciocínio da linha Gemini.'
      },
      {
        id: 'gemini-3.5-flash-lite',
        label: 'Gemini 3.5 Flash-Lite',
        description: 'O mais rápido e barato, para alto throughput.'
      }
    ]
  },
  {
    id: 'claude',
    name: 'Anthropic Claude',
    keyPlaceholder: 'sk-ant-...',
    keyHelpUrl: 'https://console.anthropic.com/settings/keys',
    keyHint: 'Gerada em console.anthropic.com → API Keys.',
    models: [
      {
        id: 'claude-sonnet-5',
        label: 'Claude Sonnet 5',
        description: 'Melhor equilíbrio entre qualidade, custo e velocidade.'
      },
      {
        id: 'claude-opus-4-8',
        label: 'Claude Opus 4.8',
        description: 'Maior capacidade de raciocínio da linha Claude.'
      },
      {
        id: 'claude-haiku-4-5-20251001',
        label: 'Claude Haiku 4.5',
        description: 'Mais rápido e econômico, para tarefas simples.'
      }
    ]
  }
]

export function getProvider(
  id: AiProviderId | string | null | undefined
): AiProviderDefinition | undefined {
  return AI_PROVIDERS.find((provider) => provider.id === id)
}
