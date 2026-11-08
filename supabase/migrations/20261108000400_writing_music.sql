-- Additive only. Music stores provider IDs, never HTML, URLs, tokens or audio.
alter table public.journal_entries add column music jsonb;
alter table public.public_stories add column music jsonb;
alter table public.journal_entries add constraint private_music_shape check (
 music is null or coalesce(jsonb_typeof(music)='object'
 and music - array['provider','kind','id','share'] = '{}'::jsonb
 and music->>'provider'='spotify'
 and music->>'kind' in ('track','album','playlist')
 and jsonb_typeof(music->'id')='string'
 and music->>'id' ~ '^[A-Za-z0-9]{22}$'
 and jsonb_typeof(music->'share')='boolean',false));
alter table public.public_stories add constraint public_music_shape check (
 music is null or coalesce(jsonb_typeof(music)='object'
 and music - array['provider','kind','id'] = '{}'::jsonb
 and music->>'provider'='spotify'
 and music->>'kind' in ('track','album','playlist')
 and jsonb_typeof(music->'id')='string'
 and music->>'id' ~ '^[A-Za-z0-9]{22}$',false));
grant select(music),insert(music),update(music) on public.journal_entries to authenticated;
grant select(music) on public.public_stories to anon,authenticated;
grant insert(music),update(music) on public.public_stories to authenticated;
-- Publication requires the source's explicitly approved music, even through raw API calls.
create function deardaily_private.enforce_music_publication() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.music is not null and not exists (
  select 1 from public.journal_entries e where e.id=new.id and e.user_id=auth.uid()
  and e.music->'share'='true'::jsonb and e.music-'share'=new.music
 ) then raise exception 'Music publication requires explicit source approval' using errcode='23514';end if;
 return new;
end;$$;
revoke all on function deardaily_private.enforce_music_publication() from public,anon,authenticated;
create trigger enforce_music_publication before insert or update of music on public.public_stories
for each row execute function deardaily_private.enforce_music_publication();
