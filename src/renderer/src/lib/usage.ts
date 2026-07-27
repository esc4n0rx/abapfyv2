export type UsagePeriod = 'all' | '30d' | '7d'

export interface UsageChat {
  id: string
  model: string | null
}

export interface UsageMessage {
  chatId: string
  role: 'user' | 'assistant'
  tokensInput: number | null
  tokensOutput: number | null
  createdAt: string
}

export interface ModelUsage {
  model: string
  messages: number
  tokens: number
}

export interface HeatmapDay {
  date: string
  count: number
}

export interface UsageStats {
  sessions: number
  messages: number
  totalTokens: number
  activeDays: number
  currentStreak: number
  longestStreak: number
  peakHour: number | null
  favoriteModel: string | null
  modelBreakdown: ModelUsage[]
  heatmap: HeatmapDay[]
}

const HEATMAP_WEEKS = 15

function toLocalDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function periodCutoff(period: UsagePeriod): Date | null {
  if (period === 'all') return null
  const days = period === '30d' ? 30 : 7
  const cutoff = new Date()
  cutoff.setHours(0, 0, 0, 0)
  cutoff.setDate(cutoff.getDate() - (days - 1))
  return cutoff
}

function computeStreaks(activeDateKeys: Set<string>): { current: number; longest: number } {
  if (activeDateKeys.size === 0) return { current: 0, longest: 0 }

  const sortedDates = Array.from(activeDateKeys)
    .map((key) => new Date(`${key}T00:00:00`))
    .sort((a, b) => a.getTime() - b.getTime())

  let longest = 1
  let run = 1
  for (let i = 1; i < sortedDates.length; i += 1) {
    const diffDays = Math.round(
      (sortedDates[i].getTime() - sortedDates[i - 1].getTime()) / (24 * 60 * 60 * 1000)
    )
    run = diffDays === 1 ? run + 1 : 1
    longest = Math.max(longest, run)
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayKey = toLocalDateKey(today)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayKey = toLocalDateKey(yesterday)

  let anchor: Date | null = null
  if (activeDateKeys.has(todayKey)) anchor = today
  else if (activeDateKeys.has(yesterdayKey)) anchor = yesterday

  let current = 0
  if (anchor) {
    current = 1
    const cursor = new Date(anchor)
    for (;;) {
      cursor.setDate(cursor.getDate() - 1)
      if (activeDateKeys.has(toLocalDateKey(cursor))) current += 1
      else break
    }
  }

  return { current, longest }
}

function buildHeatmap(messages: UsageMessage[]): HeatmapDay[] {
  const countByDate = new Map<string, number>()
  messages.forEach((message) => {
    const key = toLocalDateKey(new Date(message.createdAt))
    countByDate.set(key, (countByDate.get(key) ?? 0) + 1)
  })

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const totalDays = HEATMAP_WEEKS * 7
  // Alinha o fim da grade ao sábado da semana atual para formar colunas completas.
  const endOffset = 6 - today.getDay()
  const end = new Date(today)
  end.setDate(end.getDate() + endOffset)

  const days: HeatmapDay[] = []
  for (let i = totalDays - 1; i >= 0; i -= 1) {
    const date = new Date(end)
    date.setDate(date.getDate() - i)
    const key = toLocalDateKey(date)
    days.push({ date: key, count: countByDate.get(key) ?? 0 })
  }
  return days
}

export function computeUsageStats(
  chats: UsageChat[],
  messages: UsageMessage[],
  period: UsagePeriod
): UsageStats {
  const cutoff = periodCutoff(period)
  const filtered = cutoff ? messages.filter((m) => new Date(m.createdAt) >= cutoff) : messages

  const chatModelById = new Map(chats.map((chat) => [chat.id, chat.model]))

  const sessionIds = new Set(filtered.map((m) => m.chatId))

  let totalTokens = 0
  const activeDateKeys = new Set<string>()
  const hourCounts = new Map<number, number>()
  const modelStats = new Map<string, { messages: number; tokens: number }>()

  filtered.forEach((message) => {
    const date = new Date(message.createdAt)
    activeDateKeys.add(toLocalDateKey(date))
    hourCounts.set(date.getHours(), (hourCounts.get(date.getHours()) ?? 0) + 1)

    const tokens = (message.tokensInput ?? 0) + (message.tokensOutput ?? 0)
    if (message.role === 'assistant') totalTokens += tokens

    const model = chatModelById.get(message.chatId) ?? 'Desconhecido'
    const entry = modelStats.get(model) ?? { messages: 0, tokens: 0 }
    entry.messages += 1
    entry.tokens += tokens
    modelStats.set(model, entry)
  })

  let peakHour: number | null = null
  let peakHourCount = 0
  hourCounts.forEach((count, hour) => {
    if (count > peakHourCount) {
      peakHourCount = count
      peakHour = hour
    }
  })

  const modelBreakdown: ModelUsage[] = Array.from(modelStats.entries())
    .map(([model, stats]) => ({ model, messages: stats.messages, tokens: stats.tokens }))
    .sort((a, b) => b.messages - a.messages)

  const { current, longest } = computeStreaks(activeDateKeys)

  return {
    sessions: sessionIds.size,
    messages: filtered.length,
    totalTokens,
    activeDays: activeDateKeys.size,
    currentStreak: current,
    longestStreak: longest,
    peakHour,
    favoriteModel: modelBreakdown[0]?.model ?? null,
    modelBreakdown,
    heatmap: buildHeatmap(messages)
  }
}

const LITTLE_PRINCE_TOKENS = 38000

export function compareToLittlePrince(totalTokens: number): number {
  return Math.round(totalTokens / LITTLE_PRINCE_TOKENS)
}
