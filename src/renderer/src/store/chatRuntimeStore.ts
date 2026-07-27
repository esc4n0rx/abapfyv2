import { create } from 'zustand'
import type { UiMessage } from '@renderer/components/ChatMessageItem'

/**
 * Estado "ao vivo" de cada chat nesta sessão do app — separado de chatStore
 * (metadados persistidos) para que o streaming de um chat continue rodando em
 * segundo plano mesmo depois que o usuário troca de conversa ou inicia uma nova
 * sessão. HomeScreen lê/escreve aqui em vez de manter mensagens/streaming como
 * estado local do componente.
 */
export type ChatRunStatus = 'idle' | 'done' | 'needs_input'

export interface ChatRuntime {
  messages: UiMessage[]
  streaming: boolean
  status: ChatRunStatus
  controller: AbortController | null
}

interface ChatRuntimeState {
  runtimes: Record<string, ChatRuntime>
  ensure: (chatId: string, initialMessages: UiMessage[]) => void
  appendMessage: (chatId: string, message: UiMessage) => void
  updateMessage: (chatId: string, messageId: string, patch: Partial<UiMessage>) => void
  setStreaming: (chatId: string, streaming: boolean) => void
  setStatus: (chatId: string, status: ChatRunStatus) => void
  setController: (chatId: string, controller: AbortController | null) => void
  getController: (chatId: string) => AbortController | null
  reset: () => void
}

function emptyRuntime(initialMessages: UiMessage[] = []): ChatRuntime {
  return { messages: initialMessages, streaming: false, status: 'idle', controller: null }
}

export const useChatRuntimeStore = create<ChatRuntimeState>((set, get) => ({
  runtimes: {},

  ensure: (chatId, initialMessages) => {
    if (get().runtimes[chatId]) return
    set((state) => ({
      runtimes: { ...state.runtimes, [chatId]: emptyRuntime(initialMessages) }
    }))
  },

  appendMessage: (chatId, message) => {
    set((state) => {
      const runtime = state.runtimes[chatId] ?? emptyRuntime()
      return {
        runtimes: {
          ...state.runtimes,
          [chatId]: { ...runtime, messages: [...runtime.messages, message] }
        }
      }
    })
  },

  updateMessage: (chatId, messageId, patch) => {
    set((state) => {
      const runtime = state.runtimes[chatId]
      if (!runtime) return state
      return {
        runtimes: {
          ...state.runtimes,
          [chatId]: {
            ...runtime,
            messages: runtime.messages.map((message) =>
              message.id === messageId ? { ...message, ...patch } : message
            )
          }
        }
      }
    })
  },

  setStreaming: (chatId, streaming) => {
    set((state) => {
      const runtime = state.runtimes[chatId] ?? emptyRuntime()
      return { runtimes: { ...state.runtimes, [chatId]: { ...runtime, streaming } } }
    })
  },

  setStatus: (chatId, status) => {
    set((state) => {
      const runtime = state.runtimes[chatId] ?? emptyRuntime()
      return { runtimes: { ...state.runtimes, [chatId]: { ...runtime, status } } }
    })
  },

  setController: (chatId, controller) => {
    set((state) => {
      const runtime = state.runtimes[chatId] ?? emptyRuntime()
      return { runtimes: { ...state.runtimes, [chatId]: { ...runtime, controller } } }
    })
  },

  getController: (chatId) => get().runtimes[chatId]?.controller ?? null,

  reset: () => set({ runtimes: {} })
}))
