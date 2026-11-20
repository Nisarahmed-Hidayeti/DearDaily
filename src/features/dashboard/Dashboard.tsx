import { lazy, Suspense, useEffect, useState } from 'react'
import { LoadingState } from '../../components/Shared'
import { CloudUnavailable } from '../journal/CloudUnavailable'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Flame,
  BookOpen,
  PenLine,
  LockKeyhole,
  Globe,
  Plus,
} from 'lucide-react'
import { ArrowLink, PageHeading, Scene } from '../../components/Shared'
import { entries, dashboardStats } from '../../data/demo'
import ActivityHeatmap from './ActivityHeatmap'
const CloudDashboard = lazy(() => import('./CloudDashboard'))
import { useAuth } from '../auth/AuthProvider'
import { RequireAccount } from '../auth/AuthPages'
import { journalEnabled } from '../journal/journalApi'
import type { Entry } from '../../data/demo'
import { listDeviceDrafts, type DeviceDraft } from '../journal/localDrafts'
import { entryTitle } from '../journal/journalApi'
const statIcons = { streak: Flame, entries: BookOpen, words: PenLine }
function DemoDashboard({
  recentEntries = entries,
  library = false,
}: {
  recentEntries?: Entry[]
  library?: boolean
}) {
  const [deviceDrafts] = useState<DeviceDraft[]>(listDeviceDrafts)
  const [drafts, setDrafts] = useState(deviceDrafts)
  useEffect(() => {
    const timer = window.setTimeout(() => setDrafts(listDeviceDrafts()), 0)
    return () => window.clearTimeout(timer)
  }, [])
  return (
    <div className={`page dashboard ${library ? 'journal-library' : ''}`}>
      <PageHeading
        eyebrow="Your journal / Overview"
        title={library ? 'My Journal' : 'A new day. A new page.'}
      >
        <Link className="button" to="/app/write">
          <Plus size={17} />
          New Entry
        </Link>
      </PageHeading>
      <p className="page-subtitle">What would you like to remember?</p>
      {!library && (
        <>
          <div className="dashboard-banner">
            <Scene />
            <div>
              <p className="eyebrow">A gentle reminder</p>
              <h2>
                You don’t have to do it all.
                <br />
                <em>Just notice a little.</em>
              </h2>
              <Link to="/app/write" className="text-link">
                Take a moment to write <ArrowRight size={16} />
              </Link>
            </div>
          </div>
          <div className="stats">
            {dashboardStats
              .filter((stat) => stat.kind !== 'streak')
              .map(({ kind, value, label, note }) => {
                const Icon = statIcons[kind]
                return (
                  <article className="panel stat" key={label}>
                    <Icon size={21} />
                    <div>
                      <strong>{value}</strong>
                      <span>{label}</span>
                    </div>
                    <small>{note}</small>
                  </article>
                )
              })}
          </div>
          <ActivityHeatmap />
        </>
      )}
      {library && (
        <section className="panel recent device-drafts">
          <div className="row spread">
            <h2>Saved on this device</h2>
            <span className="badge">Private drafts</span>
          </div>
          {!drafts.length ? (
            <div className="empty-state">
              <BookOpen />
              <h3>No saved drafts yet.</h3>
              <p>Write without an account. Your words save in this browser.</p>
              <ArrowLink to="/app/write">Start writing</ArrowLink>
            </div>
          ) : (
            drafts.map((draft) => (
              <Link
                to={`/app/write/${draft.id}`}
                className="entry-row"
                key={draft.id}
              >
                <div>
                  <span className="tiny muted">
                    Saved {new Date(draft.updated_at).toLocaleString()}
                  </span>
                  <h3>{entryTitle(draft.title, draft.entry_date)}</h3>
                  <p>
                    {draft.body.slice(0, 180) ||
                      'An empty page, ready when you are.'}
                  </p>
                  <span className="visibility">
                    Private · Stored on this device
                  </span>
                </div>
                <ArrowRight size={16} />
              </Link>
            ))
          )}
        </section>
      )}
      {!library && (
        <div className="dashboard-bottom">
          <section className="panel recent">
            <div className="row spread">
              <h2>Recent pages</h2>
              <span className="badge">Sample entries</span>
            </div>
            {recentEntries.length === 0 && (
              <div className="empty-state">
                <BookOpen />
                <h3>Your first page is waiting.</h3>
                <p>Begin with one small moment.</p>
                <ArrowLink to="/app/write">Write your first entry</ArrowLink>
              </div>
            )}
            {recentEntries.map((entry, i) => (
              <Link
                to={`/app/entries/${entry.id}`}
                className="entry-row"
                key={entry.id}
              >
                <Scene kind={['mountains', 'window', 'stars'][i]} />
                <div>
                  <span className="tiny muted">{entry.date}</span>
                  <h3>{entry.title}</h3>
                  <p>{entry.body}</p>
                  <span className="visibility">
                    {entry.visibility === 'Private' ? (
                      <LockKeyhole size={12} />
                    ) : (
                      <Globe size={12} />
                    )}{' '}
                    {entry.visibility} · Sample
                  </span>
                </div>
                <ArrowRight size={16} />
              </Link>
            ))}
          </section>
          {!library && (
            <section className="panel prompt">
              <p className="eyebrow">A thought to begin with</p>
              <span className="prompt-star">✧</span>
              <h2>What’s one small thing that made today feel like yours?</h2>
              <p>
                You don’t need a remarkable day to have something worth writing.
              </p>
              <ArrowLink to="/app/write">Write about it</ArrowLink>
              <ArrowLink to="/explore">Find inspiration in stories</ArrowLink>
            </section>
          )}
        </div>
      )}
    </div>
  )
}

export default function Dashboard(props: {
  recentEntries?: Entry[]
  library?: boolean
}) {
  const { session, loading } = useAuth()
  if (loading) return <LoadingState>Restoring your account…</LoadingState>
  if (session && !journalEnabled) return <CloudUnavailable />
  if (session)
    return (
      <RequireAccount>
        <Suspense
          fallback={<LoadingState>Loading your private journal…</LoadingState>}
        >
          <CloudDashboard library={props.library} />
        </Suspense>
      </RequireAccount>
    )
  return <DemoDashboard {...props} />
}
