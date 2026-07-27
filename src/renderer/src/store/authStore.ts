import { create } from 'zustand'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@renderer/lib/supabaseClient'

export interface Profile {
  id: string
  nome: string
  cargo: string | null
  empresa: string | null
}

export interface SignUpPayload {
  nome: string
  email: string
  senha: string
  cargo: string
  empresa: string
}

export interface SignInPayload {
  email: string
  senha: string
}

interface AuthState {
  status: 'idle' | 'loading' | 'authenticated' | 'unauthenticated'
  user: User | null
  session: Session | null
  profile: Profile | null
  error: string | null
  init: () => Promise<void>
  signIn: (payload: SignInPayload) => Promise<void>
  signUp: (payload: SignUpPayload) => Promise<void>
  signOut: () => Promise<void>
  clearError: () => void
}

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
  if (error) return null
  return data as Profile
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'idle',
  user: null,
  session: null,
  profile: null,
  error: null,

  init: async () => {
    set({ status: 'loading' })
    const {
      data: { session }
    } = await supabase.auth.getSession()

    if (session?.user) {
      const profile = await fetchProfile(session.user.id)
      set({ status: 'authenticated', session, user: session.user, profile })
    } else {
      set({ status: 'unauthenticated', session: null, user: null, profile: null })
    }

    supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      if (nextSession?.user) {
        const profile = await fetchProfile(nextSession.user.id)
        set({ status: 'authenticated', session: nextSession, user: nextSession.user, profile })
      } else {
        set({ status: 'unauthenticated', session: null, user: null, profile: null })
      }
    })
  },

  signIn: async ({ email, senha }) => {
    set({ status: 'loading', error: null })
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
    if (error) {
      set({ status: 'unauthenticated', error: error.message })
    }
  },

  signUp: async ({ nome, email, senha, cargo, empresa }) => {
    set({ status: 'loading', error: null })
    const { data, error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: {
        data: { nome, cargo, empresa }
      }
    })

    if (error) {
      set({ status: 'unauthenticated', error: error.message })
      return
    }

    if (data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        nome,
        cargo,
        empresa
      })
    }
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ status: 'unauthenticated', user: null, session: null, profile: null })
  },

  clearError: () => set({ error: null })
}))
