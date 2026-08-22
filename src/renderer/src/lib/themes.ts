export interface ThemeDefinition {
  id: string
  name: string
  description: string
  mode: 'light' | 'dark'
  swatch: [accent: string, canvas: string, surface: string]
  vars: Record<string, string>
}

const horizonRadii = {
  '--radius-xs': '4px',
  '--radius-sm': '6px',
  '--radius-md': '8px',
  '--radius-lg': '12px',
  '--radius-xl': '16px',
  '--radius-xxl': '20px'
}

const morningHorizon = {
  '--color-primary': '#0070f2',
  '--color-primary-hover': '#0057d2',
  '--color-primary-focus': '#0057d2',
  '--color-on-primary': '#ffffff',
  '--color-ink': '#1d2d3e',
  '--color-ink-muted': '#475e75',
  '--color-ink-subtle': '#5b738b',
  '--color-ink-tertiary': '#758ca4',
  '--color-canvas': '#f5f6f7',
  '--color-surface-1': '#ffffff',
  '--color-surface-2': '#f7f8fa',
  '--color-surface-3': '#eef1f4',
  '--color-surface-4': '#e5eaf0',
  '--color-hairline': '#d9dfe6',
  '--color-hairline-strong': '#bcc7d2',
  '--color-hairline-tertiary': '#899bad',
  '--color-inverse-canvas': '#1d2d3e',
  '--color-inverse-surface-1': '#223548',
  '--color-inverse-surface-2': '#2f465c',
  '--color-inverse-ink': '#ffffff',
  '--color-semantic-success': '#188918',
  '--color-semantic-danger': '#aa0808',
  '--color-semantic-warning': '#e76500',
  '--color-semantic-info': '#0070f2',
  '--color-semantic-overlay': 'rgba(34, 53, 72, 0.42)',
  '--shadow-card': '0 0.125rem 0.5rem rgba(34, 53, 72, 0.12)',
  ...horizonRadii
}

const eveningHorizon = {
  '--color-primary': '#4db1ff',
  '--color-primary-hover': '#89d1ff',
  '--color-primary-focus': '#4db1ff',
  '--color-on-primary': '#00144a',
  '--color-ink': '#f5f6f7',
  '--color-ink-muted': '#d5dadd',
  '--color-ink-subtle': '#a9b4be',
  '--color-ink-tertiary': '#8396a8',
  '--color-canvas': '#12171c',
  '--color-surface-1': '#1c2228',
  '--color-surface-2': '#222a31',
  '--color-surface-3': '#29323a',
  '--color-surface-4': '#34404b',
  '--color-hairline': '#364554',
  '--color-hairline-strong': '#4f6273',
  '--color-hairline-tertiary': '#6f879b',
  '--color-inverse-canvas': '#ffffff',
  '--color-inverse-surface-1': '#f5f6f7',
  '--color-inverse-surface-2': '#eaecee',
  '--color-inverse-ink': '#1d2d3e',
  '--color-semantic-success': '#5dc122',
  '--color-semantic-danger': '#ff5c77',
  '--color-semantic-warning': '#ffb300',
  '--color-semantic-info': '#4db1ff',
  '--color-semantic-overlay': 'rgba(0, 0, 0, 0.62)',
  '--shadow-card': '0 0.125rem 0.5rem rgba(0, 0, 0, 0.35)',
  ...horizonRadii
}

export const THEMES: ThemeDefinition[] = [
  {
    id: 'sap-horizon-light',
    name: 'SAP Morning Horizon',
    description: 'Tema claro padrão, leve e produtivo, inspirado no SAP Fiori Horizon.',
    mode: 'light',
    swatch: ['#0070f2', '#f5f6f7', '#ffffff'],
    vars: morningHorizon
  },
  {
    id: 'sap-horizon-dark',
    name: 'SAP Evening Horizon',
    description: 'Horizon escuro para trabalho prolongado e ambientes com pouca luz.',
    mode: 'dark',
    swatch: ['#4db1ff', '#12171c', '#222a31'],
    vars: eveningHorizon
  },
  {
    id: 'sap-quartz-light',
    name: 'SAP Quartz Light',
    description: 'Visual SAP clássico, claro e com superfícies mais compactas.',
    mode: 'light',
    swatch: ['#0a6ed1', '#f7f7f7', '#ffffff'],
    vars: {
      ...morningHorizon,
      '--color-primary': '#0a6ed1',
      '--color-primary-hover': '#0854a0',
      '--color-primary-focus': '#0854a0',
      '--color-canvas': '#f7f7f7',
      '--color-surface-3': '#ededed',
      '--radius-lg': '8px',
      '--radius-xl': '10px'
    }
  },
  {
    id: 'sap-quartz-dark',
    name: 'SAP Quartz Dark',
    description: 'Base grafite SAP com o azul Quartz tradicional.',
    mode: 'dark',
    swatch: ['#91c8f6', '#1c2228', '#29313a'],
    vars: {
      ...eveningHorizon,
      '--color-primary': '#91c8f6',
      '--color-primary-hover': '#d1e8ff',
      '--color-primary-focus': '#91c8f6',
      '--color-canvas': '#1c2228',
      '--color-surface-1': '#232a31',
      '--color-surface-2': '#29313a',
      '--radius-lg': '8px',
      '--radius-xl': '10px'
    }
  },
  {
    id: 'sap-horizon-hcw',
    name: 'Horizon Alto Contraste Claro',
    description: 'Contraste reforçado para maior legibilidade.',
    mode: 'light',
    swatch: ['#0040b0', '#ffffff', '#ffffff'],
    vars: {
      ...morningHorizon,
      '--color-primary': '#0040b0',
      '--color-primary-hover': '#002e7d',
      '--color-ink': '#000000',
      '--color-ink-muted': '#1a1a1a',
      '--color-ink-subtle': '#333333',
      '--color-hairline': '#595959',
      '--color-hairline-strong': '#000000',
      '--shadow-card': 'none'
    }
  },
  {
    id: 'sap-horizon-hcb',
    name: 'Horizon Alto Contraste Escuro',
    description: 'Preto profundo e contraste elevado para acessibilidade.',
    mode: 'dark',
    swatch: ['#7fc6ff', '#000000', '#111111'],
    vars: {
      ...eveningHorizon,
      '--color-canvas': '#000000',
      '--color-surface-1': '#080808',
      '--color-surface-2': '#111111',
      '--color-surface-3': '#1a1a1a',
      '--color-ink': '#ffffff',
      '--color-ink-muted': '#ffffff',
      '--color-hairline': '#b3b3b3',
      '--color-hairline-strong': '#ffffff',
      '--shadow-card': 'none'
    }
  }
]

export const DEFAULT_THEME_ID = 'sap-horizon-light'

export function getTheme(id: string | null | undefined): ThemeDefinition {
  return THEMES.find((theme) => theme.id === id) ?? THEMES[0]
}

export function applyTheme(id: string | null | undefined): void {
  const theme = getTheme(id)
  const root = document.documentElement
  root.dataset.theme = theme.id
  root.style.colorScheme = theme.mode
  Object.entries(theme.vars).forEach(([key, value]) => root.style.setProperty(key, value))
}
