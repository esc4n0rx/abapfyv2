import { FormEvent, useState } from 'react'
import { ArrowRight, HelpCircle } from 'lucide-react'
import './ClarifyQuestion.css'

interface ClarifyQuestionProps {
  question: string
  options: string[]
  onAnswer?: (text: string) => void
  disabled?: boolean
}

export function ClarifyQuestion({
  question,
  options,
  onAnswer,
  disabled
}: ClarifyQuestionProps): JSX.Element {
  const [answered, setAnswered] = useState(false)
  const [customText, setCustomText] = useState('')

  const isDisabled = disabled || answered || !onAnswer

  function handleOption(option: string): void {
    if (isDisabled) return
    setAnswered(true)
    onAnswer?.(option)
  }

  function handleCustomSubmit(event: FormEvent): void {
    event.preventDefault()
    if (isDisabled || !customText.trim()) return
    setAnswered(true)
    onAnswer?.(customText.trim())
  }

  return (
    <div className="clarify-question">
      <div className="clarify-question-text">
        <HelpCircle size={15} strokeWidth={1.75} />
        {question}
      </div>

      {options.length > 0 && (
        <div className="clarify-options">
          {options.map((option) => (
            <button
              key={option}
              type="button"
              className="clarify-option"
              disabled={isDisabled}
              onClick={() => handleOption(option)}
            >
              {option}
            </button>
          ))}
        </div>
      )}

      <form className="clarify-custom" onSubmit={handleCustomSubmit}>
        <input
          type="text"
          placeholder="Ou digite algo diferente…"
          value={customText}
          disabled={isDisabled}
          onChange={(event) => setCustomText(event.target.value)}
        />
        <button type="submit" disabled={isDisabled || !customText.trim()} aria-label="Enviar">
          <ArrowRight size={13} strokeWidth={2} />
        </button>
      </form>

      {answered && <span className="clarify-answered">Resposta enviada ✓</span>}
    </div>
  )
}
