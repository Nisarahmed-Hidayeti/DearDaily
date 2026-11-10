import WritingVisibilityControl from './WritingVisibilityControl'
import { liveRhythmEnabled } from './liveRhythm'
import PublicRhythmControl from './PublicRhythmControl'
import { OwnProfileAvatar } from '../profile-images/ProfileImage'
import { ProfilePhotos } from '../profile-images/ProfilePhotos'
import { studioPolishEnabled } from '../rich-editor/studioPolish'
import { emptyProfilePanel } from './profilePanel'
import PublicStreakControl from './PublicStreakControl'
import { appearanceEnabled } from '../appearance/appearance'
import { profileCovers } from '../rich-editor/covers'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeading, Modal } from '../../components/Shared'
import { useAuth } from '../auth/AuthProvider'
import {
  avatars,
  myProfile,
  saveProfile,
  removePublicProfile,
} from './communityApi'
import type { PublicProfile } from './communityApi'
const empty: PublicProfile = {
  ...(appearanceEnabled ? { cover_id: null } : {}),
  username: '',
  display_name: '',
  bio: '',
  avatar: 'leaf',
  visible: false,
  joined_month: null,
}
export default function ProfileSettings() {
  const { client, session } = useAuth()
  const [form, setForm] = useState(empty)
  const [savedProfile, setSavedProfile] = useState(empty)
  const [previous, setPrevious] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [confirm, setConfirm] = useState(false)
  const [removing, setRemoving] = useState(false)
  useEffect(() => {
    let active = true
    if (!client) return
    void myProfile(client)
      .then((p) => {
        if (active) {
          setForm(p ?? empty)
          setSavedProfile(p ?? empty)
          setPrevious(p?.username ?? null)
          setReady(true)
        }
      })
      .catch(() => {
        if (active) setMessage('Could not load profile. Reload to retry.')
      })
    return () => {
      active = false
    }
  }, [client])
  const patch = (p: Partial<PublicProfile>) => setForm((f) => ({ ...f, ...p }))
  async function save() {
    if (!client || busy) return
    setBusy(true)
    try {
      const p = await saveProfile(client, form, previous)
      setForm(p)
      setSavedProfile(p)
      setPrevious(p.username)
      setMessage(
        'Profile saved. Hidden or renamed profiles detach existing story bylines; they are never reattached automatically.',
      )
    } catch (e) {
      setMessage((e as Error).message)
    } finally {
      setBusy(false)
      setConfirm(false)
    }
  }
  async function remove() {
    if (!client || !previous || busy) return
    setBusy(true)
    try {
      await removePublicProfile(client, previous)
      setForm(empty)
      setSavedProfile(empty)
      setPrevious(null)
      setMessage(
        'Public profile removed. Your private account and journals remain unchanged.',
      )
    } catch (e) {
      setMessage((e as Error).message)
    } finally {
      setBusy(false)
      setRemoving(false)
    }
  }
  return (
    <div className="page profile-settings">
      <PageHeading eyebrow="" title="Public profile" />
      <p className="muted">
        Choose what others see. Your journals stay private.
      </p>
      <ProfilePhotos
        key={session?.user.id}
        fallback={avatars[form.avatar]}
        preset={profileCovers.find((c) => c.id === form.cover_id)?.src}
        publicVisible={savedProfile.visible}
      />
      <form
        className="panel account-form"
        onSubmit={(e) => {
          e.preventDefault()
          setConfirm(true)
        }}
      >
        <fieldset disabled={!ready || busy}>
          <label>
            Username
            <input
              required
              minLength={3}
              maxLength={24}
              pattern="[a-z][a-z0-9_]{2,23}"
              value={form.username}
              onChange={(e) => patch({ username: e.target.value })}
            />
          </label>
          <small>
            3–24 lowercase letters, numbers or underscores. Start with a letter.
            Names are unique, not identity verification.
          </small>
          <label>
            Public display name
            <input
              required
              maxLength={80}
              value={form.display_name}
              onChange={(e) => patch({ display_name: e.target.value })}
            />
          </label>
          <label>
            Short biography
            <textarea
              maxLength={300}
              value={form.bio}
              onChange={(e) => patch({ bio: e.target.value })}
            />
          </label>
          <label>
            Default avatar icon
            <select
              value={form.avatar}
              onChange={(e) => patch({ avatar: e.target.value })}
            >
              {Object.entries(avatars).map(([key, icon]) => (
                <option key={key} value={key}>
                  {icon} {key}
                </option>
              ))}
            </select>
          </label>
          <label>
            Public profile banner
            <select
              disabled={!appearanceEnabled}
              value={form.cover_id ?? ''}
              onChange={(e) => patch({ cover_id: e.target.value || null })}
            >
              <option value="">No banner</option>
              {profileCovers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          {!appearanceEnabled && (
            <p className="tiny muted">
              Banner synchronization awaits the reviewed settings migration.
              Your existing profile controls remain available.
            </p>
          )}
          {studioPolishEnabled && (
            <details className="profile-settings-disclosure">
              <summary>More about you</summary>
              <fieldset className="public-panel-options">
                <label>
                  Interests · comma separated
                  <input
                    maxLength={245}
                    value={form.public_panel?.interests.join(',') ?? ''}
                    onChange={(e) =>
                      patch({
                        public_panel: {
                          ...emptyProfilePanel,
                          ...form.public_panel,
                          interests: e.target.value.split(',').slice(0, 6),
                        },
                      })
                    }
                  />
                </label>
                <label>
                  Personal link · optional
                  <input
                    type="url"
                    placeholder="https://"
                    maxLength={300}
                    value={form.public_panel?.link ?? ''}
                    onChange={(e) =>
                      patch({
                        public_panel: {
                          ...emptyProfilePanel,
                          ...form.public_panel,
                          link: e.target.value || null,
                        },
                      })
                    }
                  />
                </label>
              </fieldset>
            </details>
          )}
          <label className="row">
            <input
              type="checkbox"
              checked={form.visible}
              onChange={(e) => patch({ visible: e.target.checked })}
            />
            Make this public profile visible
          </label>
          <div className="row">
            <button className="button">Review profile changes</button>
            <button
              type="button"
              className="button secondary"
              onClick={() => setForm(savedProfile)}
            >
              Cancel edits
            </button>
          </div>
        </fieldset>
      </form>
      <p role="status">{message}</p>
      <section className="profile-sharing-settings">
        <h2>Writing rhythm</h2>
        {liveRhythmEnabled ? (
          <WritingVisibilityControl
            key={`${previous}:visibility`}
            saved={!!previous}
            initial={savedProfile}
          />
        ) : (
          <>
            <PublicRhythmControl
              key={`${previous}:calendar`}
              saved={!!previous}
              initial={savedProfile.public_rhythm}
            />
            <PublicStreakControl
              key={`${previous}:count`}
              saved={!!previous}
              initial={savedProfile.public_streak}
            />
          </>
        )}
      </section>
      <details className="profile-settings-disclosure profile-preview">
        <summary>Preview profile</summary>
        <section className="panel profile-masthead">
          <p className="eyebrow">
            Preview · {form.visible ? 'Public after saving' : 'Hidden'}
          </p>
          <span className="profile-avatar">
            <OwnProfileAvatar fallback={avatars[form.avatar]} />
          </span>
          <h2>{form.display_name || 'Your public name'}</h2>
          <p>@{form.username || 'your_username'}</p>
          <p className="profile-bio">{form.bio}</p>
        </section>
      </details>
      {previous && form.visible && (
        <Link className="text-link" to={`/u/${previous}`}>
          View saved public profile
        </Link>
      )}
      {previous && (
        <button
          className="button secondary"
          disabled={busy}
          onClick={() => setRemoving(true)}
        >
          Remove public profile
        </button>
      )}
      {removing && (
        <Modal
          title="Remove public profile?"
          onClose={() => {
            if (!busy) setRemoving(false)
          }}
        >
          <p>
            This deletes your public identity and removes its story bylines.
            Published story text stays public until you unpublish it. Your
            private account and journals stay saved.
          </p>
          <button
            className="button"
            disabled={busy}
            onClick={() => void remove()}
          >
            Confirm profile removal
          </button>
        </Modal>
      )}
      {confirm && (
        <Modal
          title="Save public profile?"
          onClose={() => {
            if (!busy) setConfirm(false)
          }}
        >
          <p>
            {form.visible
              ? 'Your chosen username, display name, biography, avatar and selected public details will be publicly readable. Stories gain a byline only when you explicitly select it during publication.'
              : 'Your profile will be hidden. Existing public story bylines will be removed. Story text remains published until you unpublish it.'}
          </p>
          <button
            className="button"
            disabled={busy}
            onClick={() => void save()}
          >
            Confirm profile changes
          </button>
        </Modal>
      )}
    </div>
  )
}
