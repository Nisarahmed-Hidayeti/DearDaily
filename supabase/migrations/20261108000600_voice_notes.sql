-- Additive, gated audio support. Both buckets stay private; only the verified gateway serves bytes.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('deardaily-voice-private','deardaily-voice-private',false,5760044,array['audio/wav']),
 ('deardaily-voice-public','deardaily-voice-public',false,5760044,array['audio/wav']);
create policy voice_gateway_only on storage.objects as restrictive for all to anon,authenticated
 using (bucket_id not in ('deardaily-voice-private','deardaily-voice-public'))
 with check (bucket_id not in ('deardaily-voice-private','deardaily-voice-public'));
create table deardaily_private.voice_assets (
 id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade,
 entry_id uuid not null references public.journal_entries(id) on delete cascade,
 bytes integer not null check(bytes between 46 and 5760044), duration numeric not null check(duration>0 and duration<=180),
 ready boolean not null default false, created_at timestamptz not null default now()
);
create index voice_assets_owner on deardaily_private.voice_assets(user_id,entry_id);
create table deardaily_private.voice_copies (
 id uuid primary key, source_id uuid not null references deardaily_private.voice_assets(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 entry_id uuid not null references public.journal_entries(id) on delete cascade,
 version bigint not null, created_at timestamptz not null default now()
);
create index voice_copies_owner on deardaily_private.voice_copies(user_id,entry_id);
create index voice_copies_source on deardaily_private.voice_copies(source_id);
create table deardaily_private.voice_gc (
 id bigint generated always as identity primary key, user_id uuid not null,
 bucket text not null check(bucket in ('deardaily-voice-private','deardaily-voice-public')), object_key text not null
);
create index voice_gc_owner on deardaily_private.voice_gc(user_id);
-- No direct table access, including authenticated users. Service gateway must authenticate and check ownership.
alter table deardaily_private.voice_assets enable row level security;
alter table deardaily_private.voice_assets force row level security;
alter table deardaily_private.voice_copies enable row level security;
alter table deardaily_private.voice_copies force row level security;
alter table deardaily_private.voice_gc enable row level security;
alter table deardaily_private.voice_gc force row level security;
revoke all on deardaily_private.voice_assets,deardaily_private.voice_copies,deardaily_private.voice_gc from public,anon,authenticated;
-- Narrow service-only RPC avoids exposing the private schema through PostgREST.
create function public.voice_gateway_record(action text, payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare r jsonb;
begin
 if action='asset' then select to_jsonb(a) into r from deardaily_private.voice_assets a where a.id=(payload->>'id')::uuid;return r;
 elsif action='copy' then select to_jsonb(a) into r from deardaily_private.voice_copies a where a.id=(payload->>'id')::uuid;return r;
 elsif action='ready' then update deardaily_private.voice_assets set ready=true where id=(payload->>'id')::uuid;return '{}'::jsonb;
 elsif action='discard' then delete from deardaily_private.voice_assets where id=(payload->>'id')::uuid;return '{}'::jsonb;
 elsif action='stage' then
  perform pg_catalog.pg_advisory_xact_lock(728410006);
  if not exists(select 1 from deardaily_private.voice_assets a join public.journal_entries e on e.id=a.entry_id where a.id=(payload->>'source_id')::uuid and a.user_id=(payload->>'user_id')::uuid and a.entry_id=(payload->>'entry_id')::uuid and a.ready and e.version=(payload->>'version')::bigint) then raise exception 'Source unavailable';end if;
  if (select count(*) from deardaily_private.voice_copies where user_id=(payload->>'user_id')::uuid)>=30 or (select count(*) from deardaily_private.voice_copies where entry_id=(payload->>'entry_id')::uuid)>=9
   or (select coalesce(sum(bytes),0) from deardaily_private.voice_assets where user_id=(payload->>'user_id')::uuid)+(select coalesce(sum(a.bytes),0) from deardaily_private.voice_copies c join deardaily_private.voice_assets a on a.id=c.source_id where c.user_id=(payload->>'user_id')::uuid)+(select bytes from deardaily_private.voice_assets where id=(payload->>'source_id')::uuid)>20971520
   or (select coalesce(sum(bytes),0) from deardaily_private.voice_assets)+(select coalesce(sum(a.bytes),0) from deardaily_private.voice_copies c join deardaily_private.voice_assets a on a.id=c.source_id)+(select bytes from deardaily_private.voice_assets where id=(payload->>'source_id')::uuid)>134217728 then raise exception 'Voice quota reached';end if;
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
revoke all on function public.voice_gateway_record(text,jsonb) from public,anon,authenticated;
grant execute on function public.voice_gateway_record(text,jsonb) to service_role;
create function public.reserve_voice_note(entry uuid,media uuid,byte_count integer,seconds numeric) returns uuid language plpgsql security definer set search_path='' as $$
declare who uuid:=auth.uid();
begin
 if who is null then raise exception 'Sign in required';end if;
 perform pg_catalog.pg_advisory_xact_lock(728410006);
 -- Serialize quota allocation per user, then prove ownership of the target entry.
 perform 1 from auth.users where id=who for update;
 perform 1 from public.journal_entries where id=entry and user_id=who for update;
 if not found then raise exception 'Entry unavailable';end if;
 if coalesce(byte_count,0)<46 or coalesce(seconds,0)<=0 then raise exception 'Invalid recording';end if;
 if (select coalesce(sum(bytes),0) from deardaily_private.voice_assets where user_id=who)+(select coalesce(sum(a.bytes),0) from deardaily_private.voice_copies c join deardaily_private.voice_assets a on a.id=c.source_id where c.user_id=who)+byte_count>20971520
 or (select coalesce(sum(bytes),0) from deardaily_private.voice_assets)+(select coalesce(sum(a.bytes),0) from deardaily_private.voice_copies c join deardaily_private.voice_assets a on a.id=c.source_id)+byte_count>134217728 then raise exception 'Voice quota reached';end if;
 if (select count(*) from deardaily_private.voice_assets where user_id=who)>=30 or (select count(*) from deardaily_private.voice_assets where entry_id=entry)>=3 then raise exception 'Voice note quota reached';end if;
 insert into deardaily_private.voice_assets(id,user_id,entry_id,bytes,duration) values(media,who,entry,byte_count,seconds);
 return media;
end;$$;
revoke all on function public.reserve_voice_note(uuid,uuid,integer,numeric) from public,anon,authenticated;
grant execute on function public.reserve_voice_note(uuid,uuid,integer,numeric) to authenticated;
alter table public.journal_entries add column voice_notes jsonb not null default '[]';
alter table public.public_stories add column voice_notes jsonb not null default '[]';
create function deardaily_private.valid_voice_notes(notes jsonb,private_copy boolean) returns boolean language plpgsql immutable set search_path='' as $$
declare n jsonb;ids text[]:=array[]::text[];
begin
 if jsonb_typeof(notes)<>'array' or jsonb_array_length(notes)>3 then return false;end if;
 for n in select value from jsonb_array_elements(notes) loop
  if jsonb_typeof(n)<>'object' or n-(case when private_copy then array['id','title','start','end','share'] else array['id','title','start','end'] end)<>'{}'::jsonb
   or not coalesce(jsonb_typeof(n->'id')='string' and n->>'id' ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' and jsonb_typeof(n->'title')='string' and length(n->>'title')<=80 and jsonb_typeof(n->'start')='number' and jsonb_typeof(n->'end')='number' and (n->>'start')::numeric>=0 and (n->>'end')::numeric>(n->>'start')::numeric and (n->>'end')::numeric<=180 and (not private_copy or jsonb_typeof(n->'share')='boolean'),false)
   or n->>'id'=any(ids) then return false;end if;
  ids:=array_append(ids,n->>'id');
 end loop;return true;
exception when others then return false;
end;$$;
revoke all on function deardaily_private.valid_voice_notes(jsonb,boolean) from public,anon,authenticated;
-- Pure shape validator is executed by CHECK constraints; it reads no tables.
grant execute on function deardaily_private.valid_voice_notes(jsonb,boolean) to authenticated,service_role;
alter table public.journal_entries add constraint private_voice_shape check(deardaily_private.valid_voice_notes(voice_notes,true));
alter table public.public_stories add constraint public_voice_shape check(deardaily_private.valid_voice_notes(voice_notes,false));
grant select(voice_notes),insert(voice_notes),update(voice_notes) on public.journal_entries to authenticated;
grant select(voice_notes) on public.public_stories to anon,authenticated;
grant insert(voice_notes),update(voice_notes) on public.public_stories to authenticated;
create function deardaily_private.check_voice_ownership() returns trigger language plpgsql security definer set search_path='' as $$
declare n jsonb;
begin
 for n in select value from jsonb_array_elements(new.voice_notes) loop
  if tg_table_name='journal_entries' then
   if not exists(select 1 from deardaily_private.voice_assets a where a.id=(n->>'id')::uuid and a.entry_id=new.id and a.user_id=new.user_id and a.ready and a.duration>=(n->>'end')::numeric) then raise exception 'Voice note unavailable' using errcode='23514';end if;
  else
   if not exists(select 1 from deardaily_private.voice_copies c join deardaily_private.voice_assets a on a.id=c.source_id join public.journal_entries e on e.id=c.entry_id cross join lateral jsonb_array_elements(e.voice_notes) s
     where c.id=(n->>'id')::uuid and c.entry_id=new.id and c.user_id=new.user_id and e.user_id=new.user_id and c.version=e.version and a.ready and s->>'id'=c.source_id::text and s->'share'='true'::jsonb and s-array['id','share']=n-'id') then raise exception 'Explicit voice approval required' using errcode='23514';end if;
  end if;
 end loop;return new;
end;$$;
revoke all on function deardaily_private.check_voice_ownership() from public,anon,authenticated;
create trigger check_private_voice before insert or update of voice_notes on public.journal_entries for each row execute function deardaily_private.check_voice_ownership();
create trigger check_public_voice before insert or update of voice_notes on public.public_stories for each row execute function deardaily_private.check_voice_ownership();
create function deardaily_private.queue_voice_cleanup() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into deardaily_private.voice_gc(user_id,bucket,object_key) values(old.user_id,case when tg_table_name='voice_assets' then 'deardaily-voice-private' else 'deardaily-voice-public' end,old.id::text||'.wav');return old;
end;$$;
revoke all on function deardaily_private.queue_voice_cleanup() from public,anon,authenticated;
create trigger private_voice_gc after delete on deardaily_private.voice_assets for each row execute function deardaily_private.queue_voice_cleanup();
create trigger public_voice_gc after delete on deardaily_private.voice_copies for each row execute function deardaily_private.queue_voice_cleanup();
create function deardaily_private.revoke_voice_copies() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='DELETE' then delete from deardaily_private.voice_copies where entry_id=old.id;
 else delete from deardaily_private.voice_copies c where c.entry_id=new.id and not exists(select 1 from jsonb_array_elements(new.voice_notes)n where n->>'id'=c.id::text);end if;
 return null;
end;$$;
revoke all on function deardaily_private.revoke_voice_copies() from public,anon,authenticated;
create trigger revoke_voice_copies after update of voice_notes or delete on public.public_stories for each row execute function deardaily_private.revoke_voice_copies();
