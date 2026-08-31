import { loadEnv } from 'vite'

const env = loadEnv('production', process.cwd(), '')
const requiredVariables = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY']
const missingVariables = requiredVariables.filter((name) => !env[name]?.trim())

if (missingVariables.length > 0) {
  console.error(
    `[Abapfy] Build interrompida: variáveis obrigatórias ausentes: ${missingVariables.join(', ')}`
  )
  process.exit(1)
}

console.log('[Abapfy] Configuração obrigatória do renderer validada.')
