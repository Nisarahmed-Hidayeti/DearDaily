-- Allow 256 MiB and 500 recordings or copies per account.
-- Limit tracked audio across the project to 640 MiB to leave space for other uploads.
create or replace function public.voice_gateway_record(action text, payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare r jsonb;
begin
 if action='asset' then select to_jsonb(a) into r from deardaily_private.voice_assets a where a.id=(payload->>'id')::uuid;return r;
 elsif action='copy' then select to_jsonb(a) into r from deardaily_private.voice_copies a where a.id=(payload->>'id')::uuid;return r;
 elsif action='ready' then update deardaily_private.voice_assets set ready=true where id=(payload->>'id')::uuid;return '{}'::jsonb;
 elsif action='discard' then delete from deardaily_private.voice_assets where id=(payload->>'id')::uuid;return '{}'::jsonb;
 elsif action='stage' then
  perform pg_catalog.pg_advisory_xact_lock(728410006);
  if not exists(select 1 from deardaily_private.voice_assets a join public.journal_entries e on e.id=a.entry_id where a.id=(payload->>'source_id')::uuid and a.user_id=(payload->>'user_id')::uuid and a.entry_id=(payload->>'entry_id')::uuid and a.ready and e.version=(payload->>'version')::bigint) then raise exception 'Source unavailable';end if;
  if (select count(*) from deardaily_private.voice_copies where user_id=(payload->>'user_id')::uuid)>=500 or (select count(*) from deardaily_private.voice_copies where entry_id=(payload->>'entry_id')::uuid)>=9
   or (select coalesce(sum(bytes),0) from deardaily_private.voice_assets where user_id=(payload->>'user_id')::uuid)+(select coalesce(sum(a.bytes),0) from deardaily_private.voice_copies c join deardaily_private.voice_assets a on a.id=c.source_id where c.user_id=(payload->>'user_id')::uuid)+(select bytes from deardaily_private.voice_assets where id=(payload->>'source_id')::uuid)>268435456
   or (select coalesce(sum(bytes),0) from deardaily_private.voice_assets)+(select coalesce(sum(a.bytes),0) from deardaily_private.voice_copies c join deardaily_private.voice_assets a on a.id=c.source_id)+(select bytes from deardaily_private.voice_assets where id=(payload->>'source_id')::uuid)>671088640 then raise exception 'Voice quota reached';end if;
  insert into deardaily_private.voice_copies(id,source_id,user_id,entry_id,version) values((payload->>'id')::uuid,(payload->>'source_id')::uuid,(payload->>'user_id')::uuid,(payload->>'entry_id')::uuid,(payload->>'version')::bigint);return '{}'::jsonb;
 elsif action='unstage' then delete from deardaily_private.voice_copies where id=(payload->>'id')::uuid;return '{}'::jsonb;
 elsif action='prune' then
  delete from deardaily_private.voice_copies c where c.user_id=(payload->>'user_id')::uuid and not exists(select 1 from public.public_stories s,jsonb_array_elements(s.voice_notes) n where s.id=c.entry_id and n->>'id'=c.id::text) and c.created_at < now()-interval '1 hour';
  delete from deardaily_private.voice_assets a where a.user_id=(payload->>'user_id')::uuid and not exists(select 1 from public.journal_entries e,jsonb_array_elements(e.voice_notes) n where e.id=a.entry_id and n->>'id'=a.id::text) and not exists(select 1 from deardaily_private.voice_copies c where c.source_id=a.id) and a.created_at < now()-interval '1 hour';
  return '{}'::jsonb;
 elsif action='jobs' then select coalesce(jsonb_agg(to_jsonb(j)),'[]') into r from(select * from deardaily_private.voice_gc where user_id=(payload->>'user_id')::uuid order by id limit 50)j;return r;
 elsif action='cleaned' then delete from deardaily_private.voice_gc where id=(payload->>'id')::bigint and user_id=(payload->>'user_id')::uuid;return '{}'::jsonb;
 end if;raise exception 'Unknown voice action';
end;$$;

create or replace function public.reserve_voice_note(entry uuid,media uuid,byte_count integer,seconds numeric) returns uuid language plpgsql security definer set search_path='' as $$
declare who uuid:=auth.uid();
begin
 if who is null then raise exception 'Sign in required';end if;
 perform pg_catalog.pg_advisory_xact_lock(728410006);
 -- Serialize quota allocation per user, then prove ownership of the target entry.
 perform 1 from auth.users where id=who for update;
 perform 1 from public.journal_entries where id=entry and user_id=who for update;
 if not found then raise exception 'Entry unavailable';end if;
 if coalesce(byte_count,0)<46 or coalesce(seconds,0)<=0 then raise exception 'Invalid recording';end if;
 if (select coalesce(sum(bytes),0) from deardaily_private.voice_assets where user_id=who)+(select coalesce(sum(a.bytes),0) from deardaily_private.voice_copies c join deardaily_private.voice_assets a on a.id=c.source_id where c.user_id=who)+byte_count>268435456
 or (select coalesce(sum(bytes),0) from deardaily_private.voice_assets)+(select coalesce(sum(a.bytes),0) from deardaily_private.voice_copies c join deardaily_private.voice_assets a on a.id=c.source_id)+byte_count>671088640 then raise exception 'Voice quota reached';end if;
 if (select count(*) from deardaily_private.voice_assets where user_id=who)>=500 or (select count(*) from deardaily_private.voice_assets where entry_id=entry)>=3 then raise exception 'Voice note quota reached';end if;
 insert into deardaily_private.voice_assets(id,user_id,entry_id,bytes,duration) values(media,who,entry,byte_count,seconds);
 return media;
end;$$;
