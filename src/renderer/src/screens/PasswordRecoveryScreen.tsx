import { FormEvent, useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { GeoSystemBrand } from '@renderer/components/GeoSystemBrand'
import { recoverySupabase } from '@renderer/lib/supabaseClient'
import './AuthScreen.css'
import './PasswordRecoveryScreen.css'

type Step = 'email' | 'code' | 'password' | 'done'

const RESEND_WAIT_SECONDS = 60

export function PasswordRecoveryScreen(): JSX.Element {
  const navigate = useNavigate()
  const location = useLocation()
  const initialEmail = (location.state as { email?: unknown } | null)?.email
  const [email, setEmail] = useState(typeof initialEmail === 'string' ? initialEmail : '')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [step, setStep] = useState<Step>('email')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resendAvailableAt, setResendAvailableAt] = useState(0)
  const [secondsToResend, setSecondsToResend] = useState(0)

  useEffect(() => {
    if (step !== 'code') return
    const update = (): void => {
      setSecondsToResend(Math.max(0, Math.ceil((resendAvailableAt - Date.now()) / 1000)))
    }
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [resendAvailableAt, step])

  async function sendCode(event?: FormEvent): Promise<void> {
    event?.preventDefault()
    if (busy || (step === 'code' && secondsToResend > 0)) return
    setBusy(true)
    setError(null)
    try {
      const { error: requestError } = await recoverySupabase.auth.resetPasswordForEmail(email.trim())
      if (requestError) {
        setError('Não foi possível solicitar o código agora. Tente novamente mais tarde.')
        return
      }
      setStep('code')
      setResendAvailableAt(Date.now() + RESEND_WAIT_SECONDS * 1000)
    } catch {
      setError('Não foi possível solicitar o código agora. Tente novamente mais tarde.')
    } finally {
      setBusy(false)
    }
  }

  async function verifyCode(event: FormEvent): Promise<void> {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      const { data, error: verifyError } = await recoverySupabase.auth.verifyOtp({
        email: email.trim(),
        token: code.trim(),
        type: 'recovery'
      })
      if (verifyError || !data.session) {
        setError('Código inválido ou expirado. Confira o e-mail e tente novamente.')
        return
      }
      setStep('password')
    } catch {
      setError('Não foi possível verificar o código agora. Tente novamente.')
    } finally {
      setBusy(false)
    }
  }

  async function changePassword(event: FormEvent): Promise<void> {
    event.preventDefault()
    if (busy) return
    if (password !== confirmation) {
      setError('As senhas não coincidem.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const { error: updateError } = await recoverySupabase.auth.updateUser({ password })
      if (updateError) {
        setError(updateError.message)
        return
      }
      setPassword('')
      setConfirmation('')
      setCode('')
      setStep('done')
      void recoverySupabase.auth.signOut({ scope: 'local' })
    } catch {
      setError('Não foi possível alterar a senha agora. Tente novamente.')
    } finally {
      setBusy(false)
    }
  }

  function returnToLogin(): void {
    if (step === 'password') void recoverySupabase.auth.signOut({ scope: 'local' })
    navigate('/auth', { replace: true })
  }

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-header">
          <span className="auth-eyebrow recovery-brand"><GeoSystemBrand /> - Abapfy</span>
          <h1 className="auth-title">
            {step === 'email' && 'Redefinir senha'}
            {step === 'code' && 'Confira seu e-mail'}
            {step === 'password' && 'Crie uma nova senha'}
            {step === 'done' && 'Senha atualizada'}
          </h1>
          <p className="auth-subtitle">
            {step === 'email' && 'Informe o e-mail da sua conta para receber um código de verificação.'}
            {step === 'code' && 'Se o endereço estiver cadastrado, você receberá um código de seis dígitos.'}
            {step === 'password' && 'O código foi confirmado. Defina a senha que usará para entrar.'}
            {step === 'done' && 'Sua senha foi alterada. Entre com a nova senha.'}
          </p>
        </div>

        {step === 'email' && (
          <form className="auth-form" onSubmit={sendCode}>
            <div className="auth-field">
              <label htmlFor="recovery-email">E-mail</label>
              <input
                id="recovery-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>
            {error && <p className="auth-error" role="alert">{error}</p>}
            <button type="submit" className="auth-submit" disabled={busy}>
              {busy ? 'Aguarde…' : 'Enviar código'}
            </button>
          </form>
        )}

        {step === 'code' && (
          <form className="auth-form" onSubmit={verifyCode}>
            <p className="recovery-email">{email.trim()}</p>
            <div className="auth-field">
              <label htmlFor="recovery-code">Código de verificação</label>
              <input
                id="recovery-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
                required
              />
            </div>
            {error && <p className="auth-error" role="alert">{error}</p>}
            <button type="submit" className="auth-submit" disabled={busy}>
              {busy ? 'Aguarde…' : 'Confirmar código'}
            </button>
            <button
              type="button"
              className="auth-text-action"
              disabled={busy || secondsToResend > 0}
              onClick={() => void sendCode()}
            >
              {secondsToResend > 0 ? `Reenviar em ${secondsToResend}s` : 'Reenviar código'}
            </button>
            <button
              type="button"
              className="auth-text-action"
              disabled={busy}
              onClick={() => { setStep('email'); setCode(''); setError(null) }}
            >
              Corrigir e-mail
            </button>
          </form>
        )}

        {step === 'password' && (
          <form className="auth-form" onSubmit={changePassword}>
            <div className="auth-field">
              <label htmlFor="recovery-password">Nova senha</label>
              <input
                id="recovery-password"
                type="password"
                autoComplete="new-password"
                minLength={6}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>
            <div className="auth-field">
              <label htmlFor="recovery-confirmation">Confirmar nova senha</label>
              <input
                id="recovery-confirmation"
                type="password"
                autoComplete="new-password"
                minLength={6}
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                required
              />
            </div>
            {error && <p className="auth-error" role="alert">{error}</p>}
            <button type="submit" className="auth-submit" disabled={busy}>
              {busy ? 'Aguarde…' : 'Salvar nova senha'}
            </button>
          </form>
        )}

        {step === 'done' && (
          <button type="button" className="auth-submit" onClick={returnToLogin}>
            Voltar para entrar
          </button>
        )}

        {step !== 'done' && (
          <button type="button" className="auth-text-action" disabled={busy} onClick={returnToLogin}>
            Voltar para entrar
          </button>
        )}
      </div>
    </div>
  )
}
