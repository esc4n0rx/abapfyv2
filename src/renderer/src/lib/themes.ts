export interface ThemeDefinition {
  id: string
  name: string
  description: string
  swatch: [accent: string, canvas: string, surface: string]
  vars: Record<string, string>
}

/**
 * Todos os temas compartilham a mesma escada neutra de cinzas
 * (canvas #181818 → surface-1..4, sem tingimento de cor) e a mesma
 * tipografia/raios/espaçamentos. Cada tema troca apenas a cor de
 * acento (primary/hover/focus) — nunca a hierarquia de superfícies.
 */
const NEUTRAL_SURFACES = {
  '--color-canvas': '#181818',
  '--color-surface-1': '#202020',
  '--color-surface-2': '#242424',
  '--color-surface-3': '#2b2b2b',
  '--color-surface-4': '#313131'
}

const NEUTRAL_SWATCH_CANVAS = '#181818'
const NEUTRAL_SWATCH_SURFACE = '#2b2b2b'

export const THEMES: ThemeDefinition[] = [
  {
    id: 'linear-dark',
    name: 'Abapfy Dark',
    description: 'Cinza grafite neutro com acento lavanda — o tema padrão do Abapfy.',
    swatch: ['#5e6ad2', NEUTRAL_SWATCH_CANVAS, NEUTRAL_SWATCH_SURFACE],
    vars: {
      '--color-primary': '#5e6ad2',
      '--color-primary-hover': '#828fff',
      '--color-primary-focus': '#5e69d1',
      ...NEUTRAL_SURFACES
    }
  },
  {
    id: 'emerald-dark',
    name: 'Emerald Dark',
    description: 'Verde esmeralda sobre a mesma base neutra — foco e clareza.',
    swatch: ['#27a644', NEUTRAL_SWATCH_CANVAS, NEUTRAL_SWATCH_SURFACE],
    vars: {
      '--color-primary': '#27a644',
      '--color-primary-hover': '#4fce6b',
      '--color-primary-focus': '#239b3f',
      ...NEUTRAL_SURFACES
    }
  },
  {
    id: 'amber-dark',
    name: 'Amber Dark',
    description: 'Âmbar quente sobre a mesma base neutra — energia sem perder o contraste.',
    swatch: ['#d98c2b', NEUTRAL_SWATCH_CANVAS, NEUTRAL_SWATCH_SURFACE],
    vars: {
      '--color-primary': '#d98c2b',
      '--color-primary-hover': '#f0a94f',
      '--color-primary-focus': '#c67e22',
      ...NEUTRAL_SURFACES
    }
  },
  {
    id: 'crimson-dark',
    name: 'Crimson Dark',
    description: 'Carmesim sobre a mesma base neutra — acento marcante e assertivo.',
    swatch: ['#d0455a', NEUTRAL_SWATCH_CANVAS, NEUTRAL_SWATCH_SURFACE],
    vars: {
      '--color-primary': '#d0455a',
      '--color-primary-hover': '#e97185',
      '--color-primary-focus': '#bd3d51',
      ...NEUTRAL_SURFACES
    }
  }
]

export const DEFAULT_THEME_ID = THEMES[0].id

export function getTheme(id: string | null | undefined): ThemeDefinition {
  return THEMES.find((theme) => theme.id === id) ?? THEMES[0]
}

export function applyTheme(id: string | null | undefined): void {
  const theme = getTheme(id)
  const root = document.documentElement
  root.dataset.theme = theme.id
  Object.entries(theme.vars).forEach(([key, value]) => {
    root.style.setProperty(key, value)
  })
}
