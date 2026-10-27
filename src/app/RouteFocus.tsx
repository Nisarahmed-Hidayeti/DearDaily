import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/** Keep client navigation predictable for keyboard and screen-reader users. */
export default function RouteFocus() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
    const main = document.getElementById('main')
    main?.focus({ preventScroll: true })
  }, [pathname])
  return null
}
