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
}: {
  document?: WritingDocument | null
  preset?: string | null
  className?: string
  privateMedia?: boolean
  fallback?: React.ReactNode
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
  if (photo) if (failed === photo.src) return <>{fallback ?? null}</>
  if (photo)
    return (
      <div className={`writer-cover photo-cover ${className}`}>
        <img
          src={photo.src}
          alt={photo.name}
          style={{ objectPosition: `50% ${document?.page?.position ?? 50}%` }}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(photo.src)}
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
