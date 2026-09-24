import mark from '@renderer/assets/abapfy-horizon-mark.png'

export function AbapfyMark({ className = '' }: { className?: string }): JSX.Element {
  return <img src={mark} className={className} alt="" aria-hidden="true" />
}
