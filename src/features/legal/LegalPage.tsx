import { Link } from 'react-router-dom'
import { Logo } from '../../components/Shared'

export default function LegalPage({ kind }: { kind: 'privacy' | 'terms' }) {
  return (
    <main id="main" tabIndex={-1} className="auth-layout legal-layout">
      <div className="auth-brand">
        <Logo />
        <Link to="/">Back home</Link>
      </div>
      <article className="legal-document">
        <p className="eyebrow">DearDaily / Beta · Updated November 8, 2026</p>
        <h1>
          {kind === 'privacy'
            ? 'Your privacy, plainly.'
            : 'A thoughtful space, shared responsibly.'}
        </h1>
        {kind === 'privacy' ? (
          <>
            <p>
              DearDaily is a personal journal with optional public storytelling,
              operated by its independent project owner. Contact{' '}
              <a href="mailto:deardailywebsite@gmail.com">
                deardailywebsite@gmail.com
              </a>{' '}
              about your data or this notice.
            </p>
            <h2>What we process</h2>
            <p>
              We process your account email, authentication information,
              optional display name, journal text and photos, account
              preferences, and the stories and profile information you
              deliberately publish. Google sign-in requests basic name, email
              and profile information; it does not request Gmail, Drive or
              contacts access.
            </p>
            <h2>Private writing and public choices</h2>
            <p>
              Private journals and photos are restricted to their account
              through application permissions. Authorized infrastructure
              operators may have administrative access; DearDaily does not
              provide end-to-end encryption. Public stories are separate
              snapshots. Private edits do not automatically update them. A
              hidden byline hides your public identity from readers, not from
              the service operator.
            </p>
            <p>
              Only content you approve for publication is intended for public
              readers. Unpublishing removes application access to the public
              copy, but cannot recall screenshots, downloads or copies cached by
              other people.
            </p>
            <h2>Services that help DearDaily work</h2>
            <p>
              Supabase provides account, database and media services. Netlify
              hosts the website. Brevo delivers account emails. Cloudflare
              Turnstile processes browser and network signals for abuse
              prevention. Google processes sign-in when you choose it. These
              providers process data under their own policies, and processing
              may occur outside your country.
            </p>
            <h2>Browser storage and security</h2>
            <p>
              Your browser stores authentication information to keep you signed
              in and appearance preferences for the interface. Sign out on
              shared devices. Private cloud entries are not deliberately stored
              as a browser journal archive. Operational logs may include
              request, network and error information.
            </p>
            <h2>Your choices and deletion</h2>
            <p>
              You can edit or delete entries, unpublish stories, and choose
              whether to show a public profile. Account export and deletion
              requests are available when enabled in your account; you may also
              contact the address above from your registered email. Account
              deletion is manually handled during beta. We may request identity
              verification. No automatic completion time is promised. Backup
              retention is still being reviewed; deleting live data does not
              guarantee immediate removal from provider backups or security
              records.
            </p>
            <h2>Beta limitations</h2>
            <p>
              Keep your own copies of important writing. Retention, recovery
              procedures and wider-launch policies are still being reviewed.
              This notice does not claim perfect security or legal compliance.
              Material changes will be reflected here.
            </p>
          </>
        ) : (
          <>
            <p>
              DearDaily is an evolving beta for private writing and deliberate
              public sharing. Contact{' '}
              <a href="mailto:deardailywebsite@gmail.com">
                deardailywebsite@gmail.com
              </a>{' '}
              for support or reports.
            </p>
            <h2>Your account and writing</h2>
            <p>
              Use an email or Google account you control, keep credentials
              private, and do not access another person's account. You retain
              ownership of your writing. You permit DearDaily and its service
              providers to process it to operate the features you choose,
              including displaying a story publicly when you publish it.
            </p>
            <h2>Publish with care</h2>
            <p>
              Only upload or publish material you have permission to use. Do not
              publish illegal content, threats, harassment, exploitation, other
              people's private information, or spam. Anonymous bylines do not
              remove responsibility for what you publish. Public stories can be
              reported and reviewed; authorized moderators may remove public
              material. Moderation does not grant ordinary moderators access to
              private journals.
            </p>
            <h2>Availability and your choices</h2>
            <p>
              Features and availability may change during beta. Keep independent
              exports of important writing. You can stop using the service,
              unpublish stories, delete individual entries, or request account
              deletion. Unpublishing cannot remove copies already downloaded by
              others. No paid service is offered by these beta features.
            </p>
            <h2>Before joining</h2>
            <p>
              Read the <Link to="/privacy">privacy notice</Link> and use the
              service only where you are legally permitted to do so. Do not use
              DearDaily as emergency or medical support. These beta terms do not
              limit rights that applicable law does not allow us to limit.
            </p>
          </>
        )}
        <nav aria-label="Legal pages">
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Beta terms</Link>
          <Link to="/auth/sign-in">Sign in</Link>
        </nav>
      </article>
    </main>
  )
}
