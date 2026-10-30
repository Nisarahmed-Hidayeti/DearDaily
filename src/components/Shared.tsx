import { BookOpen, ArrowUpRight, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useEffect, useRef, useId } from 'react'
import type { ReactNode, CSSProperties } from 'react'
export function Logo() {
  return (
    <Link className="logo" to="/" aria-label="DearDaily home">
      <BookOpen size={23} />
      <span>
        DearDaily<span className="accent">.</span>
      </span>
    </Link>
  )
}
export function DemoNotice() {
  return (
    <div className="demo-notice">
      <span className="status-dot" />
      Sample space{' '}
      <span>· Fictional sample content · Writing is not saved</span>
    </div>
  )
}
export function PageHeading({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string
  title: string
  children?: ReactNode
}) {
  return (
    <header className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
      </div>
      {children}
    </header>
  )
}
export function Scene({
  kind = 'mountains',
  className = '',
}: {
  kind?: string
  className?: string
}) {
  return (
    <div aria-hidden="true" className={`scene scene-${kind} ${className}`}>
      <div className="moon" />
      <div className="ridge ridge-back" />
      <div className="ridge ridge-front" />
      <div className="water" />
    </div>
  )
}
export function Modal({
  title,
  children,
  onClose,
  className = '',
  style,
}: {
  className?: string
  style?: CSSProperties
  title: string
  children: ReactNode
  onClose: () => void
}) {
  const titleId = useId()
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current
    const previousFocus = document.activeElement
    dialog?.showModal()
    return () => {
      dialog?.close()
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected)
        previousFocus.focus()
    }
  }, [])
  return (
    <dialog
      ref={ref}
      className={`modal ${className}`}
      style={style}
      aria-labelledby={titleId}
      onCancel={onClose}
    >
      <div className="modal-header">
        <h2 id={titleId}>{title}</h2>
        <button
          autoFocus
          className="icon-button"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <X />
        </button>
      </div>
      {children}
    </dialog>
  )
}
export function ArrowLink({
  to,
  children,
}: {
  to: string
  children: ReactNode
}) {
  return (
    <Link className="text-link" to={to}>
      {children}
      <ArrowUpRight size={16} />
    </Link>
  )
}

export function LoadingState({ children }: { children: ReactNode }) {
  return (
    <p className="loading-state" role="status">
      <span className="loading-orbit" aria-hidden="true" />
      <span>{children}</span>
    </p>
  )
}
