-- Let profile owners choose whether their published story list starts collapsed.
-- The preference is public profile presentation metadata; row visibility and story
-- access remain governed by the existing profile policies.
alter table public.public_profiles
  add column stories_collapsed boolean not null default false;

grant select(stories_collapsed)
  on public.public_profiles to anon, authenticated;
grant insert(stories_collapsed), update(stories_collapsed)
  on public.public_profiles to authenticated;
