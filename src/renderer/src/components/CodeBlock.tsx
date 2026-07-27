import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import './CodeBlock.css'

interface CodeBlockProps {
  language?: string
  code: string
}

export function CodeBlock({ language, code }: CodeBlockProps): JSX.Element {
  const [copied, setCopied] = useState(false)

  async function handleCopy(): Promise<void> {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="code-block">
      <div className="code-block-header">
        <span className="code-block-lang">{language || 'text'}</span>
        <button type="button" className="code-block-copy" onClick={handleCopy}>
          {copied ? <Check size={12} strokeWidth={2} /> : <Copy size={12} strokeWidth={1.75} />}
          {copied ? 'Copiado' : 'Copiar'}
        </button>
      </div>
      <SyntaxHighlighter
        language={language || 'text'}
        style={vscDarkPlus}
        customStyle={{
          margin: 0,
          background: 'transparent',
          padding: '12px 14px',
          fontSize: '12.5px'
        }}
        codeTagProps={{ style: { fontFamily: 'var(--font-mono)' } }}
        wrapLongLines
      >
        {code}
      </SyntaxHighlighter>
    </div>
  )
}
