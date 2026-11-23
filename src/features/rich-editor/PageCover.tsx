import { MediaImage } from '../media/MediaImage'
import { useState } from 'react'
import { photographicCovers } from './covers'
import type { WritingDocument } from './document'
export function PageCover({
  document,
  preset,
  className = '',
  privateMedia = false,
  fallback,
  size = 'full',
  priority = false,
}: {
  document?: WritingDocument | null
  preset?: string | null
  className?: string
  privateMedia?: boolean
  fallback?: React.ReactNode
  size?: 'full' | 'thumbnail'
  priority?: boolean
}) {
  const [failed, setFailed] = useState<string | null>(null)
  if (document?.page?.cover === 'upload')
    return (
      <div className={`writer-cover photo-cover ${className}`}>
        <MediaImage
          assetId={privateMedia ? document.page.assetId : undefined}
          publicId={document.page.publicId}
          alt=""
          fallback={fallback}
          position={document.page.position}
        />
      </div>
    )
  const photo = photographicCovers.find((c) => c.id === document?.page?.cover)
  const source = size === 'thumbnail' ? photo?.thumbnail : photo?.src
  if (source && failed === source) return <>{fallback ?? null}</>
  if (photo)
    return (
      <div className={`writer-cover photo-cover ${className}`}>
        <img
          src={source}
          alt={photo.name}
          style={{ objectPosition: `50% ${document?.page?.position ?? 50}%` }}
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : undefined}
          decoding="async"
          onError={() => setFailed(source ?? null)}
        />
      </div>
    )
  if (!preset || preset === 'none') return <>{fallback ?? null}</>
  return (
    <div
      className={`writer-cover ${className}`}
      data-cover={preset}
      role="img"
      aria-label={`${preset} cover`}
    />
  )
}
