import { useState } from 'react'
import { PageHeading, Modal } from '../../components/Shared'
import { useAuth } from '../auth/AuthProvider'
import { listEntries } from '../journal/journalApi'
import { downloadJSON, myProfile, storyFields } from './communityApi'
export default function AccountPrivacy() {
  const { client, session } = useAuth()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [confirm, setConfirm] = useState(false)
  async function exportAccount() {
    if (!client || !session || busy) return
    setBusy(true)
    try {
      const entries = await listEntries(client, session.user.id)
      const profile = await client
        .from('profiles')
        .select('display_name')
        .maybeSingle()
      const settings = await client
        .from('user_settings')
        .select('theme_id')
        .maybeSingle()
      if (profile.error || settings.error) throw new Error()
      const publicProfile = await myProfile(client)
      const stories = []
      for (let i = 0; i < entries.length; i += 50) {
        const result = await client
          .from('public_stories')
          .select(storyFields)
          .in(
            'id',
            entries.slice(i, i + 50).map((e) => e.id),
          )
        if (result.error) throw new Error()
        stories.push(...result.data)
      }
      downloadJSON({
        exported_at: new Date().toISOString(),
        private_profile: profile.data,
        settings: settings.data,
        public_profile: publicProfile,
        entries: entries.map(({ user_id, ...entry }) => {
          void user_id
          return entry
        }),
        published_stories: stories,
      })
      setMessage(
        'Private account export downloaded. Store it carefully; it contains your journal text.',
      )
    } catch {
      setMessage(
        'Export failed. No partial export was downloaded. Reconnect and retry.',
      )
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="page">
      <PageHeading
        eyebrow="Privacy / Your choices"
        title="Your words belong to you."
      />
      <section className="panel">
        <h2>Download your data</h2>
        <p>
          Export private journal entries, account preferences, your public
          identity and published snapshots as a local JSON file. No passwords or
          session tokens are included.
        </p>
        <button
          className="button secondary"
          disabled={busy}
          onClick={() => void exportAccount()}
        >
          Export account data
        </button>
      </section>
      <section className="panel">
        <h2>Request account deletion</h2>
        <p>
          Closed-beta deletion is manually fulfilled by the project owner. A
          request does not immediately delete your account or unpublish stories.
          You can unpublish stories and delete individual entries now. Export
          anything you want to keep first.
        </p>
        <p>
          There is no promised automatic completion time. Backup retention and
          deletion confirmation require owner review before a wider release.
        </p>
        <button
          className="button secondary"
          disabled={busy}
          onClick={() => setConfirm(true)}
        >
          Request account deletion
        </button>
      </section>
      <p role="status">{message}</p>
      {confirm && (
        <Modal
          title="Request account deletion?"
          onClose={() => {
            if (!busy) setConfirm(false)
          }}
        >
          <p>
            This records a private request for the project owner. Your account
            and stories remain available until it is fulfilled. No email is sent
            automatically.
          </p>
          <button
            className="button"
            disabled={busy}
            onClick={async () => {
              if (!client) return
              setBusy(true)
              try {
                const { error } = await client.rpc('request_account_deletion')
                setConfirm(false)
                setMessage(
                  error
                    ? 'Request not confirmed. Reconnect and retry.'
                    : 'Deletion request recorded. Contact the project owner for completion; your data has not yet been deleted.',
                )
              } catch {
                setMessage('Request not confirmed. Reconnect and retry.')
              } finally {
                setBusy(false)
              }
            }}
          >
            Confirm deletion request
          </button>
        </Modal>
      )}
    </div>
  )
}
