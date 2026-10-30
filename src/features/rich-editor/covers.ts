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
  {
    id: 'quiet-lake',
    name: 'Still water, open sky',
    collection: 'Quiet nature',
    src: '/covers/quiet-lake.jpg',
    credit: 'Quentin Martinez',
    source:
      'https://www.pexels.com/photo/scenic-reflection-of-mountains-on-a-calm-lake-30127830/',
  },
  {
    id: 'golden-hour',
    name: 'Fields of gold',
    collection: 'Seasons',
    src: '/covers/golden-hour.jpg',
    credit: 'Meriç Tuna',
    source:
      'https://www.pexels.com/photo/golden-wheat-field-at-sunset-30556704/',
  },
  {
    id: 'soft-blossoms',
    name: 'A softer spring',
    collection: 'Seasons',
    src: '/covers/soft-blossoms.jpg',
    credit: 'Elina Volkova',
    source:
      'https://www.pexels.com/photo/close-up-of-a-cherry-tree-blossom-12056606/',
  },
  {
    id: 'city-after-dark',
    name: 'When the city quiets',
    collection: 'After dark',
    src: '/covers/city-after-dark.jpg',
    credit: 'Simon Robben',
    source: 'https://www.pexels.com/photo/street-night-204366/',
  },
  {
    id: 'star-road',
    name: 'A road full of stars',
    collection: 'After dark',
    src: '/covers/star-road.jpg',
    credit: 'Simon Steiner',
    source:
      'https://www.pexels.com/photo/starry-milky-way-over-desert-road-nightscape-28737270/',
  },
  {
    id: 'misty-reflection',
    name: 'Between mist and water',
    collection: 'Quiet nature',
    src: '/covers/misty-reflection.jpg',
    credit: 'Ray Bilcliff',
    source:
      'https://www.pexels.com/photo/mountains-reflection-in-lake-5748392/',
  },
] as const
export type PhotoCoverId = (typeof photographicCovers)[number]['id']
export function isPhotoCover(value: unknown): value is PhotoCoverId {
  return photographicCovers.some((c) => c.id === value)
}

// Profile banners retain their existing hosted allowlist; this gallery expansion is for documents.
export const profileCovers = photographicCovers.filter((c) =>
  ['forest-light', 'pacific-dusk', 'cafe-memory'].includes(c.id),
)
