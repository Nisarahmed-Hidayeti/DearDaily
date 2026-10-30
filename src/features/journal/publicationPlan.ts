/** Private editor preferences, never part of a public document snapshot. */
export const publicCategories = [
  'Uncategorized',
  'Personal',
  'Gratitude',
  'Growth',
  'Travel',
] as const
export interface PublicationPlan {
  category: string
  tags: string
  byline: boolean
}
export const defaultPublicationPlan: PublicationPlan = {
  category: 'Uncategorized',
  tags: '',
  byline: false,
}
export function validatePublicationPlan(input: unknown): PublicationPlan {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw Error('Invalid public-copy preferences')
  const p = input as PublicationPlan
  if (
    Object.keys(p).some((k) => !['category', 'tags', 'byline'].includes(k)) ||
    !publicCategories.some((c) => c === p.category) ||
    typeof p.tags !== 'string' ||
    p.tags.length > 154 ||
    typeof p.byline !== 'boolean'
  )
    throw Error('Invalid public-copy preferences')
  return { category: p.category, tags: p.tags, byline: p.byline }
}
export function publicationTags(value: string) {
  const tags = [
    ...new Set(
      value
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    ),
  ]
  if (tags.length > 5 || tags.some((t) => t.length > 30))
    throw Error('Choose up to five public tags, each under 31 characters.')
  return tags
}
