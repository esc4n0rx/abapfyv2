export function formatTokenCount(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—'
  if (value < 1000) return String(value)
  if (value < 1_000_000) return `${(value / 1000).toFixed(1)}k`
  return `${(value / 1_000_000).toFixed(1)}M`
}

export function formatCount(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—'
  return value.toLocaleString('pt-BR')
}

export function formatDurationMs(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return '—'
  if (ms < 1000) return `${Math.round(ms)}ms`
  return `${(ms / 1000).toFixed(1)}s`
}
