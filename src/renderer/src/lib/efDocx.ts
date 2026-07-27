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

/**
 * Detecta e normaliza os dados da EF a partir de um texto JSON (bloco de código ou a
 * mensagem inteira) — pelo formato dos dados, não pela linguagem declarada no bloco, já
 * que o modelo às vezes usa ```json em vez de ```ef-docx apesar da instrução no agente.
 * Exige os dois campos mais característicos do template (project_name + functional_spec)
 * para não confundir com o JSON de outro agente.
 */
export function parseEfDocxData(raw: string): EfDocxData | null {
  try {
    const parsed = JSON.parse(raw)
    if (typeof parsed.project_name !== 'string' || !parsed.project_name.trim()) return null
    if (typeof parsed.functional_spec !== 'string' || !parsed.functional_spec.trim()) return null

    const field = (value: unknown, fallback: string): string =>
      typeof value === 'string' && value.trim() ? value : fallback

    return {
      project_name: parsed.project_name,
      author: field(parsed.author, 'A CONFIRMAR'),
      client_name: field(parsed.client_name, 'A CONFIRMAR'),
      module: field(parsed.module, 'A CONFIRMAR'),
      brief_description: field(parsed.brief_description, ''),
      summary_description: field(parsed.summary_description, ''),
      macro_overview: field(parsed.macro_overview, ''),
      functional_spec: field(parsed.functional_spec, '')
    }
  } catch {
    return null
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
