import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import PizZip from 'pizzip'
import {
  generateEfDocx,
  parseEfDocxData,
  parseEfDocxResponse,
  type EfDocxData
} from '../../src/renderer/src/lib/efDocx'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

const templatePath = resolve('src/renderer/src/docs/MODELO BASE EF.docx')
const outputPath = process.argv[2] ? resolve(process.argv[2]) : null
const template = await readFile(templatePath)

globalThis.fetch = async () => new Response(template, { status: 200 })

const data: EfDocxData = {
  project_name: 'Projeto QA EF',
  author: 'Paulo Oliveira',
  client_name: 'Cliente QA',
  module: 'MM',
  brief_description: 'Descrição breve de validação.',
  summary_description: 'Descrição resumida de validação.',
  macro_overview: 'Visão macro do processo.\n\nSegundo parágrafo.',
  functional_spec: '1. OBJETIVO\nValidar a geração do documento.\n\n2. RESULTADO ESPERADO\nArquivo Word preenchido.'
}

const fenced = parseEfDocxData(`Texto introdutório que deve ser tolerado.\n\n\`\`\`ef-docx\n${JSON.stringify(data)}\n\`\`\``)
assert(fenced?.project_name === data.project_name, 'Não extraiu o JSON cercado da resposta.')

const markdown = parseEfDocxResponse(
  '# Especificação Funcional - Projeto Legado\n\n**Autor:** Paulo Oliveira\n**Cliente:** Cliente QA\n**Módulo SAP:** MM\n\n## Objetivo\nGerar o documento legado.',
  true
)
assert(markdown?.project_name === 'Projeto Legado', 'Não extraiu o projeto do Markdown legado.')
assert(markdown?.author === 'Paulo Oliveira', 'Não extraiu o autor do Markdown legado.')
assert(markdown?.functional_spec.includes('Gerar o documento legado.'), 'Perdeu o conteúdo legado.')

const blob = await generateEfDocx(data)
const output = Buffer.from(await blob.arrayBuffer())
const zip = new PizZip(output)
const xml = zip.file('word/document.xml')?.asText() ?? ''
const settingsXml = zip.file('word/settings.xml')?.asText() ?? ''

for (const placeholder of [
  'INSIRA AQUI O NOME DO PROJETO',
  'DIGITE AQUI O NOME DO AUTOR',
  'DIGITE O MODULO DO SAP',
  'NOME DA EMPRESA CLIENTE',
  'NOME DO CONSULTOR',
  'FALE DETALHADAMENTE UMA VISAO GERAL DO MACRO DO PROCESSO',
  'AQUI DETALHADAMENTE MONTE A ESPECIFICAÇÃO FUNCIONAL'
]) {
  assert(!xml.includes(placeholder), `Placeholder não substituído: ${placeholder}`)
}

for (const expected of [data.project_name, data.author, data.client_name, data.module]) {
  assert(xml.includes(expected), `Conteúdo esperado ausente no DOCX: ${expected}`)
}
assert(
  settingsXml.includes('<w:doNotExpandShiftReturn/>'),
  'A proteção contra expansão de linhas justificadas não foi ativada.'
)

if (outputPath) await writeFile(outputPath, output)
console.log(`EF DOCX validado (${output.length} bytes)${outputPath ? `: ${outputPath}` : ''}`)
