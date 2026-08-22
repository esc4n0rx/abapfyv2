import { fetchApiKey, streamChat } from '@renderer/lib/aiClient'
import type { AiProviderId } from '@renderer/lib/aiProviders'
import type { TaskPriority } from '@renderer/store/tasksStore'

export interface SuggestedTaskDraft {
  title: string
  description: string
  priority: TaskPriority
  sapModule: string
  estimatedHours: number | null
  labels: string[]
  subtasks: string[]
}

function parseSuggestion(content: string): SuggestedTaskDraft {
  const cleaned = content
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
  const parsed = JSON.parse(cleaned) as Partial<SuggestedTaskDraft>
  return {
    title: String(parsed.title ?? '').slice(0, 160),
    description: String(parsed.description ?? ''),
    priority: ['low', 'medium', 'high'].includes(parsed.priority ?? '')
      ? (parsed.priority as TaskPriority)
      : 'medium',
    sapModule: String(parsed.sapModule ?? '')
      .slice(0, 20)
      .toUpperCase(),
    estimatedHours:
      typeof parsed.estimatedHours === 'number' ? Math.max(0, parsed.estimatedHours) : null,
    labels: Array.isArray(parsed.labels) ? parsed.labels.map(String).slice(0, 8) : [],
    subtasks: Array.isArray(parsed.subtasks)
      ? parsed.subtasks.map(String).filter(Boolean).slice(0, 12)
      : []
  }
}

export async function suggestTaskDraft(input: {
  userId: string
  provider: AiProviderId
  model: string
  brief: string
}): Promise<SuggestedTaskDraft> {
  const apiKey = await fetchApiKey(input.userId, input.provider)
  if (!apiKey) throw new Error('Configure a chave do provedor de IA antes de usar o assistente.')
  let content = ''
  const controller = new AbortController()
  await streamChat({
    provider: input.provider,
    model: input.model,
    apiKey,
    signal: controller.signal,
    messages: [{ role: 'user', content: input.brief }],
    systemPrompt: `Você auxilia no planejamento de tarefas SAP. Retorne SOMENTE JSON válido com o formato {"title":"...","description":"...","priority":"low|medium|high","sapModule":"MM|SD|FI|ABAP|...","estimatedHours":number|null,"labels":["..."],"subtasks":["..."]}. Gere subtarefas concretas, verificáveis e em ordem de execução. Não execute nenhuma ação externa.`,
    onDelta: (delta) => {
      content += delta
    }
  })
  return parseSuggestion(content)
}
