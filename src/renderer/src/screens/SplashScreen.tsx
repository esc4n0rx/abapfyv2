import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@renderer/store/authStore'
import './SplashScreen.css'

// Tempo mínimo que a marca fica na tela — sem isso, uma sessão já em cache
// resolve em ~50ms e a splash pisca (unprofessional). O teto de segurança
// evita ficar preso aqui pra sempre se getSession() nunca resolver (rede
// caída, etc.) — nesse caso segue pro login mesmo sem confirmação.
const MIN_DISPLAY_MS = 650
const SAFETY_TIMEOUT_MS = 6000

function statusLabel(status: string): string {
  if (status === 'authenticated') return 'Sessão encontrada. Entrando…'
  if (status === 'unauthenticated') return 'Pronto.'
  return 'Verificando sessão…'
}

export function SplashScreen(): JSX.Element {
  const navigate = useNavigate()
  const status = useAuthStore((state) => state.status)
  const resolved = status === 'authenticated' || status === 'unauthenticated'

  const [settled, setSettled] = useState(false)

  // A navegação de fato é orientada pelo estado real de auth (com piso e
  // teto), não por uma timeline de animação decorada — a splash antiga
  // rodava um timer fixo de ~2.5s dissociado do `init()` de verdade.
  useEffect(() => {
    const mountedAt = Date.now()
    let navigated = false

    const go = (): void => {
      if (navigated) return
      navigated = true
      setSettled(true)
      const finalStatus = useAuthStore.getState().status
      setTimeout(
        () => navigate(finalStatus === 'authenticated' ? '/dashboard' : '/auth', { replace: true }),
        260
      )
    }

    const tryNavigate = (): void => {
      const currentStatus = useAuthStore.getState().status
      const currentResolved = currentStatus === 'authenticated' || currentStatus === 'unauthenticated'
      if (currentResolved && Date.now() - mountedAt >= MIN_DISPLAY_MS) go()
    }

    const floorTimer = setTimeout(tryNavigate, MIN_DISPLAY_MS)
    const safetyTimer = setTimeout(go, SAFETY_TIMEOUT_MS)
    const unsubscribe = useAuthStore.subscribe(tryNavigate)

    return () => {
      clearTimeout(floorTimer)
      clearTimeout(safetyTimer)
      unsubscribe()
    }
  }, [navigate])

  return (
    <div className="splash">
      <span className="splash-mark">Abapfy</span>
      <span className="splash-tagline">ferramentas para o ecossistema SAP/ABAP</span>
      <div className={`splash-status ${settled ? 'splash-status-settled' : ''}`}>
        <span className="splash-progress-track">
          <span className={`splash-progress-fill ${resolved ? 'splash-progress-fill-done' : ''}`} />
        </span>
        <span className="splash-status-label">{statusLabel(status)}</span>
      </div>
    </div>
  )
}
