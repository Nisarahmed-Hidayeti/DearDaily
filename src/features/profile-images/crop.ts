export interface Crop {
  zoom: number
  x: number
  y: number
}
export function cropRect(
  width: number,
  height: number,
  ratio: number,
  crop: Crop,
) {
  if (
    ![width, height, ratio, crop.zoom, crop.x, crop.y].every(Number.isFinite) ||
    width <= 0 ||
    height <= 0 ||
    ratio <= 0 ||
    crop.zoom < 1 ||
    crop.zoom > 3 ||
    crop.x < 0 ||
    crop.x > 100 ||
    crop.y < 0 ||
    crop.y > 100
  )
    throw Error('Invalid crop')
  const w = Math.min(width, height * ratio) / crop.zoom,
    h = w / ratio
  return {
    x: ((width - w) * crop.x) / 100,
    y: ((height - h) * crop.y) / 100,
    width: w,
    height: h,
  }
}
