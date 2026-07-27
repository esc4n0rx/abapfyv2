import { Bot, FileText, RefreshCw } from 'lucide-react'
import { Markdown } from './Markdown'
import { EfDocxGenerator } from './EfDocxGenerator'
import { StructuredJson } from './StructuredJson'
import { EstimateScenarioCards } from './EstimateScenarioCards'
import { ClarifyQuestion } from './ClarifyQuestion'
import { formatDurationMs, formatTokenCount } from '@renderer/lib/format'
import { parseMessageAttachments } from '@renderer/lib/attachments'
import { parseEfDocxData } from '@renderer/lib/efDocx'
import { parseStructuredJson, extractSoleJsonBlock } from '@renderer/lib/structuredResponse'
import { parseEstimateData } from '@renderer/lib/estimateCards'
import { parseClarify } from '@renderer/lib/clarify'

export interface UiMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  providerLabel?: string
  modelLabel?: string
  effortLabel?: string
  agentName?: string
  streaming?: boolean
  continuing?: number
  elapsedMs?: number
  tokensInput?: number | null
  tokensOutput?: number | null
  error?: string
}

interface ChatMessageItemProps {
  message: UiMessage
  onClarifyAnswer?: (text: string) => void
  clarifyDisabled?: boolean
}

export function ChatMessageItem({
  message,
  onClarifyAnswer,
  clarifyDisabled
}: ChatMessageItemProps): JSX.Element {
  const isUser = message.role === 'user'
  const hasStats =
    !message.streaming && (message.elapsedMs !== undefined || message.tokensInput !== undefined)
  const parsedUser = isUser ? parseMessageAttachments(message.content) : null
  // Cada agente do harness tem seu próprio formato de resposta — alguns devolvem
  // markdown livre, outros um objeto JSON como mensagem inteira (com ou sem fence).
  // Detecta pelo formato, não por agente: clarify (pergunta de esclarecimento) tem
  // prioridade máxima — sem isso, uma mensagem que é só o bloco ```clarify``` cai no
  // renderizador JSON genérico e as opções viram chips estáticos, não clicáveis.
  // Depois EF (gera .docx); qualquer outro objeto JSON cai no renderizador genérico.
  const clarify = !isUser && !message.streaming ? parseClarify(message.content) : null
  const efDocx =
    !isUser && !message.streaming && !clarify ? parseEfDocxData(message.content.trim()) : null
  const estimate =
    !isUser && !message.streaming && !clarify && !efDocx
      ? parseEstimateData(extractSoleJsonBlock(message.content))
      : null
  const structured =
    !isUser && !message.streaming && !clarify && !efDocx && !estimate
      ? parseStructuredJson(message.content)
      : null

  return (
    <div className={`chat-message ${isUser ? 'chat-message-user' : 'chat-message-assistant'}`}>
      {!isUser && (message.providerLabel || message.modelLabel || message.agentName) && (
        <div className="chat-message-meta">
          {message.agentName && (
            <span className="chat-message-agent">
              <Bot size={11} strokeWidth={1.75} />
              {message.agentName}
            </span>
          )}
          <span>{message.providerLabel}</span>
          {message.modelLabel && <span className="chat-message-model">{message.modelLabel}</span>}
          {message.effortLabel && (
            <span className="chat-message-effort">effort: {message.effortLabel}</span>
          )}
        </div>
      )}

      {isUser ? (
        <div className="chat-message-user-bubble">
          {parsedUser?.attachments.length ? (
            <div className="chat-message-attachments">
              {parsedUser.attachments.map((attachment) => (
                <span key={attachment.name} className="chat-message-attachment-chip">
                  <FileText size={11} strokeWidth={1.75} />
                  {attachment.name}
                </span>
              ))}
            </div>
          ) : null}
          {parsedUser?.text && <p className="chat-message-user-content">{parsedUser.text}</p>}
        </div>
      ) : (
        <div className="chat-message-assistant-content">
          {clarify ? (
            <ClarifyQuestion
              question={clarify.question}
              options={clarify.options}
              onAnswer={onClarifyAnswer}
              disabled={clarifyDisabled}
            />
          ) : efDocx ? (
            <EfDocxGenerator data={efDocx} />
          ) : estimate ? (
            <EstimateScenarioCards data={estimate} />
          ) : structured ? (
            <StructuredJson data={structured} />
          ) : (
            <Markdown
              content={message.content}
              onClarifyAnswer={onClarifyAnswer}
              clarifyDisabled={clarifyDisabled}
            />
          )}
          {message.streaming && <span className="chat-message-cursor" aria-hidden="true" />}
          {!!message.continuing && (
            <div className="chat-message-continuing">
              <RefreshCw size={11} strokeWidth={2} className="chat-message-continuing-icon" />
              Continuando automaticamente… (resposta {message.continuing})
            </div>
          )}
        </div>
      )}

      {hasStats && (
        <div className="chat-message-stats">
          {message.elapsedMs !== undefined && <span>{formatDurationMs(message.elapsedMs)}</span>}
          {message.tokensInput !== undefined && (
            <span>
              {formatTokenCount(message.tokensInput)} → {formatTokenCount(message.tokensOutput)}{' '}
              tokens
            </span>
          )}
        </div>
      )}

      {message.error && <p className="chat-message-error">{message.error}</p>}
    </div>
  )
}
