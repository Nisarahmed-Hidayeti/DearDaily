import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { PageHeading, Modal } from '../../components/Shared'
import { unpublishStory } from '../journal/journalApi'
import { storyFields, listOwnStoryIds } from './communityApi'
import type { CommunityStory } from './communityApi'
export default function PublishedManager() {
  const { client, session } = useAuth()
  const [rows, setRows] = useState<CommunityStory[]>([])
  const [message, setMessage] = useState('Loading your stories…')
  const [retry, setRetry] = useState(0)
  const [selected, setSelected] = useState<CommunityStory | null>(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    let active = true
    if (!client || !session) return
    void (async () => {
      const ids = await listOwnStoryIds(client, session.user.id)
      const stories: CommunityStory[] = []
      for (let i = 0; i < ids.length; i += 50) {
        const { data, error } = await client
          .from('public_stories')
          .select<string, CommunityStory>(storyFields)
          .in('id', ids.slice(i, i + 50))
        if (error) throw error
        stories.push(...(data as CommunityStory[]))
      }
      if (active) {
        setRows(
          stories.sort((a, b) => b.published_at.localeCompare(a.published_at)),
        )
        setMessage('')
      }
    })().catch(() => {
      if (active)
        setMessage('Could not confirm your published stories. Reload to retry.')
    })
    return () => {
      active = false
    }
  }, [client, session, retry])
  return (
    <div className="page">
      <PageHeading
        eyebrow="Your words / Out in the world"
        title="My published stories."
      />
      <p className="muted">
        Public snapshots stay separate from private edits. Review updates in the
        editor before publishing again.
      </p>
      <p role="status">{message}</p>
      {!message && !rows.length && (
        <p className="panel">
          No public stories yet. Your private entries remain yours.
        </p>
      )}
      {rows.map((r) => (
        <section className="panel published-row" key={r.id}>
          <div>
            <h2>{r.title}</h2>
            <p className="muted">
              {new Date(r.published_at).toLocaleDateString()} ·{' '}
              {r.public_username ? `@${r.public_username}` : 'Anonymous writer'}
            </p>
          </div>
          <div className="row">
            <Link className="text-link" to={`/explore/published/${r.id}`}>
              View
            </Link>
            <Link className="text-link" to={`/app/write/${r.id}`}>
              Review update / delete
            </Link>
            <button className="button secondary" onClick={() => setSelected(r)}>
              Unpublish
            </button>
          </div>
        </section>
      ))}
      {selected && (
        <Modal
          title="Unpublish this story?"
          onClose={() => {
            if (!busy) setSelected(null)
          }}
        >
          <p>
            Your private source stays saved. Copies already downloaded cannot be
            recalled.
          </p>
          <button
            className="button"
            disabled={busy}
            onClick={async () => {
              if (!client) return
              setBusy(true)
              try {
                await unpublishStory(client, selected.id)
                setSelected(null)
                setRetry((n) => n + 1)
              } catch {
                setMessage('Unpublish not confirmed. Reload to check.')
              } finally {
                setBusy(false)
              }
            }}
          >
            Confirm unpublish
          </button>
        </Modal>
      )}
    </div>
  )
}
