import { useRef, useState, useEffect } from 'react'
import { communityEnabled } from '../features/community/communityApi'
import { NavLink, Outlet, Link, useLocation } from 'react-router-dom'
import {
  House,
  BookOpen,
  PenLine,
  Compass,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  ChevronUp,
  Settings,
  UserRound,
  LogOut,
} from 'lucide-react'
import { DemoNotice, Logo, Modal } from '../components/Shared'
import { useAuth } from '../features/auth/AuthProvider'
import { journalEnabled } from '../features/journal/journalApi'
import type { ThemeId } from '../features/theme/themes'
import './workspace.css'
const navigation = [
  { to: '/app', label: 'Home', icon: House },
  { to: '/app/journal', label: 'My Journal', icon: BookOpen },
  { to: '/app/write', label: 'Write', icon: PenLine },
  { to: '/explore', label: 'Explore', icon: Compass },
]
export const sidebarPreferenceKey = 'deardaily.sidebar-layout'
function savedSidebar(): 'expanded' | 'collapsed' | null {
  try {
    const v = localStorage.getItem(sidebarPreferenceKey)
    return v === 'expanded' || v === 'collapsed' ? v : null
  } catch {
    return null
  }
}
export default function Shell() {
  const { session, signOut, loading } = useAuth()
  const { pathname } = useLocation()
  const writing =
    pathname === '/app/write' ||
    pathname.startsWith('/app/write/') ||
    pathname === '/dev/editor-workshop'
  const [preference, setPreference] = useState(savedSidebar)
  const collapsed = preference ? preference === 'collapsed' : writing
  const [previewTheme, setPreviewTheme] = useState<ThemeId>()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const account = useRef<HTMLDetailsElement>(null)
  const publicPage =
    journalEnabled &&
    (pathname === '/explore' ||
      pathname.startsWith('/u/') ||
      (pathname.startsWith('/explore/') &&
        !pathname.startsWith('/explore/samples')))
  function toggleSidebar() {
    const next = collapsed ? 'expanded' : 'collapsed'
    setPreference(next)
    try {
      localStorage.setItem(sidebarPreferenceKey, next)
    } catch {
      /* Layout still works when browser storage is unavailable. */
    }
  }
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === sidebarPreferenceKey) setPreference(savedSidebar())
    }
    const outside = (event: PointerEvent) => {
      if (account.current && !account.current.contains(event.target as Node))
        account.current.open = false
    }
    window.addEventListener('storage', onStorage)
    document.addEventListener('pointerdown', outside)
    return () => {
      window.removeEventListener('storage', onStorage)
      document.removeEventListener('pointerdown', outside)
    }
  }, [])
  const closeMenus = () => {
    setMobileOpen(false)
    if (account.current) account.current.open = false
  }
  const primaryLinks = (
    <nav aria-label="Primary navigation">
      {navigation.map(({ to, label, icon: Icon }) => (
        <NavLink
          end={to !== '/app/write'}
          to={to}
          key={to}
          aria-label={label}
          data-tooltip={label}
          onClick={closeMenus}
        >
          <Icon size={19} aria-hidden="true" />
          <span className="nav-label">{label}</span>
        </NavLink>
      ))}
    </nav>
  )
  const accountLinks = (
    <nav aria-label="Account controls">
      <Link to={session ? '/account' : '/auth/sign-in'} onClick={closeMenus}>
        <UserRound size={17} />
        {session ? 'Account information' : 'Sign in'}
      </Link>
      <Link
        to={
          session && communityEnabled
            ? '/account/public-profile'
            : session
              ? '/account'
              : '/auth/sign-in'
        }
        onClick={closeMenus}
      >
        <PenLine size={17} />
        Edit Profile
      </Link>
      <Link to="/app/settings" onClick={closeMenus}>
        <Settings size={17} />
        Settings & appearance
      </Link>
      {session && communityEnabled && (
        <Link to="/app/published" onClick={closeMenus}>
          <BookOpen size={17} />
          My published stories
        </Link>
      )}
      <button
        aria-pressed={preference === null}
        onClick={() => {
          setPreference(null)
          try {
            localStorage.removeItem(sidebarPreferenceKey)
          } catch {
            /* Browser storage is optional. */
          }
          closeMenus()
          account.current?.querySelector('summary')?.focus()
        }}
      >
        <PanelLeftClose size={17} />
        Automatic writing layout
      </button>
      {session && (
        <button
          disabled={signingOut}
          onClick={async () => {
            // Match the editor navigation guard before clearing its session.
            if (
              document.querySelector('[data-unsaved-writing="true"]') &&
              !window.confirm(
                'Some writing changes are not confirmed. Export a copy before signing out. Sign out and leave these changes?',
              )
            )
              return
            setSigningOut(true)
            try {
              if (await signOut()) closeMenus()
            } finally {
              setSigningOut(false)
            }
          }}
        >
          <LogOut size={17} />
          {signingOut ? 'Signing out…' : 'Sign out'}
        </button>
      )}
    </nav>
  )
  return (
    <div
      className="app-shell studio-shell"
      data-collapsed={collapsed}
      data-writing={writing}
      data-theme={
        import.meta.env.DEV && pathname === '/dev/editor-workshop'
          ? previewTheme
          : undefined
      }
    >
      <aside className="studio-sidebar" aria-label="Workspace sidebar">
        <div className="studio-brand">
          <Logo />
          <button
            className="sidebar-toggle"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!collapsed}
            onMouseDown={(e) => e.preventDefault()}
            onClick={toggleSidebar}
          >
            {collapsed ? (
              <PanelLeftOpen size={17} />
            ) : (
              <PanelLeftClose size={17} />
            )}
          </button>
        </div>
        {primaryLinks}
        <details
          className="studio-account"
          ref={account}
          onKeyDown={(e) => {
            if (e.key === 'Escape' && account.current?.open) {
              e.preventDefault()
              account.current.open = false
              account.current.querySelector('summary')?.focus()
            }
          }}
        >
          <summary aria-label="Open account menu" data-tooltip="Your account">
            <span className="avatar" aria-hidden="true">
              JD
            </span>
            <span className="account-caption">
              {session ? 'Your space' : 'DearDaily'}
              <small>
                {session ? 'Private by default' : 'Preview workspace'}
              </small>
            </span>
            <ChevronUp size={14} className="account-chevron" />
          </summary>
          <div className="studio-account-menu">{accountLinks}</div>
        </details>
      </aside>
      <div className="studio-main">
        <header className="studio-mobile-header">
          <Logo />
          <button
            className="sidebar-toggle"
            aria-label="Open navigation"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen(true)}
          >
            <Menu size={21} />
          </button>
        </header>
        {!writing &&
          !pathname.startsWith('/dev/') &&
          (publicPage ? (
            <div className="demo-notice">
              Public stories · Shared explicitly by their writers
            </div>
          ) : session ? (
            <div className="demo-notice">
              Your private journal · Share only what you choose
            </div>
          ) : !loading ? (
            <DemoNotice />
          ) : null)}
        <main id="main" tabIndex={-1}>
          <Outlet
            context={import.meta.env.DEV ? { setPreviewTheme } : undefined}
          />
        </main>
      </div>
      {mobileOpen && (
        <Modal title="Your workspace" onClose={() => setMobileOpen(false)}>
          <div className="studio-mobile-menu">
            {primaryLinks}
            <div className="mobile-account-links">{accountLinks}</div>
          </div>
        </Modal>
      )}
    </div>
  )
}
