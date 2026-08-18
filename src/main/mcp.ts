import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { CompatibilityCallToolResultSchema } from '@modelcontextprotocol/sdk/types.js'

export interface McpServerConfig {
  id: string
  name: string
  transport: 'streamable_http' | 'stdio'
  url: string | null
  command: string | null
  args: string[]
}

export interface McpToolInfo {
  qualifiedName: string
  serverId: string
  serverName: string
  name: string
  description: string
  inputSchema: Record<string, unknown>
  requiresConfirmation: boolean
}

interface ConnectedServer {
  signature: string
  client: Client
}

const clients = new Map<string, ConnectedServer>()
const toolConfirmations = new Map<string, boolean>()
const SAFE_STDIO_COMMANDS = new Set(['node', 'node.exe', 'npx', 'npx.cmd'])
const WRITE_TOOL_PATTERN =
  /(^|_)(create|update|delete|remove|write|edit|activate|release|transport|import|deploy|execute|run|apply|commit|push|generate|refactor|rename|move|lock|unlock)(_|$)/i
const READ_TOOL_PATTERN =
  /(^|_)(search|fetch|get|list|read|find|inspect|describe|status|health|validate|check|compare|analyze|query|discover|lookup|details|matrix|diff|service)(_|$)/i

function signature(config: McpServerConfig): string {
  return JSON.stringify([config.transport, config.url, config.command, config.args])
}

function validateConfig(config: McpServerConfig): void {
  if (config.transport === 'streamable_http') {
    if (!config.url) throw new Error('Servidor MCP HTTP sem URL.')
    const url = new URL(config.url)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new Error('A URL MCP deve usar HTTP ou HTTPS.')
    }
    return
  }

  if (!config.command) throw new Error('Servidor MCP stdio sem comando.')
  const executable = config.command.replaceAll('\\', '/').split('/').pop()?.toLowerCase() ?? ''
  if (!SAFE_STDIO_COMMANDS.has(executable)) {
    throw new Error('Por segurança, comandos MCP stdio devem usar node ou npx.')
  }
}

async function connect(config: McpServerConfig): Promise<Client> {
  validateConfig(config)
  const nextSignature = signature(config)
  const cached = clients.get(config.id)
  if (cached?.signature === nextSignature) return cached.client
  if (cached) {
    await cached.client.close().catch(() => undefined)
    clients.delete(config.id)
  }

  const client = new Client({ name: 'abapfy', version: '0.1.0' })
  const transport =
    config.transport === 'streamable_http'
      ? new StreamableHTTPClientTransport(new URL(config.url!))
      : new StdioClientTransport({
          command: config.command!,
          args: config.args,
          stderr: 'pipe'
        })

  await client.connect(transport)
  clients.set(config.id, { signature: nextSignature, client })
  return client
}

function requiresConfirmation(tool: {
  name: string
  annotations?: { readOnlyHint?: boolean; destructiveHint?: boolean }
}): boolean {
  if (tool.annotations?.destructiveHint === true) return true
  if (tool.annotations?.readOnlyHint === true) return false
  if (WRITE_TOOL_PATTERN.test(tool.name)) return true
  return !READ_TOOL_PATTERN.test(tool.name)
}

function compactToolName(serverId: string, toolName: string): string {
  const safe = toolName.replace(/[^a-zA-Z0-9_-]/g, '_')
  let hash = 0
  for (const character of safe) hash = (hash * 31 + character.charCodeAt(0)) >>> 0
  const compact = safe.length > 45 ? `${safe.slice(0, 38)}_${hash.toString(36).slice(0, 6)}` : safe
  return `mcp_${serverId.slice(0, 8)}__${compact}`
}

export async function listMcpTools(configs: McpServerConfig[]): Promise<McpToolInfo[]> {
  const results = await Promise.allSettled(
    configs.map(async (config) => {
      const client = await connect(config)
      const response = await client.listTools()
      return response.tools.map((tool) => {
        const confirmation = requiresConfirmation(tool)
        toolConfirmations.set(`${config.id}:${tool.name}`, confirmation)
        return {
          qualifiedName: compactToolName(config.id, tool.name),
          serverId: config.id,
          serverName: config.name,
          name: tool.name,
          description: tool.description ?? `Ferramenta ${tool.name} do servidor ${config.name}.`,
          inputSchema: tool.inputSchema as Record<string, unknown>,
          requiresConfirmation: confirmation
        }
      })
    })
  )

  const tools: McpToolInfo[] = []
  const errors: string[] = []
  for (const result of results) {
    if (result.status === 'fulfilled') tools.push(...result.value)
    else errors.push(result.reason instanceof Error ? result.reason.message : String(result.reason))
  }
  if (tools.length === 0 && errors.length > 0) throw new Error(errors.join('\n'))
  return tools
}

export function mcpToolRequiresConfirmation(serverId: string, toolName: string): boolean {
  return toolConfirmations.get(`${serverId}:${toolName}`) ?? true
}

export async function callMcpTool(
  config: McpServerConfig,
  toolName: string,
  args: Record<string, unknown>
): Promise<unknown> {
  const client = await connect(config)
  // Alguns servidores (incluindo versões do SAP Docs) retornam conteúdo textual
  // útil, mas um structuredContent que não corresponde ao outputSchema anunciado.
  // Client.callTool() rejeita a resposta inteira nesse caso. A chamada request()
  // continua validando o envelope MCP, preserva o retorno original e, sobretudo,
  // evita repetir a execução de uma ferramenta que pode ter efeitos colaterais.
  return client.request(
    { method: 'tools/call', params: { name: toolName, arguments: args } },
    CompatibilityCallToolResultSchema
  )
}

export async function closeMcpClients(): Promise<void> {
  await Promise.allSettled([...clients.values()].map(({ client }) => client.close()))
  clients.clear()
  toolConfirmations.clear()
}
