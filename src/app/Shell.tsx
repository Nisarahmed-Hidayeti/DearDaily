import { NavLink, Outlet, Link } from 'react-router-dom'
import {
  House,
  PenLine,
  Compass,
  ArrowUpRight,
  LockKeyhole,
} from 'lucide-react'
import { DemoNotice, Logo } from '../components/Shared'
export default function Shell() {
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
            Jamie, demo writer<small>Fictional preview account</small>
          </div>
        </div>
      </aside>
      <div className="app-main">
        <div className="mobile-logo">
          <Logo />
        </div>
        <DemoNotice />
        <main id="main" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
