import PizZip from 'pizzip'
import templateUrl from '../docs/MODELO BASE EF.docx?url'

export interface EfDocxData {
  project_name: string
  author: string
  client_name: string
  module: string
  brief_description: string
  summary_description: string
  macro_overview: string
  functional_spec: string
}

export const EF_DOCX_OUTPUT_CONTRACT = `## Contrato de saída do documento EF

Esta sessão está usando o Agente de EF do Abapfy. A resposta final será transformada
automaticamente no modelo Word oficial. Quando não estiver fazendo uma pergunta de
esclarecimento, responda APENAS com o bloco abaixo, sem introdução ou conclusão:

\`\`\`ef-docx
{
  "project_name": "...",
  "author": "...",
  "client_name": "...",
  "module": "...",
  "brief_description": "...",
  "summary_description": "...",
  "macro_overview": "...",
  "functional_spec": "..."
}
\`\`\`

O conteúdo entre chaves precisa ser JSON válido. Use \\n dentro dos valores para separar
parágrafos. Nunca omita project_name ou functional_spec. Para informação desconhecida,
use "A CONFIRMAR" em vez de inventar.`

function normalizeParsedData(parsed: unknown): EfDocxData | null {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
  const record = parsed as Record<string, unknown>
  if (typeof record.project_name !== 'string' || !record.project_name.trim()) return null
  if (typeof record.functional_spec !== 'string' || !record.functional_spec.trim()) return null

  const field = (value: unknown, fallback: string): string =>
    typeof value === 'string' && value.trim() ? value.trim() : fallback

  return {
    project_name: record.project_name.trim(),
    author: field(record.author, 'A CONFIRMAR'),
    client_name: field(record.client_name, 'A CONFIRMAR'),
    module: field(record.module, 'A CONFIRMAR'),
    brief_description: field(record.brief_description, ''),
    summary_description: field(record.summary_description, ''),
    macro_overview: field(record.macro_overview, ''),
    functional_spec: field(record.functional_spec, '')
  }
}

function jsonCandidates(raw: string): string[] {
  const trimmed = raw.trim()
  const candidates = [trimmed]
  const fencedBlocks = trimmed.matchAll(/```(?:ef-docx|json)?\s*\r?\n([\s\S]*?)\r?\n?```/gi)
  for (const match of fencedBlocks) candidates.push(match[1].trim())
  return [...new Set(candidates)]
}

/**
 * Detecta e normaliza os dados da EF a partir de um texto JSON (bloco de código ou a
 * mensagem inteira) — pelo formato dos dados, não pela linguagem declarada no bloco, já
 * que o modelo às vezes usa ```json em vez de ```ef-docx apesar da instrução no agente.
 * Exige os dois campos mais característicos do template (project_name + functional_spec)
 * para não confundir com o JSON de outro agente.
 */
export function parseEfDocxData(raw: string): EfDocxData | null {
  for (const candidate of jsonCandidates(raw)) {
    try {
      const normalized = normalizeParsedData(JSON.parse(candidate))
      if (normalized) return normalized
    } catch {
      // O candidato pode ser texto Markdown; tenta o próximo bloco cercado.
    }
  }
  return null
}

function plainTextFromMarkdown(raw: string): string {
  return raw
    .replace(/^```[\w-]*\s*$/gm, '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '- ')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .trim()
}

function labeledValue(raw: string, labels: string[]): string | null {
  const lines = raw.split(/\r?\n/).map(plainTextFromMarkdown)
  for (const line of lines) {
    for (const label of labels) {
      const match = line.match(new RegExp(`^\\s*${escapeRegex(label)}\\s*:\\s*(.+)$`, 'i'))
      if (match?.[1]?.trim()) return match[1].trim()
    }
  }
  return null
}

/**
 * Garante o download também para respostas antigas/em Markdown do EF Consultant.
 * O fallback só deve ser habilitado pela tela quando esse agente estiver ativo,
 * evitando transformar respostas normais de outros agentes em documentos.
 */
export function parseEfDocxResponse(raw: string, allowMarkdownFallback = false): EfDocxData | null {
  const structured = parseEfDocxData(raw)
  if (structured || !allowMarkdownFallback) return structured

  const functionalSpec = plainTextFromMarkdown(raw)
  if (!functionalSpec) return null

  const heading = raw.match(/^#\s+(.+)$/m)?.[1]?.trim()
  const projectName =
    labeledValue(raw, ['Nome do Projeto', 'Projeto', 'Título', 'Titulo']) ??
    (heading ? plainTextFromMarkdown(heading).replace(/^Especificação Funcional\s*[-–—:]?\s*/i, '') : null) ??
    'Especificação Funcional'
  const firstParagraph = functionalSpec.split(/\r?\n\s*\r?\n/).find((part) => part.trim()) ?? ''

  return {
    project_name: projectName || 'Especificação Funcional',
    author: labeledValue(raw, ['Autor']) ?? 'A CONFIRMAR',
    client_name: labeledValue(raw, ['Empresa Cliente', 'Cliente', 'Empresa']) ?? 'A CONFIRMAR',
    module: labeledValue(raw, ['Módulo SAP', 'Modulo SAP', 'Módulo', 'Modulo']) ?? 'A CONFIRMAR',
    brief_description: firstParagraph.slice(0, 500),
    summary_description: firstParagraph,
    macro_overview: functionalSpec,
    functional_spec: functionalSpec
  }
}

function escapeXml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Substitui o texto de um placeholder dentro de um <w:r>...<w:t>PLACEHOLDER</w:t></w:r>,
 * preservando o <w:rPr> original (fonte, tamanho, cor) e quebrando em múltiplos <w:t>/<w:br/>
 * dentro do mesmo run quando o valor tem múltiplas linhas — sem isso, quebras de linha do
 * texto gerado pela IA quebrariam o XML do documento.
 */
function replacePlaceholder(xml: string, placeholder: string, value: string): string {
  const pattern = new RegExp(
    `<w:r([^>]*)>(<w:rPr>[\\s\\S]*?</w:rPr>)?<w:t[^>]*>${escapeRegex(placeholder)}</w:t></w:r>`,
    'g'
  )

  return xml.replace(pattern, (_match, runAttrs: string, runProps: string | undefined) => {
    const lines = value.split('\n')
    const body = lines
      .map((line, index) => {
        const textTag = `<w:t xml:space="preserve">${escapeXml(line)}</w:t>`
        return index === 0 ? textTag : `<w:br/>${textTag}`
      })
      .join('')
    return `<w:r${runAttrs}>${runProps ?? ''}${body}</w:r>`
  })
}

function preventJustifiedSoftBreakExpansion(settingsXml: string): string {
  if (settingsXml.includes('<w:doNotExpandShiftReturn')) return settingsXml
  if (settingsXml.includes('</w:compat>')) {
    return settingsXml.replace(
      '</w:compat>',
      '<w:doNotExpandShiftReturn/></w:compat>'
    )
  }
  return settingsXml.replace(
    '</w:settings>',
    '<w:compat><w:doNotExpandShiftReturn/></w:compat></w:settings>'
  )
}

function todayFormatted(): string {
  const now = new Date()
  const day = String(now.getDate()).padStart(2, '0')
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${day}/${month}/${now.getFullYear()}`
}

export async function generateEfDocx(data: EfDocxData): Promise<Blob> {
  const response = await fetch(templateUrl)
  if (!response.ok) {
    throw new Error('Não foi possível carregar o modelo base da EF.')
  }
  const templateBuffer = await response.arrayBuffer()

  const zip = new PizZip(templateBuffer)
  const documentFile = zip.file('word/document.xml')
  if (!documentFile) {
    throw new Error('Modelo base da EF está corrompido (word/document.xml não encontrado).')
  }

  let xml = documentFile.asText()

  const replacements: [string, string][] = [
    ['INSIRA AQUI O NOME DO PROJETO', data.project_name],
    ['NOME DO PROJETO', data.project_name],
    ['DIGITE AQUI O NOME DO AUTOR', data.author],
    ['BREVE DESCRIÇÃO DO PROJETO', data.brief_description],
    ['DIGITE O MODULO DO SAP', data.module],
    ['DIGITE A DATA DO DIA', todayFormatted()],
    ['NOME DA EMPRESA CLIENTE', data.client_name],
    ['NOME DO CONSULTOR', data.author],
    ['DESCRIÇÃO RESUMIDA DO PROJETO', data.summary_description],
    ['FALE DETALHADAMENTE UMA VISAO GERAL DO MACRO DO PROCESSO', data.macro_overview],
    [
      'AQUI DETALHADAMENTE MONTE A ESPECIFICAÇÃO FUNCIONAL ,DETALHES DO PROCESSO , COMO DEVE SER FEITO, QUE TABELAS E CAMPOS USAR, RESULTADO ESPERADO ',
      data.functional_spec
    ]
  ]

  for (const [placeholder, value] of replacements) {
    xml = replacePlaceholder(xml, placeholder, value ?? '')
  }

  zip.file('word/document.xml', xml)

  const settingsFile = zip.file('word/settings.xml')
  if (settingsFile) {
    zip.file('word/settings.xml', preventJustifiedSoftBreakExpansion(settingsFile.asText()))
  }

  return zip.generate({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  })
}

export function efDocxFileName(data: EfDocxData): string {
  const slug = data.project_name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
  return `EF_${slug || 'projeto'}.docx`
}
