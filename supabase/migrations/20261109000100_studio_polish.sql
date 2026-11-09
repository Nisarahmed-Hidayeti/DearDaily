-- Backward-compatible extension: no row updates, RLS or Storage changes.
-- New column grants expose only explicitly entered public-profile details.
-- Roll back the UI flag to disable new selections; retain these expanded constraints to preserve saved data.
create function public.valid_music_excerpt(value jsonb) returns boolean
language plpgsql immutable set search_path='' as $$
begin
 if jsonb_typeof(value) is distinct from 'object' or value-array['start','end'] <> '{}'::jsonb
 or jsonb_typeof(value->'start') is distinct from 'number' or jsonb_typeof(value->'end') is distinct from 'number'
 then return false; end if;
 return value->>'start' ~ '^[0-9]+$' and value->>'end' ~ '^[0-9]+$'
 and (value->>'start')::numeric >= 0 and (value->>'end')::numeric > (value->>'start')::numeric
 and (value->>'end')::numeric <= 86400;
exception when others then return false;
end;$$;
revoke all on function public.valid_music_excerpt(jsonb) from public,anon,authenticated;
grant execute on function public.valid_music_excerpt(jsonb) to authenticated,service_role;
alter table public.journal_entries drop constraint private_music_shape;
alter table public.public_stories drop constraint public_music_shape;
alter table public.journal_entries add constraint private_music_shape check (
 music is null or coalesce(jsonb_typeof(music)='object' and (not music?'excerpt' or public.valid_music_excerpt(music->'excerpt'))
 and music - array['provider','kind','id','share','excerpt'] = '{}'::jsonb
 and music->>'provider'='spotify'
 and music->>'kind' in ('track','album','playlist')
 and jsonb_typeof(music->'id')='string'
 and music->>'id' ~ '^[A-Za-z0-9]{22}$'
 and jsonb_typeof(music->'share')='boolean',false));
alter table public.public_stories add constraint public_music_shape check (
 music is null or coalesce(jsonb_typeof(music)='object' and (not music?'excerpt' or public.valid_music_excerpt(music->'excerpt'))
 and music - array['provider','kind','id','excerpt'] = '{}'::jsonb
 and music->>'provider'='spotify'
 and music->>'kind' in ('track','album','playlist')
 and jsonb_typeof(music->'id')='string'
 and music->>'id' ~ '^[A-Za-z0-9]{22}$',false));
create or replace function public.valid_journal_appearance(value jsonb) returns boolean
language sql immutable set search_path='' as $$
 select case when jsonb_typeof(value)<>'object' then false else
 octet_length(value::text)<=2048
 and not exists(select 1 from jsonb_object_keys(value) k where k not in ('accent','background','surface','font','size','width','spacing','texture'))
 and (not value?'accent' or value->'accent'='null'::jsonb or (jsonb_typeof(value->'accent')='string' and value->>'accent' ~ '^#[0-9a-fA-F]{6}$'))
 and (not value?'background' or value->'background'='null'::jsonb or (jsonb_typeof(value->'background')='string' and value->>'background' ~ '^#[0-9a-fA-F]{6}$'))
 and (not value?'surface' or value->>'surface' in ('default','soft','flat'))
 and (not value?'font' or value->>'font' in ('sans','serif','literary','humanist','mono'))
 and (not value?'size' or (jsonb_typeof(value->'size')='number' and value->>'size' in ('16','18','20')))
 and (not value?'width' or value->>'width' in ('narrow','standard','wide'))
 and (not value?'spacing' or value->>'spacing' in ('comfortable','compact'))
 and (not value?'texture' or value->>'texture' in ('none','paper')) end;
$$;

alter table public.user_settings drop constraint user_settings_theme_id_check;
alter table public.user_settings add constraint user_settings_theme_id_check
 check(theme_id in ('midnight-purple','forest-green','paper-white','obsidian-black','warm-sepia','deep-ocean'));
alter table public.public_stories drop constraint public_stories_public_category_check;
alter table public.public_stories add constraint public_stories_public_category_check
 check(public_category in ('Uncategorized','Personal','Gratitude','Growth','Travel','Work','Study','Family','Friends','Health','Creativity','Dreams','Memories'));

-- Public details are opt-in fields on the existing visible/owner RLS boundary.
create function public.valid_profile_panel(value jsonb) returns boolean
language plpgsql immutable set search_path='' as $$
begin
 if jsonb_typeof(value) is distinct from 'object' or octet_length(value::text)>2048
 or value-array['show_count','interests','link'] <> '{}'::jsonb then return false; end if;
 if value?'show_count' and jsonb_typeof(value->'show_count') is distinct from 'boolean' then return false; end if;
 if value?'interests' then
  if jsonb_typeof(value->'interests') is distinct from 'array' or jsonb_array_length(value->'interests')>6 then return false; end if;
  if exists(select 1 from jsonb_array_elements(value->'interests') e where jsonb_typeof(e)<>'string' or char_length(e#>>'{}')>40 or e#>>'{}' ~ '[<>[:cntrl:]]') then return false; end if;
 end if;
 if value?'link' and value->'link'<>'null'::jsonb then
  if jsonb_typeof(value->'link') is distinct from 'string' or char_length(value->>'link')>300
  or value->>'link' !~ '^https://[^/@[:space:]<>]+([/?#][^[:space:]<>]*)?$' then return false; end if;
 end if;
 return true;
exception when others then return false;
end;$$;
revoke all on function public.valid_profile_panel(jsonb) from public,anon,authenticated;
grant execute on function public.valid_profile_panel(jsonb) to authenticated,service_role;
alter table public.public_profiles add column public_panel jsonb not null default '{}'::jsonb
 constraint public_profile_panel_shape check(public.valid_profile_panel(public_panel));
grant select(public_panel) on public.public_profiles to anon,authenticated;
grant insert(public_panel),update(public_panel) on public.public_profiles to authenticated;
