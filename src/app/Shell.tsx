import { NavLink, Outlet, Link, useLocation } from 'react-router-dom'
import {
  House,
  Settings,
  PenLine,
  Compass,
  ArrowUpRight,
  LockKeyhole,
} from 'lucide-react'
import { DemoNotice, Logo } from '../components/Shared'
import { useAuth } from '../features/auth/AuthProvider'
import { journalEnabled } from '../features/journal/journalApi'
export default function Shell() {
  const { session, loading } = useAuth()
  const { pathname } = useLocation()
  const publicPage =
    journalEnabled &&
    (pathname === '/explore' || pathname.startsWith('/explore/published/'))
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Logo />
        <p className="eyebrow">Your little corner</p>
        <nav aria-label="Application navigation">
          {[
            { to: '/app', label: 'Overview', icon: House },
            { to: '/app/write', label: 'Write an entry', icon: PenLine },
            { to: '/explore', label: 'Explore stories', icon: Compass },
            { to: '/app/settings', label: 'Settings', icon: Settings },
          ].map(({ to, label, icon: Icon }) => (
            <NavLink end to={to} key={to} aria-label={label}>
              <Icon size={19} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-note">
          <LockKeyhole size={20} />
          <p>A space that’s yours.</p>
          <span>Your journal begins with privacy.</span>
        </div>
        <Link className="back-home" to="/">
          Back to DearDaily <ArrowUpRight size={15} />
        </Link>
        <div className="demo-person">
          <span className="avatar">JD</span>
          <div>
            {session
              ? 'Your account'
              : publicPage
                ? 'Reader'
                : 'Jamie, demo writer'}
            <small>
              {session
                ? 'Private account'
                : publicPage
                  ? 'Public stories'
                  : 'Fictional preview account'}
            </small>
          </div>
        </div>
      </aside>
      <div className="app-main">
        <div className="mobile-logo">
          <Logo />
        </div>
        {publicPage ? (
          <div className="demo-notice">
            Public stories · Shared explicitly by their writers
          </div>
        ) : session && journalEnabled ? (
          <div className="demo-notice">
            Your private journal · Public stories require an explicit publish
            action
          </div>
        ) : (
          <DemoNotice />
        )}
        <div className="account-strip">
          <Link to={session && !loading ? '/account' : '/auth/sign-in'}>
            {session && !loading ? 'Your account' : 'Sign in'}
          </Link>
        </div>
        <main id="main" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
