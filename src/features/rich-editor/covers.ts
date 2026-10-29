export const photographicCovers = [
  {
    id: 'forest-light',
    name: 'Light through the trees',
    collection: 'Quiet nature',
    src: '/covers/forest-light.jpg',
    credit: 'ClickerHappy',
    source: 'https://www.pexels.com/photo/forest-240040/',
  },
  {
    id: 'pacific-dusk',
    name: 'Pacific, after the rain',
    collection: 'Quiet nature',
    src: '/covers/pacific-dusk.jpg',
    credit: 'Julian Bracero',
    source: 'https://www.pexels.com/photo/photo-of-ocean-waves-12491774/',
  },
  {
    id: 'cafe-memory',
    name: 'A window seat',
    collection: 'Everyday memories',
    src: '/covers/cafe-memory.jpg',
    credit: 'Esra Afşar',
    source:
      'https://www.pexels.com/photo/cozy-cafe-window-with-books-and-coffee-33800703/',
  },
] as const
export type PhotoCoverId = (typeof photographicCovers)[number]['id']
export function isPhotoCover(value: unknown): value is PhotoCoverId {
  return photographicCovers.some((c) => c.id === value)
}
