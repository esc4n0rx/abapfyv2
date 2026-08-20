import type { AiProviderId } from '@renderer/lib/aiProviders'
import type { ChatTurn } from '@renderer/lib/aiClient'
import type { McpServerItem } from '@renderer/store/mcpStore'

interface McpServerConfig {
  id: string
  name: string
  transport: 'streamable_http' | 'stdio'
  url: string | null
  command: string | null
  args: string[]
}

interface McpToolInfo {
  qualifiedName: string
  serverId: string
  serverName: string
  name: string
  description: string
  inputSchema: Record<string, unknown>
  requiresConfirmation: boolean
  // Ferramenta sintética gerada aqui (não vem do servidor) que despacha pra
  // `mcp:readResource` em vez de `mcp:callTool` — ver buildResourceTools().
  isResourceReader?: boolean
}

type McpResourceInfo = Awaited<ReturnType<typeof window.api.mcp.listResources>>[number]

export interface McpToolEvent {
  id: string
  serverName: string
  toolName: string
  status: 'running' | 'confirm' | 'done' | 'error'
}

interface RunMcpArgs {
  provider: AiProviderId
  model: string
  apiKey: string
  messages: ChatTurn[]
  systemPrompt?: string
  servers: McpServerItem[]
  signal: AbortSignal
  onToolEvent?: (event: McpToolEvent) => void
}

interface ToolExecution {
  tool: McpToolInfo
  args: Record<string, unknown>
  result: unknown
}

const MAX_TOOL_ROUNDS = 6
const MAX_RESULT_CHARS = 30000

function asConfig(server: McpServerItem): McpServerConfig {
  return { id: server.id, name: server.name, transport: server.transport, url: server.url, command: server.command, args: server.args }
}

function safeJson(value: unknown): string {
  let output: string
  try { output = JSON.stringify(value) } catch { output = String(value) }
  return output.length > MAX_RESULT_CHARS ? `${output.slice(0, MAX_RESULT_CHARS)}…` : output
}

let toolEventSeq = 0
const TOOL_RETRY_ATTEMPTS = 1
const TOOL_RETRY_DELAY_MS = 900

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Servidor MCP resolve URL/spawn de novo a cada tentativa; um hiccup de rede
// (DNS, conexão recusada, timeout do transporte) não deveria derrubar o loop
// inteiro e cair no fallback textual "Falha MCP nesta interação" — vale uma
// segunda tentativa curta antes de desistir. Recusa do usuário (dialog/card)
// não passa por aqui: isso volta como resultado normal com isError, não como
// exceção, então nunca é retentado.
async function callWithRetry(run: () => Promise<unknown>): Promise<unknown> {
  let lastError: unknown
  for (let attempt = 0; attempt <= TOOL_RETRY_ATTEMPTS; attempt += 1) {
    try {
      return await run()
    } catch (error) {
      lastError = error
      if (attempt < TOOL_RETRY_ATTEMPTS) await delay(TOOL_RETRY_DELAY_MS)
    }
  }
  throw lastError
}

async function executeTool(
  tools: McpToolInfo[],
  configs: McpServerConfig[],
  qualifiedName: string,
  args: Record<string, unknown>,
  signal: AbortSignal,
  onToolEvent?: (event: McpToolEvent) => void
): Promise<ToolExecution> {
  const tool = tools.find((item) => item.qualifiedName === qualifiedName)
  if (!tool) throw new Error(`Ferramenta MCP desconhecida: ${qualifiedName}`)
  const config = configs.find((item) => item.id === tool.serverId)
  if (!config) throw new Error(`Configuração MCP não encontrada para ${tool.serverName}.`)
  toolEventSeq += 1
  const eventId = `mcp-${toolEventSeq}`
  onToolEvent?.({ id: eventId, serverName: tool.serverName, toolName: tool.name, status: 'running' })

  // Ferramentas que exigem autorização mostram um card no chat (não mais um
  // dialog nativo — ver McpConfirmationBanner) antes de rodar. Sem isso a
  // badge fica presa em "executando" sem explicar que o app está esperando um
  // clique do usuário.
  const unsubscribePending = window.api.mcp.onConfirmationPending((event) => {
    if (event.callId !== eventId) return
    onToolEvent?.({ id: eventId, serverName: tool.serverName, toolName: tool.name, status: 'confirm' })
  })
  const unsubscribeResolved = window.api.mcp.onConfirmationResolved((event) => {
    if (event.callId !== eventId || !event.approved) return
    onToolEvent?.({ id: eventId, serverName: tool.serverName, toolName: tool.name, status: 'running' })
  })
  // Parar a resposta no meio de uma ferramenta MCP em andamento cancela de
  // verdade a chamada no main process (client.request com AbortSignal), em
  // vez de só cancelar o streaming de texto e deixar a ferramenta terminando
  // sozinha em segundo plano até o timeout de 45s.
  const onAbort = (): void => window.api.mcp.cancelTool(eventId)
  signal.addEventListener('abort', onAbort)

  try {
    const result = await callWithRetry(() =>
      tool.isResourceReader
        ? window.api.mcp.readResource(config, String(args.uri ?? ''), eventId)
        : window.api.mcp.callTool(config, tool.name, args, eventId)
    )
    onToolEvent?.({ id: eventId, serverName: tool.serverName, toolName: tool.name, status: 'done' })
    return { tool, args, result }
  } catch (error) {
    onToolEvent?.({ id: eventId, serverName: tool.serverName, toolName: tool.name, status: 'error' })
    throw error
  } finally {
    unsubscribePending()
    unsubscribeResolved()
    signal.removeEventListener('abort', onAbort)
  }
}

// Expõe recursos MCP (protocolo `resources/*`, separado de `tools/*`) como
// mais uma ferramenta de leitura pro modelo escolher — sem isso, servidores
// que só publicam recursos (não tools) ficavam invisíveis pro harness.
async function buildResourceTools(configs: McpServerConfig[]): Promise<McpToolInfo[]> {
  const resources = await window.api.mcp.listResources(configs).catch(() => [] as McpResourceInfo[])
  if (resources.length === 0) return []

  const byServer = new Map<string, McpResourceInfo[]>()
  for (const resource of resources) {
    const list = byServer.get(resource.serverId) ?? []
    list.push(resource)
    byServer.set(resource.serverId, list)
  }

  return [...byServer.entries()].map(([serverId, list]) => {
    const catalog = list
      .slice(0, 30)
      .map((r) => `- ${r.uri}${r.name && r.name !== r.uri ? ` (${r.name})` : ''}${r.description ? `: ${r.description}` : ''}`)
      .join('\n')
    return {
      qualifiedName: `mcp_${serverId.slice(0, 8)}__read_resource`,
      serverId,
      serverName: list[0].serverName,
      name: 'read_resource',
      description: `Lê o conteúdo de um recurso MCP exposto por ${list[0].serverName} pela URI exata. Recursos disponíveis:\n${catalog}`,
      inputSchema: {
        type: 'object',
        properties: { uri: { type: 'string', description: 'URI exata do recurso, como listada acima.' } },
        required: ['uri']
      },
      requiresConfirmation: false,
      isResourceReader: true
    }
  })
}

async function runOpenAi(args: RunMcpArgs, configs: McpServerConfig[], tools: McpToolInfo[]): Promise<ToolExecution[]> {
  const messages: Array<Record<string, unknown>> = [...(args.systemPrompt ? [{ role: 'system', content: args.systemPrompt }] : []), ...args.messages]
  const executions: ToolExecution[] = []
  for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', { method: 'POST', signal: args.signal, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${args.apiKey}` }, body: JSON.stringify({ model: args.model, stream: false, messages, tools: tools.map((tool) => ({ type: 'function', function: { name: tool.qualifiedName, description: `[${tool.serverName}] ${tool.description}`, parameters: tool.inputSchema } })), tool_choice: 'auto' }) })
    if (!response.ok) throw new Error(`OpenAI MCP ${response.status}: ${await response.text()}`)
    const data = await response.json()
    const message = data.choices?.[0]?.message
    const calls: Array<Record<string, unknown>> = message?.tool_calls ?? []
    if (calls.length === 0) break
    messages.push(message)
    for (const call of calls) {
      const fn = call.function as { name?: string; arguments?: string } | undefined
      const callArgs = JSON.parse(fn?.arguments || '{}') as Record<string, unknown>
      const execution = await executeTool(tools, configs, fn?.name ?? '', callArgs, args.signal, args.onToolEvent)
      executions.push(execution)
      messages.push({ role: 'tool', tool_call_id: call.id, content: safeJson(execution.result) })
    }
  }
  return executions
}

async function runClaude(args: RunMcpArgs, configs: McpServerConfig[], tools: McpToolInfo[]): Promise<ToolExecution[]> {
  const messages: Array<Record<string, unknown>> = args.messages.map((message) => ({ ...message }))
  const executions: ToolExecution[] = []
  for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
    const response = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', signal: args.signal, headers: { 'Content-Type': 'application/json', 'x-api-key': args.apiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' }, body: JSON.stringify({ model: args.model, max_tokens: 4096, ...(args.systemPrompt ? { system: args.systemPrompt } : {}), messages, tools: tools.map((tool) => ({ name: tool.qualifiedName, description: `[${tool.serverName}] ${tool.description}`, input_schema: tool.inputSchema })) }) })
    if (!response.ok) throw new Error(`Claude MCP ${response.status}: ${await response.text()}`)
    const data = await response.json()
    const calls = (data.content ?? []).filter((block: { type?: string }) => block.type === 'tool_use')
    if (calls.length === 0) break
    messages.push({ role: 'assistant', content: data.content })
    const results: Record<string, unknown>[] = []
    for (const call of calls) {
      const execution = await executeTool(tools, configs, call.name, (call.input ?? {}) as Record<string, unknown>, args.signal, args.onToolEvent)
      executions.push(execution)
      results.push({ type: 'tool_result', tool_use_id: call.id, content: safeJson(execution.result), is_error: Boolean((execution.result as { isError?: boolean })?.isError) })
    }
    messages.push({ role: 'user', content: results })
  }
  return executions
}

async function runGemini(args: RunMcpArgs, configs: McpServerConfig[], tools: McpToolInfo[]): Promise<ToolExecution[]> {
  const contents: Array<Record<string, unknown>> = args.messages.map((message) => ({ role: message.role === 'assistant' ? 'model' : 'user', parts: [{ text: message.content }] }))
  const executions: ToolExecution[] = []
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${args.model}:generateContent?key=${args.apiKey}`
  for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
    const response = await fetch(url, { method: 'POST', signal: args.signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents, ...(args.systemPrompt ? { systemInstruction: { parts: [{ text: args.systemPrompt }] } } : {}), tools: [{ functionDeclarations: tools.map((tool) => ({ name: tool.qualifiedName, description: `[${tool.serverName}] ${tool.description}`, parameters: tool.inputSchema })) }] }) })
    if (!response.ok) throw new Error(`Gemini MCP ${response.status}: ${await response.text()}`)
    const data = await response.json()
    const content = data.candidates?.[0]?.content
    const calls = (content?.parts ?? []).filter((part: { functionCall?: unknown }) => part.functionCall)
    if (calls.length === 0) break
    contents.push(content)
    const responseParts: Record<string, unknown>[] = []
    for (const part of calls) {
      const call = part.functionCall as { name: string; args?: Record<string, unknown> }
      const execution = await executeTool(tools, configs, call.name, call.args ?? {}, args.signal, args.onToolEvent)
      executions.push(execution)
      responseParts.push({ functionResponse: { name: call.name, response: { result: execution.result } } })
    }
    contents.push({ role: 'user', parts: responseParts })
  }
  return executions
}

export async function runMcpToolLoop(args: RunMcpArgs): Promise<string | null> {
  if (args.servers.length === 0) return null
  const configs = args.servers.map(asConfig)
  const [serverTools, resourceTools] = await Promise.all([
    window.api.mcp.listTools(configs),
    buildResourceTools(configs)
  ])
  const tools = [...serverTools, ...resourceTools]
  if (tools.length === 0) return null
  const executions = args.provider === 'openai' ? await runOpenAi(args, configs, tools) : args.provider === 'claude' ? await runClaude(args, configs, tools) : await runGemini(args, configs, tools)
  if (executions.length === 0) return null
  return ['## Evidências obtidas por ferramentas MCP nesta interação', 'Use os resultados abaixo como evidência. Não afirme que uma ação ocorreu além do que o retorno comprova.', ...executions.map((execution, index) => `### ${index + 1}. ${execution.tool.serverName} / ${execution.tool.name}\nArgumentos: ${safeJson(execution.args)}\nResultado: ${safeJson(execution.result)}`)].join('\n\n')
}
