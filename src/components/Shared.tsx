import { BookOpen, ArrowUpRight, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
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
      Phase 1 preview{' '}
      <span>· Fictional sample content · Journal drafts are temporary</span>
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
}: {
  title: string
  children: ReactNode
  onClose: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current
    dialog?.showModal()
    return () => dialog?.close()
  }, [])
  return (
    <dialog
      ref={ref}
      className="modal"
      aria-labelledby="modal-title"
      onCancel={onClose}
    >
      <div className="row spread">
        <h2 id="modal-title">{title}</h2>
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
