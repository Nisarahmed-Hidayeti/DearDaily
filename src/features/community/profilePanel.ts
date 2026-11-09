export interface ProfilePanel {
  show_count: boolean
  interests: string[]
  link: string | null
}
export const emptyProfilePanel: ProfilePanel = {
  show_count: false,
  interests: [],
  link: null,
}
export function validateProfilePanel(value: unknown): ProfilePanel {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw Error('Invalid public profile details')
  const p = value as Partial<ProfilePanel>
  if (
    Object.keys(p).some(
      (k) => !['show_count', 'interests', 'link'].includes(k),
    ) ||
    (p.show_count !== undefined && typeof p.show_count !== 'boolean') ||
    (p.interests !== undefined &&
      (!Array.isArray(p.interests) ||
        p.interests.length > 6 ||
        p.interests.some(
          (i) =>
            typeof i !== 'string' ||
            i.length > 40 ||
            /[<>]/.test(i) ||
            [...i].some((c) => c.charCodeAt(0) < 32),
        )))
  )
    throw Error('Invalid public profile details')
  if (p.link !== undefined && p.link !== null) {
    if (typeof p.link !== 'string' || p.link.length > 300)
      throw Error('Use a short HTTPS link')
    const u = new URL(p.link)
    if (
      u.protocol !== 'https:' ||
      u.username ||
      u.password ||
      !u.hostname ||
      /[<>\s]/.test(p.link)
    )
      throw Error('Use an HTTPS link without credentials')
  }
  return {
    show_count: p.show_count ?? false,
    interests: p.interests ?? [],
    link: p.link ?? null,
  }
}
