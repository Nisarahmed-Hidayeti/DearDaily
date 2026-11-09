import { useEffect, useRef, useState } from 'react'
import { Camera, ImagePlus } from 'lucide-react'
import { useAuth } from '../auth/AuthProvider'
import {
  profileImagesEnabled,
  ownImages,
  emptyImages,
  uploadProfileImage,
  saveImages,
  type ProfileImages,
  type ImageSlot,
} from './api'
import { ProfileImage } from './ProfileImage'
import { ImageCropDialog } from './ImageCropDialog'
import './profile-images.css'
export function ProfilePhotos({
  fallback,
  preset,
  publicVisible,
}: {
  fallback: React.ReactNode
  preset?: string
  publicVisible: boolean
}) {
  const { client, session } = useAuth(),
    who = session?.user.id
  const [draft, setDraft] = useState<ProfileImages>(emptyImages),
    [saved, setSaved] = useState<ProfileImages>(emptyImages),
    [ready, setReady] = useState(false),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(''),
    [attempt, setAttempt] = useState(0),
    [file, setFile] = useState<{ file: File; slot: ImageSlot } | null>(null)
  const avatar = useRef<HTMLInputElement>(null),
    banner = useRef<HTMLInputElement>(null)
  useEffect(() => {
    let active = true
    if (!profileImagesEnabled || !client || !who) return
    void ownImages(client)
      .then((v) => {
        if (active) {
          setDraft(v)
          setSaved(v)
          setReady(true)
          setMessage('')
        }
      })
      .catch((e) => {
        if (active) {
          setReady(false)
          setMessage(e.message)
        }
      })
    return () => {
      active = false
    }
  }, [client, who, publicVisible, attempt])
  if (!profileImagesEnabled) return null
  const choose = (candidate: File | undefined, slot: ImageSlot) => {
    if (candidate && !busy) setFile({ file: candidate, slot })
  }
  const patch = (p: Partial<ProfileImages>) => setDraft((v) => ({ ...v, ...p }))
  const save = async () => {
    if (!client || !ready || busy) return
    setBusy(true)
    setMessage('Saving photos…')
    try {
      const v = await saveImages(client, {
        ...draft,
        share_avatar: publicVisible && draft.share_avatar,
        share_banner: publicVisible && draft.share_banner,
      })
      setDraft(v)
      setSaved(v)
      setMessage('Photos saved.')
      void client.functions
        .invoke('media-gateway', {
          body: { action: 'profile-cleanup', prune: true },
        })
        .catch(() => {})
    } catch (e) {
      setMessage((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className="profile-photo-editor" aria-label="Profile photos">
      <div
        className="profile-banner-editor"
        onDragOver={(e) => {
          e.preventDefault()
          e.dataTransfer.dropEffect = 'copy'
        }}
        onDrop={(e) => {
          e.preventDefault()
          choose(e.dataTransfer.files[0], 'banner')
        }}
      >
        <ProfileImage
          asset={draft.banner_asset}
          position={draft.banner_position}
          className="profile-banner-image"
          fallback={
            preset ? (
              <img src={preset} alt="Preset banner" />
            ) : (
              <span className="profile-banner-empty" />
            )
          }
          alt="Your banner preview"
        />
        <button
          type="button"
          className="profile-photo-action"
          disabled={!ready || busy}
          onClick={() => banner.current?.click()}
        >
          <ImagePlus size={15} />
          {draft.banner_asset ? 'Change banner' : 'Add banner'}
        </button>
      </div>
      <div className="profile-photo-identity">
        <button
          type="button"
          className="profile-avatar-editor"
          aria-label="Change profile photo"
          disabled={!ready || busy}
          onClick={() => avatar.current?.click()}
        >
          <ProfileImage
            asset={draft.avatar_asset}
            fallback={fallback}
            alt="Your avatar preview"
          />
          <span className="profile-camera">
            <Camera size={17} />
          </span>
        </button>
        <div className="profile-photo-actions">
          <button
            type="button"
            className="text-button"
            disabled={!ready || busy}
            onClick={() => avatar.current?.click()}
          >
            Change photo
          </button>
          {draft.avatar_asset && (
            <button
              type="button"
              className="text-button"
              disabled={busy}
              onClick={() => patch({ avatar_asset: null, share_avatar: false })}
            >
              Remove photo · use icon
            </button>
          )}
        </div>
      </div>
      <input
        ref={avatar}
        hidden
        type="file"
        aria-label="Upload profile photo"
        accept="image/jpeg,image/png,image/webp"
        onChange={(e) => {
          choose(e.target.files?.[0], 'avatar')
          e.target.value = ''
        }}
      />
      <input
        ref={banner}
        hidden
        type="file"
        aria-label="Upload profile banner"
        accept="image/jpeg,image/png,image/webp"
        onChange={(e) => {
          choose(e.target.files?.[0], 'banner')
          e.target.value = ''
        }}
      />
      {draft.banner_asset && (
        <div className="profile-banner-adjustments">
          <label>
            Banner position
            <input
              type="range"
              min="0"
              max="100"
              value={draft.banner_position}
              disabled={busy}
              onChange={(e) =>
                patch({ banner_position: Number(e.target.value) })
              }
            />
          </label>
          <button
            type="button"
            className="text-button"
            disabled={busy}
            onClick={() => patch({ banner_asset: null, share_banner: false })}
          >
            {preset ? 'Restore preset' : 'Remove banner'}
          </button>
        </div>
      )}
      <fieldset disabled={busy || !ready} className="profile-photo-consent">
        {draft.avatar_asset && (
          <label>
            <input
              type="checkbox"
              disabled={!publicVisible}
              checked={publicVisible && draft.share_avatar}
              onChange={(e) => patch({ share_avatar: e.target.checked })}
            />
            Show this photo on my public profile and bylines
          </label>
        )}
        {draft.banner_asset && (
          <label>
            <input
              type="checkbox"
              disabled={!publicVisible}
              checked={publicVisible && draft.share_banner}
              onChange={(e) => patch({ share_banner: e.target.checked })}
            />
            Show this banner on my public profile
          </label>
        )}
        {!publicVisible && (draft.avatar_asset || draft.banner_asset) && (
          <small>
            Your uploads stay private. Enable your public profile below before
            sharing photos.
          </small>
        )}
      </fieldset>
      <div className="row profile-photo-save">
        <button
          type="button"
          className="button secondary small"
          disabled={
            !ready || busy || JSON.stringify(draft) === JSON.stringify(saved)
          }
          onClick={() => void save()}
        >
          {busy ? 'Saving…' : 'Save photos'}
        </button>
        <button
          type="button"
          className="text-button"
          disabled={busy || !ready}
          onClick={() => {
            setDraft(saved)
            setMessage('')
          }}
        >
          Cancel photo edits
        </button>
        {!ready && (
          <button
            type="button"
            className="text-button"
            onClick={() => setAttempt((n) => n + 1)}
          >
            Retry photos
          </button>
        )}
      </div>
      {message && <p role="status">{message}</p>}
      {file && (
        <ImageCropDialog
          file={file.file}
          slot={file.slot}
          onClose={() => setFile(null)}
          onUse={async (blob) => {
            if (!client) throw Error('Sign in again before uploading')
            const id = await uploadProfileImage(client, file.slot, blob)
            patch(
              file.slot === 'avatar'
                ? { avatar_asset: id, share_avatar: false }
                : {
                    banner_asset: id,
                    share_banner: false,
                    banner_position: 50,
                  },
            )
            setFile(null)
          }}
        />
      )}
    </section>
  )
}
