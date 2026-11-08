import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { ownerControlsEnabled } from './config'
type Notice = { id: string; action: string; reason: string; created_at: string }
export default function ModerationNotices() {
  const { client } = useAuth()
  const [notices, setNotices] = useState<Notice[]>([])
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    if (!client || !ownerControlsEnabled) return
    let active = true
    void Promise.resolve(client.rpc('my_moderation_notices'))
      .then(({ data, error }) => {
        if (active) {
          setFailed(!!error || !Array.isArray(data))
          setNotices(!error && Array.isArray(data) ? data : [])
        }
      })
      .catch(() => {
        if (active) setFailed(true)
      })
    return () => {
      active = false
    }
  }, [client])
  if (!ownerControlsEnabled || (!failed && !notices.length)) return null
  return (
    <section className="panel">
      <h2>Public-story notices</h2>
      {failed ? (
        <p>Notices could not load. Reconnect and reload your account.</p>
      ) : (
        notices.map((n) => (
          <article key={n.id}>
            <h3>
              {n.action === 'ban'
                ? 'Publishing restricted'
                : n.action === 'unban'
                  ? 'Future publishing restored'
                  : 'Public story removed'}
            </h3>
            <p>{n.reason}</p>
            <p className="tiny muted">
              {new Date(n.created_at).toLocaleDateString()} · Your private
              writing stays saved.
            </p>
          </article>
        ))
      )}
    </section>
  )
}
