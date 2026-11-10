-- Extend accepted music selections only; preserve rows, grants, RLS and publication-consent trigger.
-- Recovery: disable VITE_ENABLE_YOUTUBE_MUSIC; retain the widened checks to preserve saved selections.
begin;
alter table public.journal_entries drop constraint private_music_shape;
alter table public.public_stories drop constraint public_music_shape;
alter table public.journal_entries add constraint private_music_shape check (
 music is null or coalesce(jsonb_typeof(music)='object'
 and music - array['provider','kind','id','share','excerpt'] = '{}'::jsonb
 and jsonb_typeof(music->'share')='boolean'
 and jsonb_typeof(music->'id')='string'
 and ((music->>'provider'='spotify' and music->>'kind' in ('track','album','playlist')
       and music->>'id' ~ '^[A-Za-z0-9]{22}$'
       and (not music?'excerpt' or public.valid_music_excerpt(music->'excerpt')))
   or (music->>'provider'='youtube' and music->>'kind'='video'
       and music->>'id' ~ '^[A-Za-z0-9_-]{11}$' and not music?'excerpt')),false));
alter table public.public_stories add constraint public_music_shape check (
 music is null or coalesce(jsonb_typeof(music)='object'
 and music - array['provider','kind','id','excerpt'] = '{}'::jsonb
 and jsonb_typeof(music->'id')='string'
 and ((music->>'provider'='spotify' and music->>'kind' in ('track','album','playlist')
       and music->>'id' ~ '^[A-Za-z0-9]{22}$'
       and (not music?'excerpt' or public.valid_music_excerpt(music->'excerpt')))
   or (music->>'provider'='youtube' and music->>'kind'='video'
       and music->>'id' ~ '^[A-Za-z0-9_-]{11}$' and not music?'excerpt')),false));
commit;
