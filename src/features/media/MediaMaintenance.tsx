import { useState } from 'react'
import { Modal } from '../../components/Shared'
import { useAuth } from '../auth/AuthProvider'
import { cleanQueuedPhotos, mediaEnabled } from './mediaApi'
export function MediaMaintenance() {
  const { client, session } = useAuth()
  const [confirm, setConfirm] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState('')
  if (!mediaEnabled || !client || !session) return null
  return (
    <section
      className="appearance-section"
      aria-labelledby="photo-maintenance-title"
    >
      <h2 id="photo-maintenance-title">A little housekeeping</h2>
      <p>
        Remove unused uploads older than 24 hours. Photos used by saved entries
        and published stories are preserved.
      </p>
      <button
        className="button secondary"
        disabled={busy}
        onClick={() => setConfirm(true)}
      >
        Review unused photo cleanup
      </button>
      {message && <p role="status">{message}</p>}
      {confirm && (
        <Modal
          title="Clean up unused photos?"
          onClose={() => {
            if (!busy) setConfirm(false)
          }}
        >
          <p>
            Save your writing in every open tab first. This permanently removes
            your uploads older than 24 hours that no saved entry or published
            story uses. An old unsaved draft or undo history may still reference
            them.
          </p>
          <div className="row">
            <button
              className="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true)
                setMessage('')
                try {
                  await cleanQueuedPhotos(client, true)
                  setMessage(
                    'Photo cleanup confirmed. Referenced photos were preserved.',
                  )
                  setConfirm(false)
                } catch {
                  setMessage(
                    'Cleanup was not confirmed. Reconnect and try again.',
                  )
                } finally {
                  setBusy(false)
                }
              }}
            >
              {busy ? 'Cleaning…' : 'I saved my drafts · Clean up'}
            </button>
            <button
              className="button secondary"
              disabled={busy}
              onClick={() => setConfirm(false)}
            >
              Cancel
            </button>
          </div>
        </Modal>
      )}
    </section>
  )
}
