import { KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertCircle,
  ArrowUp,
  Bot,
  ChevronDown,
  FileText,
  FolderKanban,
  Loader2,
  Mic,
  Paperclip,
  Sparkles,
  Square,
  X,
  Zap
} from 'lucide-react'
import abapfyLogo from '@renderer/assets/logo.png'
import { Sidebar } from '@renderer/components/Sidebar'
import { SettingsModal } from '@renderer/components/SettingsModal/SettingsModal'
import { ChatMessageItem, type UiMessage } from '@renderer/components/ChatMessageItem'
import { SkillsScreen } from '@renderer/screens/SkillsScreen'
import { AgentsScreen } from '@renderer/screens/AgentsScreen'
import { ProjectsScreen } from '@renderer/screens/ProjectsScreen'
import { useAuthStore } from '@renderer/store/authStore'
import { useSettingsStore } from '@renderer/store/settingsStore'
import { useAgentsStore, type AgentSource } from '@renderer/store/agentsStore'
import { useChatStore, type ProjectSummary } from '@renderer/store/chatStore'
import { useChatRuntimeStore } from '@renderer/store/chatRuntimeStore'
import { useSkillsStore } from '@renderer/store/skillsStore'
import { useMcpStore } from '@renderer/store/mcpStore'
import { fetchParametrosContextBlock } from '@renderer/store/estimativaParametrosStore'
import { parseClarify } from '@renderer/lib/clarify'
import { AI_PROVIDERS } from '@renderer/lib/aiProviders'
import { runMcpToolLoop } from '@renderer/lib/mcpRuntime'
import {
  CLAUDE_EFFORT_LABELS_PT,
  CLAUDE_EFFORT_LEVELS,
  fetchApiKey,
  routeConversation,
  streamChat,
  type ChatTurn,
  type ClaudeEffort,
  type StreamFinishInfo
} from '@renderer/lib/aiClient'
import {
  buildMessageWithAttachments,
  extractTextFromFile,
  type AttachmentFile
} from '@renderer/lib/attachments'
import './HomeScreen.css'

function createId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const MAX_CONTINUATIONS = 6
const CONTINUE_NUDGE =
  'Continue exatamente de onde parou. Não repita nada do que já foi enviado e não adicione introduções como "continuando" — apenas prossiga o conteúdo até concluir por completo.'

interface ActiveAgent {
  source: AgentSource
  id: string
  name: string
}

type View = 'chat' | 'skills' | 'agents' | 'projects'

export function HomeScreen(): JSX.Element {
  const [view, setView] = useState<View>('chat')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [modelMenuOpen, setModelMenuOpen] = useState(false)
  const [input, setInput] = useState('')
  const [draftMessages, setDraftMessages] = useState<UiMessage[]>([])
  const [isRouting, setIsRouting] = useState(false)
  const [claudeEffort, setClaudeEffort] = useState<ClaudeEffort>('medium')
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const [activeAgent, setActiveAgent] = useState<ActiveAgent | null>(null)
  const [systemPrompt, setSystemPrompt] = useState<string | null>(null)
  const [currentProject, setCurrentProject] = useState<ProjectSummary | null>(null)
  const [sessionSkillNames, setSessionSkillNames] = useState<string[]>([])
  const [attachments, setAttachments] = useState<AttachmentFile[]>([])

  const modelMenuRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Mensagens/streaming de um chat existente vivem na store global (chatRuntimeStore)
  // para que o processamento continue em segundo plano mesmo se o usuário trocar de
  // conversa ou iniciar uma nova sessão — só chats "rascunho" (ainda sem id) usam
  // draftMessages local, até a primeira mensagem criar o chat de verdade.
  const runtimeMessages = useChatRuntimeStore((state) =>
    currentChatId ? state.runtimes[currentChatId]?.messages : undefined
  )
  const isStreaming = useChatRuntimeStore((state) =>
    currentChatId ? (state.runtimes[currentChatId]?.streaming ?? false) : false
  )
  const messages = useMemo(
    () => (currentChatId ? (runtimeMessages ?? []) : draftMessages),
    [currentChatId, runtimeMessages, draftMessages]
  )

  const profile = useAuthStore((state) => state.profile)
  const user = useAuthStore((state) => state.user)
  const { apiKeys, defaultProvider, defaultModel, setDefaultModel } = useSettingsStore((state) => ({
    apiKeys: state.apiKeys,
    defaultProvider: state.defaultProvider,
    defaultModel: state.defaultModel,
    setDefaultModel: state.setDefaultModel
  }))
  const agents = useAgentsStore((state) => state.agents)
  const skills = useSkillsStore((state) => state.skills)
  const configsForAgent = useMcpStore((state) => state.configsForAgent)
  const { createChat, persistMessage, loadChatMeta, loadChatMessages, projects } = useChatStore(
    (state) => ({
      createChat: state.createChat,
      persistMessage: state.persistMessage,
      loadChatMeta: state.loadChatMeta,
      loadChatMessages: state.loadChatMessages,
      projects: state.projects
    })
  )

  useEffect(() => {
    function handleClickOutside(event: MouseEvent): void {
      if (modelMenuRef.current && !modelMenuRef.current.contains(event.target as Node)) {
        setModelMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: 'end' })
  }, [messages])

  const availableModels = useMemo(
    () =>
      AI_PROVIDERS.filter((provider) => apiKeys[provider.id]?.configured).flatMap((provider) =>
        provider.models.map((model) => ({
          provider: provider.id,
          providerName: provider.name,
          model
        }))
      ),
    [apiKeys]
  )

  const selectedProviderDef = defaultProvider
    ? AI_PROVIDERS.find((item) => item.id === defaultProvider)
    : undefined
  const selectedModelDef = selectedProviderDef?.models.find((model) => model.id === defaultModel)

  function resetSession(): void {
    setCurrentChatId(null)
    setDraftMessages([])
    setActiveAgent(null)
    setSystemPrompt(null)
    setSessionSkillNames([])
    setInput('')
  }

  function handleNewSession(): void {
    setView('chat')
    setCurrentProject(null)
    resetSession()
  }

  function handleOpenProjectForNewChat(project: ProjectSummary): void {
    setView('chat')
    setCurrentProject(project)
    resetSession()
  }

  async function handleSelectChat(chatId: string): Promise<void> {
    setView('chat')
    setCurrentChatId(chatId)
    setDraftMessages([])
    setInput('')

    const meta = await loadChatMeta(chatId)
    if (meta) {
      setActiveAgent(
        meta.agentId && meta.agentSource
          ? { source: meta.agentSource, id: meta.agentId, name: meta.agentName ?? meta.agentId }
          : null
      )
      setSystemPrompt(meta.systemPrompt)
      setCurrentProject(
        meta.projectId ? (projects.find((p) => p.id === meta.projectId) ?? null) : null
      )
      setSessionSkillNames(
        meta.skillIds
          .map((id) => skills.find((skill) => skill.slug === id)?.name)
          .filter((name): name is string => Boolean(name))
      )
    }

    // Se o chat já tem uma sessão viva na store (streaming em segundo plano ou já
    // aberto antes nesta sessão do app), reaproveita — nunca sobrescreve com o
    // histórico persistido, que pode estar defasado enquanto uma resposta ainda
    // está sendo gerada.
    if (!useChatRuntimeStore.getState().runtimes[chatId]) {
      const persisted = await loadChatMessages(chatId)
      const providerName = AI_PROVIDERS.find((p) => p.id === meta?.provider)?.name

      useChatRuntimeStore.getState().ensure(
        chatId,
        persisted.map((row, index) => ({
          id: `${chatId}-${index}`,
          role: row.role,
          content: row.content,
          tokensInput: row.tokensInput ?? undefined,
          tokensOutput: row.tokensOutput ?? undefined,
          elapsedMs: row.responseMs ?? undefined,
          agentName: row.role === 'assistant' ? (meta?.agentName ?? undefined) : undefined,
          providerLabel: row.role === 'assistant' ? providerName : undefined,
          modelLabel: row.role === 'assistant' ? (meta?.model ?? undefined) : undefined
        }))
      )
    }
  }

  function updateAttachment(id: string, patch: Partial<AttachmentFile>): void {
    setAttachments((prev) =>
      prev.map((attachment) => (attachment.id === id ? { ...attachment, ...patch } : attachment))
    )
  }

  function handleFilesSelected(fileList: FileList | null): void {
    if (!fileList || fileList.length === 0) return

    Array.from(fileList).forEach((file) => {
      const id = createId()
      setAttachments((prev) => [
        ...prev,
        { id, name: file.name, size: file.size, status: 'reading' }
      ])

      extractTextFromFile(file)
        .then((content) => updateAttachment(id, { status: 'ready', content }))
        .catch((error: Error) => updateAttachment(id, { status: 'error', error: error.message }))
    })

    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function removeAttachment(id: string): void {
    setAttachments((prev) => prev.filter((attachment) => attachment.id !== id))
  }

  async function handleSend(overrideText?: string): Promise<void> {
    const rawText = (overrideText ?? input).trim()
    const readyAttachments = attachments.filter((attachment) => attachment.status === 'ready')
    if ((!rawText && readyAttachments.length === 0) || isStreaming) return
    if (attachments.some((attachment) => attachment.status === 'reading')) return

    const text = rawText || '(sem mensagem — ver anexos)'
    const rt = useChatRuntimeStore.getState()

    function pushLocalError(errorText: string): void {
      const errorMessage: UiMessage = { id: createId(), role: 'assistant', content: '', error: errorText }
      if (currentChatId) rt.appendMessage(currentChatId, errorMessage)
      else setDraftMessages((prev) => [...prev, errorMessage])
    }

    if (!defaultProvider || !defaultModel || !user) {
      pushLocalError('Nenhum modelo padrão configurado. Abra Configurações → Inteligência Artificial.')
      return
    }

    const apiKey = await fetchApiKey(user.id, defaultProvider)
    if (!apiKey) {
      pushLocalError(`Chave de API do provedor ${selectedProviderDef?.name} não encontrada.`)
      return
    }

    const fullContent = buildMessageWithAttachments(
      text,
      readyAttachments.map((attachment) => ({
        name: attachment.name,
        content: attachment.content ?? ''
      }))
    )

    const history: ChatTurn[] = messages
      .filter((message) => !message.error)
      .map((message) => ({ role: message.role, content: message.content }))
    history.push({ role: 'user', content: fullContent })

    const userMessage: UiMessage = { id: createId(), role: 'user', content: fullContent }
    const nextDraftMessages = [...draftMessages, userMessage]
    if (currentChatId) rt.appendMessage(currentChatId, userMessage)
    else setDraftMessages(nextDraftMessages)
    if (!overrideText) setInput('')
    setAttachments([])

    let chatId = currentChatId
    let agent = activeAgent
    let prompt = systemPrompt
    let skillIds: string[] = []

    if (!chatId) {
      const projectAgent =
        currentProject?.defaultAgentSource && currentProject.defaultAgentId
          ? agents.find(
              (item) =>
                item.source === currentProject.defaultAgentSource &&
                item.id === currentProject.defaultAgentId
            )
          : undefined

      if (projectAgent) {
        agent = { source: projectAgent.source, id: projectAgent.id, name: projectAgent.name }
        prompt = projectAgent.content
      } else if (agents.length > 0) {
        setIsRouting(true)
        const claudeKey = await fetchApiKey(user.id, 'claude')
        if (claudeKey) {
          const enabledSkills = skills.filter((skill) => skill.enabled)
          const route = await routeConversation(
            claudeKey,
            fullContent.slice(0, 4000),
            agents.map((item) => ({ id: item.id, name: item.name, description: item.description })),
            enabledSkills.map((skill) => ({
              id: skill.slug,
              name: skill.name,
              description: skill.description ?? ''
            }))
          )
          const routedAgent = route.agentId
            ? agents.find((item) => item.id === route.agentId)
            : undefined
          if (routedAgent) {
            agent = { source: routedAgent.source, id: routedAgent.id, name: routedAgent.name }
            prompt = routedAgent.content
          }

          const routedSkills = enabledSkills.filter((skill) => route.skillIds.includes(skill.slug))
          if (routedAgent && routedSkills.length > 0) {
            skillIds = routedSkills.map((skill) => skill.slug)
            const skillsBlock = routedSkills
              .map((skill) => `- **${skill.name}**: ${skill.description}`)
              .join('\n')
            prompt = `${prompt}\n\n---\n\n## Skills disponíveis para esta sessão\n\nAs skills abaixo foram identificadas como relevantes para o pedido do usuário — use o conhecimento delas como referência adicional ao responder:\n\n${skillsBlock}`
          }
        }
        setIsRouting(false)
      }

      if (agent?.source === 'default' && agent.id === 'effort_estimator' && user?.id) {
        const parametrosBlock = await fetchParametrosContextBlock(user.id)
        prompt = `${prompt}\n\n---\n\n${parametrosBlock}`
      }

      setSessionSkillNames(
        skills.filter((skill) => skillIds.includes(skill.slug)).map((skill) => skill.name)
      )

      const newChatId = await createChat({
        projectId: currentProject?.id ?? null,
        title: text.slice(0, 60),
        agentSource: agent?.source ?? null,
        agentId: agent?.id ?? null,
        agentName: agent?.name ?? null,
        systemPrompt: prompt,
        provider: defaultProvider,
        model: defaultModel,
        skillIds
      })

      if (!newChatId) {
        setDraftMessages((prev) => [
          ...prev,
          {
            id: createId(),
            role: 'assistant',
            content: '',
            error: 'Não foi possível criar a conversa.'
          }
        ])
        return
      }

      chatId = newChatId
      rt.ensure(chatId, nextDraftMessages)
      setDraftMessages([])
      setCurrentChatId(chatId)
      setActiveAgent(agent)
      setSystemPrompt(prompt)
    }

    await persistMessage(chatId, {
      role: 'user',
      content: fullContent,
      tokensInput: null,
      tokensOutput: null,
      responseMs: null
    })

    const assistantId = createId()
    rt.appendMessage(chatId, {
      id: assistantId,
      role: 'assistant',
      content: '',
      providerLabel: selectedProviderDef?.name,
      modelLabel: selectedModelDef?.label,
      effortLabel: defaultProvider === 'claude' ? CLAUDE_EFFORT_LABELS_PT[claudeEffort] : undefined,
      agentName: agent?.name,
      streaming: true
    })
    rt.setStreaming(chatId, true)
    rt.setStatus(chatId, 'idle')

    const controller = new AbortController()
    rt.setController(chatId, controller)

    let accumulated = ''
    let totalInputTokens = 0
    let totalOutputTokens = 0
    let iterationHistory = history
    let finished = false
    let iteration = 0
    const startTime = performance.now()
    let runtimePrompt = prompt

    try {
      if (agent) {
        const mcpServers = configsForAgent(agent.source, agent.id)
        if (mcpServers.length > 0) {
          try {
            const mcpEvidence = await runMcpToolLoop({
              provider: defaultProvider,
              model: defaultModel,
              apiKey,
              messages: history,
              systemPrompt: prompt ?? undefined,
              servers: mcpServers,
              signal: controller.signal
            })
            if (mcpEvidence) runtimePrompt = `${prompt ?? ''}\n\n---\n\n${mcpEvidence}`
          } catch (mcpError) {
            if ((mcpError as Error).name === 'AbortError') throw mcpError
            runtimePrompt = `${prompt ?? ''}\n\n---\n\n## Falha MCP nesta interação\nNão foi possível consultar as ferramentas configuradas: ${(mcpError as Error).message}. Informe essa limitação ao usuário e não apresente dados MCP como verificados.`
          }
        }
      }

      while (!finished && iteration < MAX_CONTINUATIONS) {
        iteration += 1
        if (iteration > 1) {
          rt.updateMessage(chatId, assistantId, { continuing: iteration - 1 })
        }

        let finishInfo: StreamFinishInfo = { reason: 'stop', inputTokens: null, outputTokens: null }

        await streamChat({
          provider: defaultProvider,
          model: defaultModel,
          apiKey,
          messages: iterationHistory,
          systemPrompt: runtimePrompt ?? undefined,
          signal: controller.signal,
          claudeEffort: defaultProvider === 'claude' ? claudeEffort : undefined,
          onDelta: (delta) => {
            accumulated += delta
            rt.updateMessage(chatId, assistantId, { content: accumulated })
          },
          onFinish: (info) => {
            finishInfo = info
          }
        })

        totalInputTokens += finishInfo.inputTokens ?? 0
        totalOutputTokens += finishInfo.outputTokens ?? 0

        if (finishInfo.reason === 'length' && iteration < MAX_CONTINUATIONS) {
          iterationHistory = [
            ...iterationHistory,
            { role: 'assistant', content: accumulated },
            { role: 'user', content: CONTINUE_NUDGE }
          ]
        } else {
          finished = true
        }
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        rt.updateMessage(chatId, assistantId, { error: (error as Error).message })
      }
    } finally {
      const elapsedMs = performance.now() - startTime
      rt.updateMessage(chatId, assistantId, {
        streaming: false,
        continuing: undefined,
        elapsedMs,
        tokensInput: totalInputTokens || undefined,
        tokensOutput: totalOutputTokens || undefined
      })
      rt.setStreaming(chatId, false)
      rt.setController(chatId, null)
      rt.setStatus(chatId, parseClarify(accumulated) ? 'needs_input' : 'done')

      if (chatId && accumulated) {
        await persistMessage(chatId, {
          role: 'assistant',
          content: accumulated,
          tokensInput: totalInputTokens || null,
          tokensOutput: totalOutputTokens || null,
          responseMs: Math.round(elapsedMs)
        })
      }
    }
  }

  function handleStop(): void {
    if (!currentChatId) return
    useChatRuntimeStore.getState().getController(currentChatId)?.abort()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSend()
    }
  }

  const firstName = profile?.nome?.split(' ')[0]

  return (
    <div className="home-screen">
      <Sidebar
        activeView={view}
        activeChatId={currentChatId}
        onNewSession={handleNewSession}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenSkills={() => setView('skills')}
        onOpenAgents={() => setView('agents')}
        onOpenProjects={() => setView('projects')}
        onSelectChat={handleSelectChat}
        onChatRemoved={handleNewSession}
      />

      {view === 'skills' && <SkillsScreen />}
      {view === 'agents' && <AgentsScreen />}
      {view === 'projects' && <ProjectsScreen onOpenProject={handleOpenProjectForNewChat} />}

      {view === 'chat' && (
        <div className="home-main">
          {(isRouting || activeAgent) && (
            <div className="home-chat-header">
              {isRouting ? (
                <>
                  <Loader2 size={13} strokeWidth={2} className="home-chat-header-routing-icon" />
                  Selecionando o agente ideal…
                </>
              ) : (
                <>
                  <Bot size={13} strokeWidth={1.75} className="home-chat-header-icon" />
                  Agente ativo: <span className="home-chat-header-agent">{activeAgent?.name}</span>
                  {sessionSkillNames.length > 0 && (
                    <span className="home-chat-header-skills" title={sessionSkillNames.join(', ')}>
                      <Sparkles size={11} strokeWidth={1.75} />
                      {sessionSkillNames.length} skill{sessionSkillNames.length > 1 ? 's' : ''}
                    </span>
                  )}
                </>
              )}
            </div>
          )}

          <div className="home-messages">
            {messages.length === 0 ? (
              <div className="home-welcome">
                <img src={abapfyLogo} alt="" className="home-welcome-logo" />
                <h1 className="home-welcome-title">
                  {firstName ? `Bem-vindo, ${firstName}` : 'Bem-vindo ao Abapfy'}
                </h1>
                <p className="home-welcome-subtitle">
                  Pergunte sobre ABAP, depure erros de dump ou peça ajuda com suas rotinas SAP.
                </p>
              </div>
            ) : (
              <div className="home-messages-list">
                {messages.map((message) => (
                  <ChatMessageItem
                    key={message.id}
                    message={message}
                    onClarifyAnswer={(text) => handleSend(text)}
                    clarifyDisabled={isStreaming}
                  />
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          <div className="home-composer">
            {(currentProject || attachments.length > 0) && (
              <div className="home-composer-badges">
                {currentProject && (
                  <span className="home-project-badge">
                    <FolderKanban size={11} strokeWidth={1.75} />
                    {currentProject.name}
                  </span>
                )}
                {attachments.map((attachment) => (
                  <span
                    key={attachment.id}
                    className={`home-attachment-chip ${
                      attachment.status === 'error' ? 'home-attachment-chip-error' : ''
                    }`}
                    title={attachment.status === 'error' ? attachment.error : attachment.name}
                  >
                    {attachment.status === 'reading' ? (
                      <Loader2 size={11} strokeWidth={2} className="home-attachment-spin" />
                    ) : attachment.status === 'error' ? (
                      <AlertCircle size={11} strokeWidth={1.75} />
                    ) : (
                      <FileText size={11} strokeWidth={1.75} />
                    )}
                    <span className="home-attachment-chip-name">{attachment.name}</span>
                    {attachment.status === 'ready' && (
                      <span className="home-attachment-chip-size">
                        {formatFileSize(attachment.size)}
                      </span>
                    )}
                    <button
                      type="button"
                      className="home-attachment-chip-remove"
                      onClick={() => removeAttachment(attachment.id)}
                      aria-label={`Remover ${attachment.name}`}
                    >
                      <X size={10} strokeWidth={2} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <textarea
              className="home-composer-input"
              placeholder="Pergunte alguma coisa sobre SAP/ABAP…"
              rows={2}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
            />
            <div className="home-composer-toolbar">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="home-file-input-hidden"
                accept=".txt,.md,.markdown,.json,.yaml,.yml,.xml,.csv,.log,.pdf,.docx,.abap,.cds,.dcl,.sql,.js,.jsx,.ts,.tsx,.py,.java,.cs,.c,.cpp,.h,.go,.rb,.php,.sh,.ps1,.html,.css,.scss"
                onChange={(event) => handleFilesSelected(event.target.files)}
              />
              <button
                type="button"
                className="home-composer-icon-btn"
                title="Anexar arquivo (PDF, DOCX, TXT, código...)"
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip size={16} strokeWidth={1.75} />
              </button>

              <div className="home-composer-spacer" />

              <div className="home-model-select" ref={modelMenuRef}>
                <button
                  type="button"
                  className="home-model-trigger"
                  onClick={() => setModelMenuOpen((open) => !open)}
                >
                  <span>
                    {selectedModelDef
                      ? defaultProvider === 'claude'
                        ? `${selectedModelDef.label} ${CLAUDE_EFFORT_LABELS_PT[claudeEffort]}`
                        : selectedModelDef.label
                      : 'Selecionar modelo'}
                  </span>
                  <ChevronDown size={13} strokeWidth={1.75} />
                </button>

                {modelMenuOpen && (
                  <div className="home-model-menu">
                    {defaultProvider === 'claude' && (
                      <>
                        <div className="effort-panel">
                          <div className="effort-panel-header">
                            <span>Effort</span>
                            <Zap size={13} strokeWidth={1.75} />
                          </div>
                          <div className="effort-slider">
                            <div className="effort-slider-track">
                              <div
                                className="effort-slider-fill"
                                style={{
                                  width: `${
                                    (CLAUDE_EFFORT_LEVELS.indexOf(claudeEffort) /
                                      (CLAUDE_EFFORT_LEVELS.length - 1)) *
                                    100
                                  }%`
                                }}
                              />
                              {CLAUDE_EFFORT_LEVELS.map((level, index) => (
                                <span
                                  key={level}
                                  className="effort-slider-dot"
                                  style={{
                                    left: `${(index / (CLAUDE_EFFORT_LEVELS.length - 1)) * 100}%`
                                  }}
                                />
                              ))}
                            </div>
                            <input
                              type="range"
                              className="effort-slider-input"
                              min={0}
                              max={CLAUDE_EFFORT_LEVELS.length - 1}
                              step={1}
                              value={CLAUDE_EFFORT_LEVELS.indexOf(claudeEffort)}
                              onChange={(event) =>
                                setClaudeEffort(CLAUDE_EFFORT_LEVELS[Number(event.target.value)])
                              }
                            />
                          </div>
                          <span className="effort-panel-value">
                            {CLAUDE_EFFORT_LABELS_PT[claudeEffort]}
                          </span>
                        </div>
                        <div className="home-model-menu-divider" />
                      </>
                    )}

                    {availableModels.length === 0 ? (
                      <button
                        type="button"
                        className="home-model-menu-empty"
                        onClick={() => {
                          setModelMenuOpen(false)
                          setSettingsOpen(true)
                        }}
                      >
                        Nenhuma chave de IA configurada — abrir Configurações
                      </button>
                    ) : (
                      availableModels.map(({ provider, providerName, model }) => (
                        <button
                          key={`${provider}-${model.id}`}
                          type="button"
                          className="home-model-menu-item"
                          onClick={() => {
                            setDefaultModel(provider, model.id)
                            setModelMenuOpen(false)
                          }}
                        >
                          <span className="home-model-menu-item-label">{model.label}</span>
                          <span className="home-model-menu-item-provider">{providerName}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              <button type="button" className="home-composer-icon-btn" title="Voz (em breve)">
                <Mic size={16} strokeWidth={1.75} />
              </button>

              {isStreaming ? (
                <button
                  type="button"
                  className="home-composer-send home-composer-send-stop"
                  title="Parar"
                  onClick={handleStop}
                >
                  <Square size={13} strokeWidth={2} fill="currentColor" />
                </button>
              ) : (
                <button
                  type="button"
                  className="home-composer-send"
                  title="Enviar"
                  disabled={
                    (!input.trim() && attachments.length === 0) ||
                    attachments.some((attachment) => attachment.status === 'reading')
                  }
                  onClick={() => handleSend()}
                >
                  <ArrowUp size={16} strokeWidth={2} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  )
}
