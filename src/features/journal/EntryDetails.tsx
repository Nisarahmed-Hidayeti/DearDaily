import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { Modal } from '../../components/Shared'
export function EntryDetails({
  open,
  onClose,
  children,
}: {
  open: boolean
  onClose: () => void
  children: ReactNode
}) {
  const [mobile, setMobile] = useState(
    () => window.matchMedia?.('(max-width: 1100px)').matches ?? false,
  )
  const [height, setHeight] = useState(
    () => window.visualViewport?.height ?? window.innerHeight,
  )
  useEffect(() => {
    const media = window.matchMedia?.('(max-width: 1100px)')
    if (!media) return
    const changed = () => setMobile(media.matches)
    media.addEventListener('change', changed)
    return () => media.removeEventListener('change', changed)
  }, [])
  useEffect(() => {
    if (!open) return
    const update = () =>
      setHeight(window.visualViewport?.height ?? window.innerHeight)
    // The viewport may have resized while the sheet was closed.
    const frame = requestAnimationFrame(update)
    window.visualViewport?.addEventListener('resize', update)
    return () => {
      cancelAnimationFrame(frame)
      window.visualViewport?.removeEventListener('resize', update)
    }
  }, [open])
  useEffect(() => {
    if (!open || !mobile) return
    const frame = requestAnimationFrame(() => {
      const focused = document.activeElement
      if (
        focused instanceof HTMLElement &&
        focused.closest('.editor-details-sheet')
      )
        focused.scrollIntoView?.({ block: 'nearest', inline: 'nearest' })
    })
    return () => cancelAnimationFrame(frame)
  }, [height, open, mobile])
  if (mobile)
    return open ? (
      <Modal
        title="The little details"
        className="editor-details-sheet"
        style={{ '--available-height': `${height}px` } as CSSProperties}
        onClose={onClose}
      >
        {children}
      </Modal>
    ) : null
  return (
    <aside
      id="entry-details"
      className="entry-settings"
      hidden={!open}
      aria-label="Page details and publishing"
    >
      <button className="quiet" onClick={onClose}>
        Close details
      </button>
      {children}
    </aside>
  )
}
