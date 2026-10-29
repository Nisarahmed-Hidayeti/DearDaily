import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { authConfig } from '../../lib/supabase/client'
import { isMediaId, mediaEnabled, privatePhotoUrl } from './mediaApi'
export function MediaImage({
  assetId,
  publicId,
  alt,
  position,
}: {
  assetId?: string
  publicId?: string
  alt: string
  position?: number
}) {
  const { client, session } = useAuth(),
    who = session?.user.id
  const [loaded, setLoaded] = useState<{
      who: string
      asset: string
      url: string
    } | null>(null),
    [error, setError] = useState(false),
    [retry, setRetry] = useState(0)
  useEffect(() => {
    let active = true
    if (!assetId || !client || !who || !mediaEnabled) return
    void privatePhotoUrl(client, assetId)
      .then((url) => {
        if (active) {
          setLoaded({ who, asset: assetId, url })
          setError(false)
        }
      })
      .catch(() => {
        if (active) setError(true)
      })
    return () => {
      active = false
    }
  }, [assetId, client, who, retry])
  const source =
    isMediaId(publicId) && mediaEnabled && authConfig
      ? `${authConfig.url}/functions/v1/media-gateway?public=${publicId}`
      : loaded?.who === who && loaded?.asset === assetId
        ? loaded?.url
        : null
  if (!source || error)
    return (
      <span className="media-placeholder" role="status">
        {!mediaEnabled
          ? 'Photo storage awaits approved setup.'
          : error
            ? 'Photo unavailable. Your writing is preserved.'
            : 'Loading private photo…'}
        {mediaEnabled && (
          <button
            type="button"
            onClick={() => {
              setError(false)
              setRetry((n) => n + 1)
            }}
          >
            Retry photo
          </button>
        )}
      </span>
    )
  return (
    <img
      src={source}
      alt={alt}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setError(true)}
      style={
        position !== undefined
          ? { objectPosition: `50% ${position}%` }
          : undefined
      }
    />
  )
}
