-- ADDITIVE LOCAL PROPOSAL. Hosted application and Edge deployment require approval.
-- Both buckets stay private. Ordinary clients cannot upload unsanitized objects.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('deardaily-private','deardaily-private',false,5242880,array['image/webp']),
 ('deardaily-story-media','deardaily-story-media',false,5242880,array['image/webp']);
create table public.private_media(
 id uuid primary key,entry_id uuid not null,user_id uuid not null,
 object_key text not null unique,status text not null default 'pending' check(status in ('pending','ready')),
 bytes integer not null check(bytes between 1 and 5242880),width integer,height integer,
 created_at timestamptz not null default now(),
 foreign key(entry_id,user_id) references public.journal_entries(id,user_id) on delete cascade,
 check(object_key=user_id::text||'/'||id::text||'.webp'),
 check((width is null and height is null) or (width between 1 and 1600 and height between 1 and 1600))
);
create index private_media_owner_entry on public.private_media(user_id,entry_id);
create table public.story_media(
 id uuid primary key,entry_id uuid not null,user_id uuid not null,object_key text not null unique,
 bytes integer not null check(bytes between 1 and 5242880),
 created_at timestamptz not null default now(),
 foreign key(entry_id,user_id) references public.journal_entries(id,user_id) on delete cascade,
 check(object_key=id::text||'.webp')
);
create index story_media_owner_entry on public.story_media(user_id,entry_id);
-- Bound public staging as well as originals. Repeated prepare requests cannot
-- accumulate unlimited copies, including when multiple requests race.
create function public.limit_story_media() returns trigger language plpgsql security definer set search_path='' as $$begin
 perform pg_advisory_xact_lock(hashtextextended(new.user_id::text,17));
 if (select coalesce(sum(bytes),0) from public.story_media where user_id=new.user_id)+new.bytes>104857600 or (select count(*) from public.story_media where user_id=new.user_id and entry_id=new.entry_id)>=30 then raise exception 'Public photo quota reached' using errcode='54000';end if;
 return new;
end $$;
revoke all on function public.limit_story_media() from public,anon,authenticated;
create trigger story_media_quota before insert on public.story_media for each row execute function public.limit_story_media();

create table public.media_gc(
 id uuid primary key default gen_random_uuid(),user_id uuid not null,bucket text not null check(bucket in ('deardaily-private','deardaily-story-media')),object_key text not null,created_at timestamptz not null default now()
);
create index media_gc_owner on public.media_gc(user_id,created_at);
alter table public.private_media enable row level security;
alter table public.private_media force row level security;
alter table public.story_media enable row level security;
alter table public.story_media force row level security;
alter table public.media_gc enable row level security;
alter table public.media_gc force row level security;
revoke all on public.private_media,public.story_media,public.media_gc from public,anon,authenticated;
grant all on public.private_media,public.story_media,public.media_gc to service_role;
grant select(id,entry_id,status,bytes,width,height,created_at) on public.private_media to authenticated;
create policy private_media_owner_read on public.private_media for select to authenticated using(user_id=(select auth.uid()));
create policy deardaily_gateway_only on storage.objects as restrictive for all to anon,authenticated
 using(bucket_id not in ('deardaily-private','deardaily-story-media'))
 with check(bucket_id not in ('deardaily-private','deardaily-story-media'));
-- Restrictive isolation also prevents pre-existing broad Storage policies from granting access.
-- No client insert/update/delete grants, and no Storage write policies.
-- The trusted gateway validates JWT, ownership, quotas and decoded file bytes.
create function public.reserve_journal_media(entry uuid,media uuid,byte_count integer) returns uuid language plpgsql security definer set search_path='' as $$
declare who uuid=auth.uid();begin
 if who is null then raise exception 'Sign in required' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended(who::text,17));
 if not exists(select 1 from public.journal_entries where id=entry and user_id=who) then raise exception 'Entry unavailable' using errcode='42501';end if;
 if byte_count not between 1 and 5242880 then raise exception 'Invalid media size' using errcode='23514';end if;
 if (select count(*) from public.private_media where entry_id=entry and user_id=who and status='pending')>=10 or (select coalesce(sum(bytes),0) from public.private_media where user_id=who)+byte_count>104857600 then raise exception 'Photo quota reached' using errcode='54000';end if;
 insert into public.private_media(id,entry_id,user_id,object_key,bytes) values(media,entry,who,who::text||'/'||media::text||'.webp',byte_count);
 return media;
end $$;
revoke all on function public.reserve_journal_media(uuid,uuid,integer) from public,anon,authenticated;
grant execute on function public.reserve_journal_media(uuid,uuid,integer) to authenticated;
create function public.document_media_ids(document jsonb,public_copy boolean) returns setof uuid language plpgsql immutable set search_path='' as $$
declare node jsonb; identifier text;seen text[]='{}';begin
 if document is null then return;end if;
 if octet_length(document::text)>400000 then raise exception 'Document too large' using errcode='23514';end if;
 for node in select distinct value from jsonb_path_query(document,'$.** ? (@.type == "journalImage")') as q(value) loop
  identifier=case when public_copy then node->'attrs'->>'publicId' else node->'attrs'->>'assetId' end;
  if identifier is null or identifier !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then raise exception 'Invalid image reference' using errcode='23514';end if;
  if not identifier=any(seen) then seen=array_append(seen,identifier);return next identifier::uuid;end if;
 end loop;
 if document->'page'->>'cover'='upload' then
  identifier=case when public_copy then document->'page'->>'publicId' else document->'page'->>'assetId' end;
  if identifier is null or identifier !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then raise exception 'Invalid cover reference' using errcode='23514';end if;
  if not identifier=any(seen) then return next identifier::uuid;end if;
 end if;
end $$;
revoke all on function public.document_media_ids(jsonb,boolean) from public,anon,authenticated;
-- Pure bounded helper used by the ordinary public-row policy below.
create function public.story_uses_media(document jsonb,media uuid) returns boolean language sql immutable set search_path='' as $$select exists(select 1 from public.document_media_ids(document,true) id where id=media)$$;
revoke all on function public.story_uses_media(jsonb,uuid) from public,anon,authenticated;
grant execute on function public.document_media_ids(jsonb,boolean),public.story_uses_media(jsonb,uuid) to anon,authenticated;
grant select(id,entry_id) on public.story_media to anon,authenticated;
create policy story_media_public_read on public.story_media for select to anon,authenticated using(exists(select 1 from public.public_stories s where s.id=entry_id and public.story_uses_media(s.writing_document,story_media.id)));
create function public.validate_journal_media() returns trigger language plpgsql security definer set search_path='' as $$
declare media uuid;public_copy boolean=(tg_table_name='public_stories');begin
 if new.writing_document is null then return new;end if;
 if public_copy and jsonb_path_exists(new.writing_document,'$.**.assetId') then raise exception 'Private image references cannot be published' using errcode='23514';end if;
 if (select count(*) from public.document_media_ids(new.writing_document,public_copy))>10 then raise exception 'Too many photos' using errcode='23514';end if;
 for media in select public.document_media_ids(new.writing_document,public_copy) loop
  if public_copy then
   if not exists(select 1 from public.story_media where id=media and entry_id=new.id and user_id=new.user_id) then raise exception 'Public image unavailable' using errcode='23514';end if;
  else
   if not exists(select 1 from public.private_media where id=media and entry_id=new.id and user_id=new.user_id and status='ready') then raise exception 'Private image unavailable' using errcode='23514';end if;
  end if;
 end loop;
 return new;
end $$;
revoke all on function public.validate_journal_media() from public,anon,authenticated;
create trigger validate_private_journal_media before insert or update on public.journal_entries for each row execute function public.validate_journal_media();
create trigger validate_public_story_media before insert or update on public.public_stories for each row execute function public.validate_journal_media();
create function public.queue_media_cleanup() returns trigger language plpgsql security definer set search_path='' as $$begin
 insert into public.media_gc(user_id,bucket,object_key) values(old.user_id,case when tg_table_name='private_media' then 'deardaily-private' else 'deardaily-story-media' end,old.object_key);return old;end $$;
revoke all on function public.queue_media_cleanup() from public,anon,authenticated;
create trigger private_media_gc after delete on public.private_media for each row execute function public.queue_media_cleanup();
create trigger story_media_gc after delete on public.story_media for each row execute function public.queue_media_cleanup();
create function public.revoke_story_media() returns trigger language plpgsql security definer set search_path='' as $$begin
 if tg_op='DELETE' then delete from public.story_media where entry_id=old.id;return old;end if;
 delete from public.story_media where entry_id=new.id and not public.story_uses_media(new.writing_document,id);return new;
end $$;
revoke all on function public.revoke_story_media() from public,anon,authenticated;
create trigger revoke_unused_story_media after update or delete on public.public_stories for each row execute function public.revoke_story_media();

-- Manual cleanup only: never called automatically for ready private images.
create function public.prune_unused_journal_media() returns integer language plpgsql security definer set search_path='' as $$
declare who uuid=auth.uid();entry record;removed integer=0;n integer;begin
 if who is null then raise exception 'Sign in required' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended(who::text,17));
 for entry in select id,writing_document from public.journal_entries where user_id=who for update loop
  delete from public.private_media m where m.user_id=who and m.entry_id=entry.id and m.created_at<now()-interval '24 hours' and not exists(select 1 from public.document_media_ids(entry.writing_document,false) ref where ref=m.id);
  get diagnostics n=row_count;removed=removed+n;
  delete from public.story_media m where m.user_id=who and m.entry_id=entry.id and m.created_at<now()-interval '24 hours' and not exists(select 1 from public.public_stories s where s.id=entry.id and public.story_uses_media(s.writing_document,m.id));
  get diagnostics n=row_count;removed=removed+n;
 end loop;
 return removed;
end $$;
revoke all on function public.prune_unused_journal_media() from public,anon,authenticated;
grant execute on function public.prune_unused_journal_media() to authenticated;
