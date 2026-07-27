import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@renderer/store/authStore'
import './SplashScreen.css'

const WORD = 'Abapfy'
const LETTERS = WORD.split('')

const TYPE_INTERVAL_MS = 130
const PAUSE_AFTER_TYPE_MS = 550
const ERASE_FADE_MS = 220
const ERASE_INTERVAL_MS = 110
const PAUSE_ON_MARK_MS = 900

type Phase = 'typing' | 'erasing' | 'mark'

export function SplashScreen(): JSX.Element {
  const navigate = useNavigate()
  const [visibleCount, setVisibleCount] = useState(0)
  const [erasingLast, setErasingLast] = useState(false)
  const [phase, setPhase] = useState<Phase>('typing')

  useEffect(() => {
    const timeouts: ReturnType<typeof setTimeout>[] = []
    const schedule = (fn: () => void, delay: number): void => {
      timeouts.push(setTimeout(fn, delay))
    }

    let t = 0

    LETTERS.forEach((_, index) => {
      schedule(() => setVisibleCount(index + 1), t)
      t += TYPE_INTERVAL_MS
    })

    t += PAUSE_AFTER_TYPE_MS
    schedule(() => setPhase('erasing'), t)

    for (let count = LETTERS.length; count > 1; count -= 1) {
      schedule(() => setErasingLast(true), t)
      t += ERASE_FADE_MS
      schedule(() => {
        setVisibleCount(count - 1)
        setErasingLast(false)
      }, t)
      t += ERASE_INTERVAL_MS
    }

    schedule(() => setPhase('mark'), t)
    t += PAUSE_ON_MARK_MS

    schedule(() => {
      const status = useAuthStore.getState().status
      navigate(status === 'authenticated' ? '/dashboard' : '/auth', { replace: true })
    }, t)

    return () => timeouts.forEach(clearTimeout)
  }, [navigate])

  return (
    <div className="splash">
      <div className={`splash-mark ${phase === 'mark' ? 'splash-mark-settled' : ''}`}>
        {LETTERS.slice(0, visibleCount).map((letter, index) => {
          const isLast = index === visibleCount - 1
          const isErasing = phase === 'erasing' && isLast && erasingLast
          return (
            <span
              key={index}
              className={`splash-letter ${isErasing ? 'splash-letter-erasing' : ''}`}
            >
              {letter}
            </span>
          )
        })}
        {phase === 'typing' && <span className="splash-cursor" aria-hidden="true" />}
      </div>
      <span className={`splash-tagline ${phase === 'mark' ? 'splash-tagline-hide' : ''}`}>
        ferramentas para o ecossistema SAP/ABAP
      </span>
    </div>
  )
}
