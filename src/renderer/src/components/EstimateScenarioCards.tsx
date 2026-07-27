import { Zap, Shield, ShieldCheck } from 'lucide-react'
import type { EstimateData, EstimateScenario } from '@renderer/lib/estimateCards'
import './EstimateScenarioCards.css'

const PHASE_LABELS: { key: keyof EstimateScenario['distribuicao']; label: string }[] = [
  { key: 'analise_ef', label: 'Análise EF' },
  { key: 'espec', label: 'Especificação' },
  { key: 'codific', label: 'Codificação' },
  { key: 'testes', label: 'Testes' },
  { key: 'outros', label: 'Outros' }
]

const SCENARIOS: {
  key: 'agressiva' | 'segura' | 'tranquila'
  label: string
  subtitle: string
  icon: typeof Zap
  tone: 'danger' | 'primary' | 'success'
}[] = [
  { key: 'agressiva', label: 'Agressiva', subtitle: 'Poucas horas · maior risco', icon: Zap, tone: 'danger' },
  { key: 'segura', label: 'Segura', subtitle: 'Equilíbrio · recomendada', icon: Shield, tone: 'primary' },
  { key: 'tranquila', label: 'Tranquila', subtitle: 'Mais horas · menor risco', icon: ShieldCheck, tone: 'success' }
]

function formatHours(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

function ScenarioCard({
  label,
  subtitle,
  icon: Icon,
  tone,
  scenario
}: {
  label: string
  subtitle: string
  icon: typeof Zap
  tone: 'danger' | 'primary' | 'success'
  scenario: EstimateScenario
}): JSX.Element {
  const total = scenario.totalHoras || 1
  const phases = PHASE_LABELS.map(({ key, label: phaseLabel }) => ({
    label: phaseLabel,
    hours: scenario.distribuicao[key] ?? 0
  })).filter((phase) => phase.hours > 0)

  return (
    <div className={`estimate-card estimate-card-${tone}`}>
      <header className="estimate-card-header">
        <div className="estimate-card-title">
          <Icon size={16} strokeWidth={2} />
          <div>
            <span className="estimate-card-label">{label}</span>
            <span className="estimate-card-subtitle">{subtitle}</span>
          </div>
        </div>
        <div className="estimate-card-total">
          <span className="estimate-card-total-value">{formatHours(scenario.totalHoras)}</span>
          <span className="estimate-card-total-unit">horas</span>
        </div>
      </header>

      <div className="estimate-card-body">
        {phases.length > 0 && (
          <section className="estimate-card-section">
            <h4>Distribuição</h4>
            <div className="estimate-distribution">
              {phases.map((phase) => {
                const pct = Math.round((phase.hours / total) * 100)
                return (
                  <div className="estimate-distribution-row" key={phase.label}>
                    <div className="estimate-distribution-label-row">
                      <span className="estimate-distribution-label">{phase.label}</span>
                      <span className="estimate-distribution-value">
                        {formatHours(phase.hours)}h ({pct}%)
                      </span>
                    </div>
                    <div className="estimate-distribution-bar">
                      <div
                        className="estimate-distribution-bar-fill"
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {scenario.premissas.length > 0 && (
          <section className="estimate-card-section">
            <h4>Premissas</h4>
            <ul className="estimate-list estimate-list-premissas">
              {scenario.premissas.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </section>
        )}

        {scenario.riscos.length > 0 && (
          <section className="estimate-card-section">
            <h4 className="estimate-card-section-danger">Riscos</h4>
            <ul className="estimate-list estimate-list-riscos">
              {scenario.riscos.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  )
}

export function EstimateScenarioCards({ data }: { data: EstimateData }): JSX.Element {
  return (
    <div className="estimate-scenarios">
      <header className="estimate-scenarios-header">
        <span className="estimate-scenarios-project">{data.projeto}</span>
        <span className="estimate-scenarios-meta">
          {data.versaoSap} · Complexidade geral: {data.complexidadeGeral}
        </span>
      </header>

      <div className="estimate-scenarios-grid">
        {SCENARIOS.map(({ key, label, subtitle, icon, tone }) => (
          <ScenarioCard
            key={key}
            label={label}
            subtitle={subtitle}
            icon={icon}
            tone={tone}
            scenario={data.estimativas[key]}
          />
        ))}
      </div>

      {data.notasGerais && <p className="estimate-scenarios-notes">{data.notasGerais}</p>}
    </div>
  )
}
