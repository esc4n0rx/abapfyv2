import { extractSoleJsonBlock } from './structuredResponse'

export interface ParsedClarify {
  question: string
  options: string[]
}

/**
 * Detecta o contrato de "Pergunta de Esclarecimento" do harness (ver
 * supabase/sql/007_agent_router_context.sql): um bloco ```clarify``` (ou, quando é a
 * mensagem inteira, o JSON sem fence) com `{"question": "...", "options": [...]}`.
 * Usado com prioridade sobre o renderizador JSON genérico em ChatMessageItem — sem
 * isso, um clarify sem nenhum texto ao redor cai no StructuredJson genérico e as
 * opções viram chips estáticos (não clicáveis) em vez de botões de resposta.
 */
export function parseClarify(raw: string): ParsedClarify | null {
  const candidate = extractSoleJsonBlock(raw)
  try {
    const parsed = JSON.parse(candidate)
    if (!parsed || typeof parsed !== 'object' || typeof parsed.question !== 'string') return null
    const options = Array.isArray(parsed.options)
      ? parsed.options.filter((option: unknown): option is string => typeof option === 'string')
      : []
    return { question: parsed.question, options }
  } catch {
    return null
  }
}
