export const appearanceEnabled =
  import.meta.env.VITE_ENABLE_RENAISSANCE_DATA === 'true'
export interface Appearance {
  accent: string | null
  background: string | null
  surface: 'default' | 'soft' | 'flat'
  font: 'sans' | 'serif'
  size: 16 | 18 | 20
  width: 'narrow' | 'standard' | 'wide'
  spacing: 'comfortable' | 'compact'
  texture: 'none' | 'paper'
}
export const defaultAppearance: Appearance = {
  accent: null,
  background: null,
  surface: 'default',
  font: 'sans',
  size: 18,
  width: 'standard',
  spacing: 'comfortable',
  texture: 'none',
}
const hex = (v: unknown) =>
  v === null || (typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v))
export function validateAppearance(value: unknown): Appearance {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw Error('Invalid appearance')
  if (Object.keys(value).some((k) => !Object.hasOwn(defaultAppearance, k)))
    throw Error('Unsupported appearance field')
  const v = { ...defaultAppearance, ...value } as Appearance
  if (
    !hex(v.accent) ||
    !hex(v.background) ||
    !['default', 'soft', 'flat'].includes(v.surface) ||
    !['sans', 'serif'].includes(v.font) ||
    ![16, 18, 20].includes(v.size) ||
    !['narrow', 'standard', 'wide'].includes(v.width) ||
    !['comfortable', 'compact'].includes(v.spacing) ||
    !['none', 'paper'].includes(v.texture)
  )
    throw Error('Unsupported appearance value')
  return v
}
function rgb(color: string) {
  return [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16))
}
export function luminance(color: string) {
  return rgb(color)
    .map((n) => {
      const v = n / 255
      return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
    })
    .reduce((n, v, i) => n + v * [0.2126, 0.7152, 0.0722][i], 0)
}
export function contrast(a: string, b: string) {
  const x = luminance(a),
    y = luminance(b)
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}
const blend = (a: string, b: string, weight: number) =>
  '#' +
  rgb(a)
    .map((v, i) =>
      Math.round(v * (1 - weight) + rgb(b)[i] * weight)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')
export const themeBackgrounds = {
  'midnight-purple': '#090a12',
  'forest-green': '#09120f',
  'paper-white': '#faf8f3',
  'obsidian-black': '#050505',
}
export function appearanceTokens(
  input: Appearance,
  baseBackground = '#11121a',
): Record<string, string> {
  const p = validateAppearance(input),
    tokens: Record<string, string> = {}
  const bg = p.background ?? baseBackground
  const foreground =
    contrast(bg, '#ffffff') >= contrast(bg, '#000000') ? '#ffffff' : '#000000'
  if (p.background) {
    const fg =
      contrast(p.background, '#ffffff') >= contrast(p.background, '#000000')
        ? '#ffffff'
        : '#000000'
    tokens['--bg'] = p.background
    tokens['--text'] = fg
    tokens['--muted'] = blend(p.background, fg, 0.82)
    tokens['--surface'] = blend(
      p.background,
      fg === '#ffffff' ? '#000000' : '#ffffff',
      p.surface === 'flat' ? 0.035 : p.surface === 'soft' ? 0.11 : 0.07,
    )
    tokens['--elevated'] = blend(
      p.background,
      fg === '#ffffff' ? '#000000' : '#ffffff',
      0.045,
    )
    tokens['--sidebar'] = blend(
      p.background,
      fg === '#ffffff' ? '#000000' : '#ffffff',
      0.025,
    )
    tokens['--surface-hover'] = blend(
      p.background,
      fg === '#ffffff' ? '#000000' : '#ffffff',
      0.12,
    )
    tokens['--border'] = blend(p.background, fg, 0.2)
    tokens['--border-strong'] = blend(p.background, fg, 0.4)
  }
  if (p.accent) {
    let accent = p.accent
    for (let i = 0; i < 32 && contrast(accent, bg) < 4.5; i++)
      accent = blend(accent, foreground, 0.2)
    tokens['--accent'] = accent
    tokens['--emphasis'] = accent
    tokens['--accent-soft'] = blend(bg, accent, 0.12)
    tokens['--button-start'] = tokens['--accent']
    tokens['--button-end'] = tokens['--accent']
    tokens['--button-hover'] = tokens['--accent']
    tokens['--on-accent'] =
      contrast(tokens['--accent'], '#ffffff') >=
      contrast(tokens['--accent'], '#000000')
        ? '#ffffff'
        : '#000000'
    tokens['--focus'] = tokens['--text'] ?? 'var(--text)'
  }
  tokens['--reading-size'] = p.size + 'px'
  tokens['--reading-leading'] = p.spacing === 'compact' ? '1.55' : '1.8'
  return tokens
}
