import { useEffect, useMemo, useState } from 'react'
import { Trophy, X } from 'lucide-react'
import { useUsageStore } from '@renderer/store/usageStore'
import { computeUsageStats, compareToLittlePrince, type UsagePeriod } from '@renderer/lib/usage'
import { formatCount, formatTokenCount } from '@renderer/lib/format'
import './UsageModal.css'

interface UsageModalProps {
  open: boolean
  onClose: () => void
}

const PERIODS: { id: UsagePeriod; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: '30d', label: '30d' },
  { id: '7d', label: '7d' }
]

const WEEKDAY_LABELS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

function heatmapLevel(count: number): number {
  if (count === 0) return 0
  if (count <= 2) return 1
  if (count <= 5) return 2
  if (count <= 10) return 3
  return 4
}

export function UsageModal({ open, onClose }: UsageModalProps): JSX.Element | null {
  const [tab, setTab] = useState<'overview' | 'models'>('overview')
  const [period, setPeriod] = useState<UsagePeriod>('all')

  const { chats, messages, rank, loaded, load } = useUsageStore((state) => ({
    chats: state.chats,
    messages: state.messages,
    rank: state.rank,
    loaded: state.loaded,
    load: state.load
  }))

  useEffect(() => {
    if (open && !loaded) load()
  }, [open, loaded, load])

  useEffect(() => {
    if (!open) return
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  const stats = useMemo(() => computeUsageStats(chats, messages, period), [chats, messages, period])

  if (!open) return null

  const heatmapWeeks: (typeof stats.heatmap)[] = []
  for (let i = 0; i < stats.heatmap.length; i += 7) {
    heatmapWeeks.push(stats.heatmap.slice(i, i + 7))
  }

  const littlePrinceMultiplier = compareToLittlePrince(stats.totalTokens)

  return (
    <div className="usage-overlay" onMouseDown={onClose}>
      <div className="usage-modal" onMouseDown={(event) => event.stopPropagation()}>
        <div className="usage-header">
          <div className="usage-tabs">
            <button
              type="button"
              className={`usage-tab ${tab === 'overview' ? 'usage-tab-active' : ''}`}
              onClick={() => setTab('overview')}
            >
              Visão Geral
            </button>
            <button
              type="button"
              className={`usage-tab ${tab === 'models' ? 'usage-tab-active' : ''}`}
              onClick={() => setTab('models')}
            >
              Modelos
            </button>
          </div>

          <div className="usage-header-right">
            <div className="usage-period">
              {PERIODS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`usage-period-btn ${period === item.id ? 'usage-period-btn-active' : ''}`}
                  onClick={() => setPeriod(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <button type="button" className="usage-close" onClick={onClose} aria-label="Fechar">
              <X size={16} strokeWidth={1.75} />
            </button>
          </div>
        </div>

        {tab === 'overview' ? (
          <>
            <div className="usage-grid">
              <div className="usage-tile">
                <span className="usage-tile-label">Sessões</span>
                <span className="usage-tile-value">{formatCount(stats.sessions)}</span>
              </div>
              <div className="usage-tile">
                <span className="usage-tile-label">Mensagens</span>
                <span className="usage-tile-value">{formatCount(stats.messages)}</span>
              </div>
              <div className="usage-tile">
                <span className="usage-tile-label">Total de tokens</span>
                <span className="usage-tile-value">{formatTokenCount(stats.totalTokens)}</span>
              </div>
              <div className="usage-tile">
                <span className="usage-tile-label">Dias ativos</span>
                <span className="usage-tile-value">{formatCount(stats.activeDays)}</span>
              </div>
              <div className="usage-tile">
                <span className="usage-tile-label">Sequência atual</span>
                <span className="usage-tile-value">{stats.currentStreak}d</span>
              </div>
              <div className="usage-tile">
                <span className="usage-tile-label">Maior sequência</span>
                <span className="usage-tile-value">{stats.longestStreak}d</span>
              </div>
              <div className="usage-tile">
                <span className="usage-tile-label">Horário de pico</span>
                <span className="usage-tile-value">
                  {stats.peakHour !== null ? `${stats.peakHour}h` : '—'}
                </span>
              </div>
              <div className="usage-tile">
                <span className="usage-tile-label">Modelo favorito</span>
                <span
                  className="usage-tile-value usage-tile-value-small"
                  title={stats.favoriteModel ?? undefined}
                >
                  {stats.favoriteModel ?? '—'}
                </span>
              </div>
            </div>

            {rank && rank.totalUsers > 0 && (
              <div className="usage-rank-card">
                <Trophy size={16} strokeWidth={1.75} className="usage-rank-icon" />
                <div className="usage-rank-info">
                  <span className="usage-rank-title">
                    Top {Math.max(1, Math.round((rank.rank / rank.totalUsers) * 100))}% da
                    plataforma
                  </span>
                  <span className="usage-rank-subtitle">
                    Posição {formatCount(rank.rank)} de {formatCount(rank.totalUsers)} usuários por
                    tokens totais — você usou mais que {rank.percentile}% deles.
                  </span>
                </div>
              </div>
            )}

            <div className="usage-heatmap">
              <div className="usage-heatmap-weekdays">
                {WEEKDAY_LABELS.map((label, index) => (
                  <span key={index}>{label}</span>
                ))}
              </div>
              <div className="usage-heatmap-grid">
                {heatmapWeeks.map((week, weekIndex) => (
                  <div key={weekIndex} className="usage-heatmap-column">
                    {week.map((day) => (
                      <span
                        key={day.date}
                        className={`usage-heatmap-cell usage-heatmap-level-${heatmapLevel(day.count)}`}
                        title={`${day.date}: ${day.count} mensagens`}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {littlePrinceMultiplier > 0 && (
              <p className="usage-footer">
                Você usou ~{littlePrinceMultiplier}× mais tokens do que O Pequeno Príncipe.
              </p>
            )}
          </>
        ) : (
          <div className="usage-models-list">
            {stats.modelBreakdown.length === 0 ? (
              <p className="usage-models-empty">Nenhum uso registrado ainda.</p>
            ) : (
              stats.modelBreakdown.map((model) => {
                const maxMessages = stats.modelBreakdown[0].messages
                const width = Math.max(4, (model.messages / maxMessages) * 100)
                return (
                  <div key={model.model} className="usage-model-row">
                    <div className="usage-model-row-header">
                      <span className="usage-model-name">{model.model}</span>
                      <span className="usage-model-meta">
                        {formatCount(model.messages)} msgs · {formatTokenCount(model.tokens)} tokens
                      </span>
                    </div>
                    <div className="usage-model-bar-track">
                      <div className="usage-model-bar-fill" style={{ width: `${width}%` }} />
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>
    </div>
  )
}
