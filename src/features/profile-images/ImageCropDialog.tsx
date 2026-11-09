import { useEffect, useRef, useState } from 'react'
import { Modal } from '../../components/Shared'
import {
  validateImageInput,
  validateImageDimensions,
} from '../media/imageSafety'
import { cropRect, type Crop } from './crop'
import type { ImageSlot } from './api'
import './profile-images.css'
export function ImageCropDialog({
  file,
  slot,
  onClose,
  onUse,
}: {
  file: File
  slot: ImageSlot
  onClose: () => void
  onUse: (blob: Blob) => Promise<void>
}) {
  const canvas = useRef<HTMLCanvasElement>(null),
    [bitmap, setBitmap] = useState<ImageBitmap | null>(null),
    [crop, setCrop] = useState<Crop>({ zoom: 1, x: 50, y: 50 }),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('')
  useEffect(() => {
    let active = true,
      image: ImageBitmap | null = null
    void (async () => {
      validateImageInput(
        file,
        new Uint8Array(await file.slice(0, 16).arrayBuffer()),
        0,
      )
      image = await createImageBitmap(file)
      validateImageDimensions(image.width, image.height)
      if (active) setBitmap(image)
      else image.close()
    })().catch(() => {
      if (active)
        setError('Choose a JPEG, PNG or WebP under 5 MiB and 24 megapixels.')
    })
    return () => {
      active = false
      image?.close()
    }
  }, [file])
  useEffect(() => {
    const node = canvas.current,
      ctx = node?.getContext('2d')
    if (!node || !ctx || !bitmap) return
    const r = cropRect(
      bitmap.width,
      bitmap.height,
      slot === 'avatar' ? 1 : 2.5,
      crop,
    )
    ctx.clearRect(0, 0, node.width, node.height)
    ctx.drawImage(
      bitmap,
      r.x,
      r.y,
      r.width,
      r.height,
      0,
      0,
      node.width,
      node.height,
    )
  }, [bitmap, crop, slot])
  const handleUsePhoto = async () => {
    if (!bitmap || !canvas.current || busy) return
    setBusy(true)
    setError('')
    try {
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.current!.toBlob(
          (b) => (b ? resolve(b) : reject(Error('Could not prepare photo'))),
          'image/webp',
          0.88,
        ),
      )
      await onUse(blob)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal
      title={slot === 'avatar' ? 'Your profile photo' : 'Your banner'}
      className="profile-crop-dialog"
      onClose={() => {
        if (!busy) onClose()
      }}
    >
      <canvas
        ref={canvas}
        width={slot === 'avatar' ? 512 : 1600}
        height={slot === 'avatar' ? 512 : 640}
        className={`profile-crop-canvas ${slot}`}
        aria-label={`${slot} crop preview`}
      />
      <fieldset disabled={busy || !bitmap} className="profile-crop-sliders">
        <label>
          Zoom
          <input
            type="range"
            min="1"
            max="3"
            step="0.02"
            value={crop.zoom}
            onChange={(e) =>
              setCrop((c) => ({ ...c, zoom: Number(e.target.value) }))
            }
          />
        </label>
        <label>
          Horizontal position
          <input
            type="range"
            min="0"
            max="100"
            value={crop.x}
            onChange={(e) =>
              setCrop((c) => ({ ...c, x: Number(e.target.value) }))
            }
          />
        </label>
        <label>
          Vertical position
          <input
            type="range"
            min="0"
            max="100"
            value={crop.y}
            onChange={(e) =>
              setCrop((c) => ({ ...c, y: Number(e.target.value) }))
            }
          />
        </label>
      </fieldset>
      {error && <p role="alert">{error}</p>}
      {busy && <p role="status">Preparing and uploading…</p>}
      <div className="row">
        <button
          className="button"
          disabled={!bitmap || busy}
          onClick={() => void handleUsePhoto()}
        >
          {busy ? 'Uploading…' : 'Use photo'}
        </button>
        <button className="button secondary" disabled={busy} onClick={onClose}>
          Cancel
        </button>
      </div>
    </Modal>
  )
}
