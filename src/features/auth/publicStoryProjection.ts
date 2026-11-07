// Independent security allowlist. Do not derive it from the production SELECT.
export function approvedPublicProjection(
  story: object,
  richWriting: boolean,
  community: boolean,
): boolean {
  const fields = ['id', 'title', 'body', 'published_at']
  if (richWriting) fields.push('writing_document', 'page_icon', 'cover_preset')
  if (community)
    fields.push('public_username', 'public_category', 'public_tags')
  return Object.keys(story).sort().join(',') === fields.sort().join(',')
}
