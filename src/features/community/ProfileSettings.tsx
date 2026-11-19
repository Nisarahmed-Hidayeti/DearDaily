import WritingVisibilityControl from './WritingVisibilityControl'
import Account from '../auth/Account'
import { liveRhythmEnabled } from './liveRhythm'
import PublicRhythmControl from './PublicRhythmControl'
import { profileImagesEnabled } from '../profile-images/api'
import { ProfilePhotos } from '../profile-images/ProfilePhotos'
import PublicProfilePreview from './PublicProfilePreview'
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
      setMessage('Profile saved.')
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
      <PublicProfilePreview profile={form} savedUsername={previous} />
      <form
        id="public-profile-details-form"
        className="panel account-form profile-details-form"
        onSubmit={(e) => {
          e.preventDefault()
          setConfirm(true)
        }}
      >
        <fieldset disabled={!ready || busy}>
          <h2>Profile details</h2>
          <div className="profile-username-field">
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
            <small>3–24 lowercase letters, numbers, or underscores.</small>
          </div>
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
          {appearanceEnabled && (
            <label>
              Profile banner
              <select
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
          )}
          {studioPolishEnabled && (
            <section className="profile-extra-fields">
              <h3>About</h3>
              <div className="public-panel-options">
                <label>
                  Interests
                  <input
                    maxLength={245}
                    placeholder="Books, travel, music"
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
                  Website · optional
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
              </div>
            </section>
          )}
        </fieldset>
      </form>
      <section className="profile-settings-section profile-sharing-settings">
        <h2>Sharing &amp; visibility</h2>
        <div className="profile-visibility-options">
          <label className="row">
            <span>Make my profile public</span>
            <input
              type="checkbox"
              checked={form.visible}
              disabled={!ready || busy}
              onChange={(e) => patch({ visible: e.target.checked })}
            />
          </label>
          <div className="row profile-form-actions">
            <button
              className="button"
              type="submit"
              form="public-profile-details-form"
              disabled={!ready || busy}
            >
              Save changes
            </button>
            {JSON.stringify(form) !== JSON.stringify(savedProfile) && (
              <button
                type="button"
                className="button secondary"
                disabled={!ready || busy}
                onClick={() => setForm(savedProfile)}
              >
                Cancel
              </button>
            )}
          </div>
        </div>
        {message && <p role="status">{message}</p>}
        {profileImagesEnabled && (
          <div className="profile-sharing-group profile-photo-settings">
            <h3>Photos</h3>
            <ProfilePhotos
              key={session?.user.id}
              fallback={avatars[form.avatar]}
              preset={profileCovers.find((c) => c.id === form.cover_id)?.src}
              publicVisible={savedProfile.visible}
              compact
            />
          </div>
        )}
        <div className="profile-sharing-group">
          <h3>Writing rhythm</h3>
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
        </div>
      </section>
      {session && (
        <section className="profile-settings-section account-settings-section">
          <Account embedded />
        </section>
      )}
      {previous && form.visible && (
        <Link className="text-link" to={`/u/${previous}`}>
          View saved public profile
        </Link>
      )}
      {previous && (
        <section className="profile-danger-zone">
          <button
            className="button secondary"
            disabled={busy}
            onClick={() => setRemoving(true)}
          >
            Remove public profile
          </button>
        </section>
      )}
      {removing && (
        <Modal
          title="Remove public profile?"
          onClose={() => {
            if (!busy) setRemoving(false)
          }}
        >
          <p>
            Your profile and its story bylines will be removed. Published story
            text stays public until you unpublish it. Your private journals stay
            saved.
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
              ? 'Your profile details will be public. Stories show your byline only when you choose it while publishing.'
              : 'Your profile and story bylines will be hidden. Published story text stays public until you unpublish it.'}
          </p>
          <button
            className="button"
            disabled={busy}
            onClick={() => void save()}
          >
            Save profile
          </button>
        </Modal>
      )}
    </div>
  )
}
