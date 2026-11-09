import { useEffect, useState } from 'react'
import { ImageCropDialog } from './ImageCropDialog'
import type { ImageSlot } from './api'
// DEV-only real canvas interaction preview. No hosted writes or simulated cloud success.
export default function ProfilePhotoWorkshop() {
  const [file, setFile] = useState<{ file: File; slot: ImageSlot } | null>(
      null,
    ),
    [preview, setPreview] = useState<{ url: string; slot: ImageSlot } | null>(
      null,
    )
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview.url)
    },
    [preview],
  )
  return (
    <div className="page">
      <h1>Profile photo workshop</h1>
      <p>Device-local crop preview. Nothing is uploaded or saved.</p>
      {(['avatar', 'banner'] as const).map((slot) => (
        <label key={slot}>
          {slot === 'avatar' ? 'Avatar image' : 'Banner image'}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => {
              const chosen = e.target.files?.[0]
              if (chosen) setFile({ file: chosen, slot })
              e.target.value = ''
            }}
          />
        </label>
      ))}
      {preview && (
        <img
          src={preview.url}
          alt="Processed crop preview"
          style={{
            display: 'block',
            width: preview.slot === 'avatar' ? 200 : '100%',
            maxWidth: 800,
            aspectRatio: preview.slot === 'avatar' ? 1 : 2.5,
            objectFit: 'cover',
            borderRadius: preview.slot === 'avatar' ? '50%' : 12,
            margin: '24px 0',
          }}
        />
      )}
      {file && (
        <ImageCropDialog
          file={file.file}
          slot={file.slot}
          onClose={() => setFile(null)}
          onUse={async (blob) => {
            setPreview({ url: URL.createObjectURL(blob), slot: file.slot })
            setFile(null)
          }}
        />
      )}
    </div>
  )
}
