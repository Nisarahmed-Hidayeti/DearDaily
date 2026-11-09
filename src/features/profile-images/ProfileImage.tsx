import { useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import {
  ownImages,
  privateProfileImage,
  publicImages,
  publicProfileImage,
  profileImagesEnabled,
  type PublicImages,
} from './api'
import { avatars } from '../community/communityApi'
import './profile-images.css'
export function ProfileImage({
  asset,
  publicId,
  fallback,
  alt,
  position = 50,
  className = '',
}: {
  asset?: string | null
  publicId?: string | null
  fallback: React.ReactNode
  alt: string
  position?: number
  className?: string
}) {
  const { client, session } = useAuth(),
    who = session?.user.id
  const [resolved, setResolved] = useState<{
      id: string
      who: string
      url: string
    } | null>(null),
    [failed, setFailed] = useState<string | null>(null),
    [visibleSource, setVisibleSource] = useState<string | null>(null)
  useEffect(() => {
    let active = true
    if (!profileImagesEnabled || !asset || !client || !who) return
    void privateProfileImage(client, asset)
      .then((url) => {
        if (active) setResolved({ id: asset, who, url })
      })
      .catch(() => {
        if (active) setFailed(asset)
      })
    return () => {
      active = false
    }
  }, [asset, client, who])
  const source = profileImagesEnabled
    ? publicId
      ? publicProfileImage(publicId)
      : resolved && resolved.who === who && resolved.id === asset
        ? resolved.url
        : null
    : null
  return (
    <span className={`profile-image ${className}`}>
      {fallback}
      {source && failed !== (publicId ?? asset) && (
        <img
          src={source}
          alt={alt}
          decoding="async"
          referrerPolicy="no-referrer"
          style={{
            objectPosition: `50% ${position}%`,
            opacity: visibleSource === source ? 1 : 0,
          }}
          onLoad={() => setVisibleSource(source)}
          onError={() => setFailed(publicId ?? asset ?? null)}
        />
      )}
    </span>
  )
}
export function OwnProfileAvatar({ fallback }: { fallback: React.ReactNode }) {
  const { client, session } = useAuth(),
    who = session?.user.id
  const [state, setState] = useState<{
    who: string
    asset: string | null
    icon?: string
  } | null>(null)
  useEffect(() => {
    let active = true
    const load = () => {
      if (profileImagesEnabled && client && who)
        void Promise.all([ownImages(client), client.rpc('my_public_profile')])
          .then(([v, p]) => {
            if (active)
              setState({
                who,
                asset: v.avatar_asset,
                icon: avatars[p.data?.avatar],
              })
          })
          .catch(() => {})
    }
    load()
    window.addEventListener('deardaily:profile-images', load)
    return () => {
      active = false
      window.removeEventListener('deardaily:profile-images', load)
    }
  }, [client, who])
  return (
    <ProfileImage
      asset={state && state.who === who ? state.asset : null}
      fallback={(state?.who === who && state?.icon) || fallback}
      alt="Your profile photo"
    />
  )
}
export function usePublicImages(username?: string | null) {
  const { client } = useAuth(),
    [state, setState] = useState<{
      handle: string
      images: PublicImages | null
    } | null>(null)
  useEffect(() => {
    let active = true
    if (profileImagesEnabled && client && username)
      void publicImages(client, username)
        .then((images) => {
          if (active) setState({ handle: username, images })
        })
        .catch(() => {})
    return () => {
      active = false
    }
  }, [client, username])
  return state?.handle === username ? state?.images : null
}
