/** Enable only after the additive studio migration and hosted checks pass. */
export const studioPolishEnabled =
  import.meta.env.VITE_ENABLE_STUDIO_POLISH === 'true'
export const writingFonts = [
  ['serif', 'Editorial serif'],
  ['sans', 'Modern sans'],
  ['literary', 'Literary serif'],
  ['humanist', 'Humanist sans'],
  ['mono', 'Monospace'],
] as const
