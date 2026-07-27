import { useEffect, useState } from 'react'
import './TitleBar.css'

function MinimizeIcon(): JSX.Element {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M2 6H10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  )
}

function MaximizeIcon(): JSX.Element {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <rect x="2.5" y="2.5" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.1" />
    </svg>
  )
}

function RestoreIcon(): JSX.Element {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <rect x="3.5" y="1.5" width="6" height="6" rx="1.3" stroke="currentColor" strokeWidth="1.1" />
      <path
        d="M2.5 4H4v6a1.5 1.5 0 0 1-1.5-1.5V4Z"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CloseIcon(): JSX.Element {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path
        d="M2.5 2.5L9.5 9.5M9.5 2.5L2.5 9.5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  )
}

interface TitleBarProps {
  title?: string
}

export function TitleBar({ title = 'Abapfy' }: TitleBarProps): JSX.Element {
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    window.api.windowControls.isMaximized().then(setIsMaximized)
    const unsubscribe = window.api.windowControls.onMaximizedChange(setIsMaximized)
    return unsubscribe
  }, [])

  return (
    <div className="titlebar">
      <div className="titlebar-drag">
        <span className="titlebar-brand">{title}</span>
      </div>
      <div className="titlebar-controls">
        <button
          type="button"
          className="titlebar-btn"
          aria-label="Minimizar"
          onClick={() => window.api.windowControls.minimize()}
        >
          <MinimizeIcon />
        </button>
        <button
          type="button"
          className="titlebar-btn"
          aria-label={isMaximized ? 'Restaurar' : 'Maximizar'}
          onClick={() => window.api.windowControls.maximizeToggle()}
        >
          {isMaximized ? <RestoreIcon /> : <MaximizeIcon />}
        </button>
        <button
          type="button"
          className="titlebar-btn titlebar-btn-close"
          aria-label="Fechar"
          onClick={() => window.api.windowControls.close()}
        >
          <CloseIcon />
        </button>
      </div>
    </div>
  )
}
