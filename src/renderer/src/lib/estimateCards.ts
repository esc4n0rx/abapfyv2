export interface EstimateDistribution {
  analise_ef?: number
  espec?: number
  codific?: number
  testes?: number
  outros?: number
}

export interface EstimateScenario {
  totalHoras: number
  distribuicao: EstimateDistribution
  premissas: string[]
  riscos: string[]
}

export interface EstimateData {
  projeto: string
  versaoSap: string
  complexidadeGeral: string
  estimativas: {
    agressiva: EstimateScenario
    segura: EstimateScenario
    tranquila: EstimateScenario
  }
  notasGerais: string
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback
}

function asNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function parseScenario(value: unknown): EstimateScenario | null {
  if (!value || typeof value !== 'object') return null
  const raw = value as Record<string, unknown>
  if (typeof raw.total_horas !== 'number') return null

  const distribuicaoRaw =
    raw.distribuicao && typeof raw.distribuicao === 'object'
      ? (raw.distribuicao as Record<string, unknown>)
      : {}

  return {
    totalHoras: asNumber(raw.total_horas),
    distribuicao: {
      analise_ef: asNumber(distribuicaoRaw.analise_ef),
      espec: asNumber(distribuicaoRaw.espec),
      codific: asNumber(distribuicaoRaw.codific),
      testes: asNumber(distribuicaoRaw.testes),
      outros: asNumber(distribuicaoRaw.outros)
    },
    premissas: asStringArray(raw.premissas),
    riscos: asStringArray(raw.riscos)
  }
}

/**
 * Detecta e normaliza a resposta do agente "Estimador de Esforço ABAP" (ver
 * schema em supabase/sql/006_default_agents_seed.sql) pelo formato dos dados —
 * exige os três cenários com total_horas para não confundir com o JSON de outro
 * agente do harness.
 */
export function parseEstimateData(raw: string): EstimateData | null {
  try {
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null

    const estimativasRaw = parsed.estimativas
    if (!estimativasRaw || typeof estimativasRaw !== 'object') return null

    const agressiva = parseScenario(estimativasRaw.agressiva)
    const segura = parseScenario(estimativasRaw.segura)
    const tranquila = parseScenario(estimativasRaw.tranquila)
    if (!agressiva || !segura || !tranquila) return null

    return {
      projeto: asString(parsed.projeto, 'Projeto'),
      versaoSap: asString(parsed.versao_sap, 'A CONFIRMAR'),
      complexidadeGeral: asString(parsed.complexidade_geral, 'A CONFIRMAR'),
      estimativas: { agressiva, segura, tranquila },
      notasGerais: asString(parsed.notas_gerais, '')
    }
  } catch {
    return null
  }
}
