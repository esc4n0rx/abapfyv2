import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[Abapfy] Variáveis VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY ausentes. Copie .env.example para .env e preencha com as credenciais do projeto Supabase.'
  )
}

export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false
  }
})

// A recuperação por código cria uma sessão curta que não deve autenticar o app
// antes de o usuário concluir a troca de senha.
export const recoverySupabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '', {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
    storageKey: 'abapfy-password-recovery'
  }
})
