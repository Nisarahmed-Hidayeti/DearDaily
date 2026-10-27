export const themes = [
  {
    id: 'midnight-purple',
    name: 'Midnight Purple',
    description: 'A quiet night, softened with violet.',
    mood: 'Atmospheric · Original',
  },
  {
    id: 'forest-green',
    name: 'Forest Green',
    description: 'Deep woodland shades. A little room to breathe.',
    mood: 'Grounded · Restful',
  },
  {
    id: 'paper-white',
    name: 'Paper White',
    description: 'Warm paper, dark ink, and an open morning.',
    mood: 'Light · Editorial',
  },
  {
    id: 'obsidian-black',
    name: 'Obsidian Black',
    description: 'Pure black with a restrained silver glow.',
    mood: 'Minimal · Focused',
  },
] as const
export type ThemeId = (typeof themes)[number]['id']
export const defaultTheme: ThemeId = 'midnight-purple'
export function isThemeId(value: unknown): value is ThemeId {
  return themes.some((theme) => theme.id === value)
}
