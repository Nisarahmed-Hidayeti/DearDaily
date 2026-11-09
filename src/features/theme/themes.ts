import { studioPolishEnabled } from '../rich-editor/studioPolish'
const allThemes = [
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
  {
    id: 'warm-sepia',
    name: 'Warm Sepia',
    description: 'Linen, ink and a late afternoon.',
    mood: 'Warm · Literary',
  },
  {
    id: 'deep-ocean',
    name: 'Deep Ocean',
    description: 'A still sea under a quiet sky.',
    mood: 'Cool · Spacious',
  },
] as const
export const themes = studioPolishEnabled ? allThemes : allThemes.slice(0, 4)
export type ThemeId = (typeof allThemes)[number]['id']
export const defaultTheme: ThemeId = 'midnight-purple'
export function isThemeId(value: unknown): value is ThemeId {
  return allThemes.some((theme) => theme.id === value)
}
