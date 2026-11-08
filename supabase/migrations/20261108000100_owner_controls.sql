-- Additive owner moderation only. No private journal grants or automatic owner assignment.
create table deardaily_private.owners (
 user_id uuid primary key references auth.users(id) on delete cascade,
 created_at timestamptz not null default now()
);
create table deardaily_private.publishing_bans (
 user_id uuid primary key references auth.users(id) on delete cascade,
 actor_id uuid references auth.users(id) on delete set null,
 reason text not null check(char_length(btrim(reason)) between 1 and 500),
 created_at timestamptz not null default now()
);
create table deardaily_private.owner_audit (
 id uuid primary key default gen_random_uuid(),
 actor_id uuid references auth.users(id) on delete set null,
 target_user uuid references auth.users(id) on delete set null,
 story_id uuid,
 action text not null check(action in ('remove','ban','unban')),
 reason text not null check(char_length(btrim(reason)) between 1 and 500),
 created_at timestamptz not null default now()
);
create table deardaily_private.owner_notices (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 action text not null check(action in ('remove','ban','unban')),
 reason text not null check(char_length(btrim(reason)) between 1 and 500),
 created_at timestamptz not null default now()
);
create index owner_notices_recipient_time on deardaily_private.owner_notices(user_id,created_at);
alter table deardaily_private.owners enable row level security;
alter table deardaily_private.owners force row level security;
alter table deardaily_private.publishing_bans enable row level security;
alter table deardaily_private.publishing_bans force row level security;
alter table deardaily_private.owner_audit enable row level security;
alter table deardaily_private.owner_audit force row level security;
alter table deardaily_private.owner_notices enable row level security;
alter table deardaily_private.owner_notices force row level security;
revoke all on deardaily_private.owners,deardaily_private.publishing_bans,deardaily_private.owner_audit,deardaily_private.owner_notices from public,anon,authenticated;

create function deardaily_private.require_owner() returns void language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or not exists(select 1 from deardaily_private.owners where user_id=auth.uid()) or coalesce(auth.jwt()->>'aal','')<>'aal2' then
  raise exception 'Verified owner MFA session required' using errcode='42501';
 end if;
end; $$;
revoke all on function deardaily_private.require_owner() from public,anon,authenticated;

create function public.my_owner_access() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('owner',auth.uid() is not null and exists(select 1 from deardaily_private.owners where user_id=auth.uid()),'mfa',coalesce(auth.jwt()->>'aal','')='aal2');
$$;
create function public.owner_public_stories(page integer default 0) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 perform deardaily_private.require_owner();
 if page is null or page<0 or page>20000 then raise exception 'Invalid page' using errcode='22023'; end if;
 return coalesce((select jsonb_agg(q) from (select id,title,public_username,published_at from public.public_stories order by published_at desc,id limit 50 offset page*50) q),'[]'::jsonb);
end; $$;
create function public.owner_publishing_bans() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 perform deardaily_private.require_owner();
 return coalesce((select jsonb_agg(q) from (select user_id as author_ref,reason,created_at from deardaily_private.publishing_bans order by created_at desc limit 100) q),'[]'::jsonb);
end; $$;

-- All publishers and ban actions serialize on the same owner lock. This avoids
-- a concurrent publish slipping between banning an author and removing snapshots.
create function public.enforce_publishing_ban() returns trigger language plpgsql security definer set search_path='' as $$
begin
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.user_id::text,37));
 if exists(select 1 from deardaily_private.publishing_bans where user_id=new.user_id) then raise exception 'Public publishing is restricted' using errcode='42501'; end if;
 return new;
end; $$;
create trigger aaa_enforce_publishing_ban before insert or update on public.public_stories for each row execute function public.enforce_publishing_ban();
revoke all on function public.enforce_publishing_ban() from public,anon,authenticated;

create function public.owner_moderate_story(story uuid,ban_author boolean,reason text) returns void language plpgsql security definer set search_path='' as $$
declare target uuid; action_name text;
begin
 perform deardaily_private.require_owner();
 if story is null or ban_author is null or reason is null or char_length(btrim(reason)) not between 1 and 500 then raise exception 'A reason is required' using errcode='22023'; end if;
 select user_id into target from public.public_stories where id=story;
 if target is null then raise exception 'Story unavailable' using errcode='22023'; end if;
 if target=auth.uid() and ban_author then raise exception 'Cannot ban your owner account' using errcode='22023'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(target::text,37));
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(story::text,1));
 if not exists(select 1 from public.public_stories where id=story and user_id=target) then raise exception 'Story unavailable' using errcode='22023'; end if;
 action_name=case when ban_author then 'ban' else 'remove' end;
 if ban_author then
  insert into deardaily_private.publishing_bans(user_id,actor_id,reason) values(target,auth.uid(),btrim(reason)) on conflict(user_id) do update set actor_id=excluded.actor_id,reason=excluded.reason,created_at=now();
  insert into deardaily_private.removed_stories(story_id) select id from public.public_stories where user_id=target on conflict do nothing;
  delete from public.public_stories where user_id=target;
 else
  insert into deardaily_private.removed_stories(story_id) values(story) on conflict do nothing;
  delete from public.public_stories where id=story;
 end if;
 insert into deardaily_private.owner_audit(actor_id,target_user,story_id,action,reason) values(auth.uid(),target,story,action_name,btrim(reason));
 insert into deardaily_private.owner_notices(user_id,action,reason) values(target,action_name,btrim(reason));
end; $$;
create function public.owner_restore_publishing(author_ref uuid,reason text) returns void language plpgsql security definer set search_path='' as $$
begin
 perform deardaily_private.require_owner();
 if author_ref is null or reason is null or char_length(btrim(reason)) not between 1 and 500 then raise exception 'A reason is required' using errcode='22023'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(author_ref::text,37));
 delete from deardaily_private.publishing_bans where user_id=author_ref;
 if not found then raise exception 'Restriction unavailable' using errcode='22023'; end if;
 -- Removed entries remain blocked; restoring publishing permits new entries only.
 insert into deardaily_private.owner_audit(actor_id,target_user,action,reason) values(auth.uid(),author_ref,'unban',btrim(reason));
 insert into deardaily_private.owner_notices(user_id,action,reason) values(author_ref,'unban',btrim(reason));
end; $$;
create function public.my_moderation_notices() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(q),'[]'::jsonb) from (select id,action,reason,created_at from deardaily_private.owner_notices where user_id=auth.uid() order by created_at desc limit 30) q;
$$;
revoke all on function public.my_owner_access(),public.owner_public_stories(integer),public.owner_publishing_bans(),public.owner_moderate_story(uuid,boolean,text),public.owner_restore_publishing(uuid,text),public.my_moderation_notices() from public,anon,authenticated;
grant execute on function public.my_owner_access(),public.owner_public_stories(integer),public.owner_publishing_bans(),public.owner_moderate_story(uuid,boolean,text),public.owner_restore_publishing(uuid,text),public.my_moderation_notices() to authenticated;
