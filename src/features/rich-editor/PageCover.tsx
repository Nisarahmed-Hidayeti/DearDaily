import { MediaImage } from '../media/MediaImage'
import { photographicCovers } from './covers'
import type { WritingDocument } from './document'
export function PageCover({
  document,
  preset,
  className = '',
  privateMedia = false,
}: {
  document?: WritingDocument | null
  preset?: string | null
  className?: string
  privateMedia?: boolean
}) {
  if (document?.page?.cover === 'upload')
    return (
      <div className={`writer-cover photo-cover ${className}`}>
        <MediaImage
          assetId={privateMedia ? document.page.assetId : undefined}
          publicId={document.page.publicId}
          alt="Selected page cover"
          position={document.page.position}
        />
      </div>
    )
  const photo = photographicCovers.find((c) => c.id === document?.page?.cover)
  if (photo)
    return (
      <div className={`writer-cover photo-cover ${className}`}>
        <img
          src={photo.src}
          alt={photo.name}
          style={{ objectPosition: `50% ${document?.page?.position ?? 50}%` }}
          loading="lazy"
          decoding="async"
        />
      </div>
    )
  if (!preset || preset === 'none') return null
  return (
    <div
      className={`writer-cover ${className}`}
      data-cover={preset}
      role="img"
      aria-label={`${preset} cover`}
    />
  )
}
