import { journalEnabled } from '../journal/journalApi'
import { Link, NavLink } from 'react-router-dom'
import {
  ArrowRight,
  LockKeyhole,
  Sparkles,
  Sprout,
  ArrowDown,
} from 'lucide-react'
import { Logo, Scene } from '../../components/Shared'
export default function Landing() {
  return (
    <div className="landing">
      <nav className="public-nav">
        <Logo />
        <div className="nav-links">
          <NavLink to="/">Home</NavLink>
          <NavLink to="/explore">Explore</NavLink>
          <a href="#features">Features</a>
        </div>
        <div className="row">
          <Link className="quiet" to="/auth/sign-in">
            Sign in
          </Link>
          <Link className="button small" to="/auth/sign-up">
            Sign up <ArrowRight size={15} />
          </Link>
        </div>
      </nav>
      <main id="main" tabIndex={-1}>
        <section className="hero">
          <Scene className="hero-scene" />
          <div className="hero-content">
            <p className="eyebrow">
              <span className="little-line" />A little space for your inner
              world
            </p>
            <h1>
              Every day <br />
              has <em>a story.</em>
            </h1>
            <p className="hero-copy">
              Some moments are just for you.
              <br />
              Others deserve to be shared.
            </p>
            <p className="hero-description">
              A thoughtful place to journal privately, find your rhythm,
              <br className="desktop-break" /> and share the stories you choose.
            </p>
            <div className="row hero-actions">
              <Link className="button" to="/app/write">
                Start writing <ArrowRight size={18} />
              </Link>
              <Link className="button secondary" to="/explore">
                Explore stories
              </Link>
            </div>
            <p className="privacy-note">
              <LockKeyhole size={13} />
              Your words. Your space. Private by default.
            </p>
          </div>
          <div className="hero-caption">
            <span>01 / A moment to yourself</span>
            <span>Pause. Reflect. Begin again.</span>
          </div>
        </section>
        <section id="features" className="features">
          <div className="section-intro">
            <p className="eyebrow">Room for all of you</p>
            <h2>
              A daily ritual. <br />
              <em>A world of possibility.</em>
            </h2>
            <a className="text-link" href="#ritual">
              Make a little room <ArrowDown size={15} />
            </a>
          </div>
          {[
            {
              icon: LockKeyhole,
              title: 'Keep it close.',
              copy: 'An honest space for the thoughts you’re still figuring out. Every entry starts private.',
            },
            {
              icon: Sparkles,
              title: 'Let it resonate.',
              copy: 'Some stories connect us. Explore other perspectives and choose what you share.',
            },
            {
              icon: Sprout,
              title: 'Come back to yourself.',
              copy: 'Small moments add up. A gentle foundation for a writing habit that feels like you.',
            },
          ].map(({ icon: Icon, title, copy }, i) => (
            <article className="feature" key={title}>
              <span className="feature-number">0{i + 1}</span>
              <Icon />
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </section>
        <section className="ritual" id="ritual">
          <p className="eyebrow">No perfect words required</p>
          <h2>
            Start with how you feel.
            <br />
            <em>See where it takes you.</em>
          </h2>
          <Link className="button" to="/app/write">
            Find your first words <ArrowRight size={18} />
          </Link>
          <p className="muted">
            {journalEnabled
              ? 'Closed beta: sign in to save private entries and deliberately share stories.'
              : 'Explore the frontend preview. Drafts are temporary.'}
          </p>
        </section>
      </main>
      <footer>
        <Logo />
        <p>Every day has a story.</p>
        <Link to="/app">
          Try the demo <ArrowRight size={14} />
        </Link>
        <Link to="/app/settings">
          Appearance <ArrowRight size={14} />
        </Link>
        <span>© 2026 DearDaily</span>
      </footer>
    </div>
  )
}
