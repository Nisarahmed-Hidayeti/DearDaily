-- ADDITIVE. Local review only until the owner approves deardaily-dev application.
create function public.valid_journal_appearance(value jsonb) returns boolean
language sql immutable set search_path='' as $$
 select case when jsonb_typeof(value)<>'object' then false else
 octet_length(value::text)<=2048
 and not exists(select 1 from jsonb_object_keys(value) k where k not in ('accent','background','surface','font','size','width','spacing','texture'))
 and (not value?'accent' or value->'accent'='null'::jsonb or (jsonb_typeof(value->'accent')='string' and value->>'accent' ~ '^#[0-9a-fA-F]{6}$'))
 and (not value?'background' or value->'background'='null'::jsonb or (jsonb_typeof(value->'background')='string' and value->>'background' ~ '^#[0-9a-fA-F]{6}$'))
 and (not value?'surface' or value->>'surface' in ('default','soft','flat'))
 and (not value?'font' or value->>'font' in ('sans','serif'))
 and (not value?'size' or (jsonb_typeof(value->'size')='number' and value->>'size' in ('16','18','20')))
 and (not value?'width' or value->>'width' in ('narrow','standard','wide'))
 and (not value?'spacing' or value->>'spacing' in ('comfortable','compact'))
 and (not value?'texture' or value->>'texture' in ('none','paper')) end;
$$;
revoke all on function public.valid_journal_appearance(jsonb) from public,anon,authenticated;
grant execute on function public.valid_journal_appearance(jsonb) to authenticated;
alter table public.user_settings add column appearance jsonb not null default '{}'::jsonb
 constraint settings_appearance_valid check(coalesce(public.valid_journal_appearance(appearance),false));
grant insert(appearance),update(appearance) on public.user_settings to authenticated;
-- Existing owner-only forced RLS and server timestamp triggers are preserved.
alter table public.public_profiles add column cover_id text default null
 check(cover_id is null or cover_id in ('forest-light','pacific-dusk','cafe-memory'));
grant select(cover_id) on public.public_profiles to anon,authenticated;
grant insert(cover_id),update(cover_id) on public.public_profiles to authenticated;
create or replace function public.my_public_profile() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('username',username,'display_name',display_name,'bio',bio,'avatar',avatar,'visible',visible,'joined_month',joined_month,'cover_id',cover_id)
 from public.public_profiles where user_id=auth.uid() and auth.uid() is not null;
$$;
revoke all on function public.my_public_profile() from public,anon,authenticated;
grant execute on function public.my_public_profile() to authenticated;
