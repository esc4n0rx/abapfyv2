import { FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@renderer/store/authStore'
import './AuthScreen.css'

type Mode = 'login' | 'register'

interface FormState {
  nome: string
  email: string
  senha: string
  cargo: string
  empresa: string
}

const INITIAL_FORM: FormState = {
  nome: '',
  email: '',
  senha: '',
  cargo: '',
  empresa: ''
}

export function AuthScreen(): JSX.Element {
  const navigate = useNavigate()
  const [mode, setMode] = useState<Mode>('login')
  const [form, setForm] = useState<FormState>(INITIAL_FORM)

  const { signIn, signUp, status, error, clearError } = useAuthStore((state) => ({
    signIn: state.signIn,
    signUp: state.signUp,
    status: state.status,
    error: state.error,
    clearError: state.clearError
  }))

  const isLoading = status === 'loading'

  function updateField<K extends keyof FormState>(field: K, value: FormState[K]): void {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function switchMode(nextMode: Mode): void {
    setMode(nextMode)
    clearError()
  }

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault()
    clearError()

    if (mode === 'login') {
      await signIn({ email: form.email, senha: form.senha })
      navigate('/dashboard')
      return
    }

    await signUp(form)
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-header">
          <span className="auth-eyebrow">Abapfy</span>
          <h1 className="auth-title">
            {mode === 'login' ? 'Bem-vindo de volta' : 'Crie sua conta'}
          </h1>
          <p className="auth-subtitle">
            {mode === 'login'
              ? 'Entre para acessar suas ferramentas SAP/ABAP.'
              : 'Leva menos de um minuto para começar.'}
          </p>
        </div>

        <div className="auth-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'login'}
            className={`auth-tab ${mode === 'login' ? 'auth-tab-selected' : ''}`}
            onClick={() => switchMode('login')}
          >
            Entrar
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'register'}
            className={`auth-tab ${mode === 'register' ? 'auth-tab-selected' : ''}`}
            onClick={() => switchMode('register')}
          >
            Cadastrar
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div className="auth-field">
              <label htmlFor="nome">Nome</label>
              <input
                id="nome"
                type="text"
                autoComplete="name"
                value={form.nome}
                onChange={(event) => updateField('nome', event.target.value)}
                required
              />
            </div>
          )}

          <div className="auth-field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(event) => updateField('email', event.target.value)}
              required
            />
          </div>

          <div className="auth-field">
            <label htmlFor="senha">Senha</label>
            <input
              id="senha"
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              value={form.senha}
              onChange={(event) => updateField('senha', event.target.value)}
              required
              minLength={6}
            />
          </div>

          {mode === 'register' && (
            <div className="auth-row">
              <div className="auth-field">
                <label htmlFor="cargo">Cargo</label>
                <input
                  id="cargo"
                  type="text"
                  value={form.cargo}
                  onChange={(event) => updateField('cargo', event.target.value)}
                  required
                />
              </div>
              <div className="auth-field">
                <label htmlFor="empresa">Empresa</label>
                <input
                  id="empresa"
                  type="text"
                  value={form.empresa}
                  onChange={(event) => updateField('empresa', event.target.value)}
                  required
                />
              </div>
            </div>
          )}

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" className="auth-submit" disabled={isLoading}>
            {isLoading ? 'Aguarde…' : mode === 'login' ? 'Entrar' : 'Criar conta'}
          </button>
        </form>
      </div>
    </div>
  )
}
