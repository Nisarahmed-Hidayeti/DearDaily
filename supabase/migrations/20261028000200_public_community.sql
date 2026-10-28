-- Phase 4: additive migration. No source-entry changes or automatic profile opt-in.
create schema deardaily_private;
revoke all on schema deardaily_private from public,anon,authenticated;
create index public_stories_source_owner on public.public_stories(id,user_id);
create index public_stories_newest on public.public_stories(published_at desc,id);
create table public.public_profiles (
 user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
 username text unique not null check(username ~ '^[a-z][a-z0-9_]{2,23}$' and username not in ('admin','administrator','moderator','support','deardaily','official','security')),
 display_name text not null check(char_length(btrim(display_name)) between 1 and 80),
 bio text not null default '' check(char_length(bio)<=300),
 avatar text not null default 'leaf' check(avatar in ('leaf','moon','sun','book')),
 visible boolean not null default false,
 joined_month date default null check(joined_month is null or extract(day from joined_month)=1)
);
alter table public.public_profiles enable row level security;
alter table public.public_profiles force row level security;
revoke all on public.public_profiles from public,anon,authenticated;
grant select(username,display_name,bio,avatar,visible,joined_month) on public.public_profiles to anon,authenticated;
grant insert(username,display_name,bio,avatar,visible,joined_month),update(username,display_name,bio,avatar,visible,joined_month),delete on public.public_profiles to authenticated;
create policy profile_read on public.public_profiles for select using(visible or user_id=(select auth.uid()));
create policy profile_insert on public.public_profiles for insert to authenticated with check(user_id=(select auth.uid()));
create policy profile_update on public.public_profiles for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));
create policy profile_delete on public.public_profiles for delete to authenticated using(user_id=(select auth.uid()));
alter table public.public_stories add column public_username text default null,
 add column public_category text not null default 'Uncategorized' check(public_category in ('Uncategorized','Personal','Gratitude','Growth','Travel')),
 add column public_tags text[] not null default '{}' check(cardinality(public_tags)<=5 and array_position(public_tags,null) is null and char_length(array_to_string(public_tags,','))<=154 and (cardinality(public_tags)=0 or array_to_string(public_tags,',') ~ '^[^,]{1,30}(,[^,]{1,30}){0,4}$'));
grant select(public_username,public_category,public_tags),insert(public_username,public_category,public_tags),update(public_username,public_category,public_tags) on public.public_stories to authenticated;
grant select(public_username,public_category,public_tags) on public.public_stories to anon;
create table deardaily_private.moderators(user_id uuid primary key references auth.users(id) on delete cascade);
create table deardaily_private.removed_stories(story_id uuid primary key references public.journal_entries(id) on delete cascade, removed_at timestamptz not null default now());
create table deardaily_private.reports(
 id uuid primary key default gen_random_uuid(), story_id uuid not null,
 reporter_id uuid references auth.users(id) on delete set null,
 reason text not null check(reason in ('harassment','hate','personal_information','spam','other')),
 explanation text not null default '' check(char_length(explanation)<=1000),
 created_at timestamptz not null default now(), resolved_at timestamptz,
 unique(story_id,reporter_id)
);
create index reports_reporter_time on deardaily_private.reports(reporter_id,created_at);
create table deardaily_private.moderation_audit(
 id uuid primary key default gen_random_uuid(), report_id uuid not null references deardaily_private.reports(id),
 moderator_id uuid references auth.users(id) on delete set null,
 decision text not null check(decision in ('dismiss','remove')), note text not null check(char_length(btrim(note)) between 1 and 500), created_at timestamptz not null default now()
);
create table deardaily_private.deletion_requests(user_id uuid primary key references auth.users(id) on delete cascade,requested_at timestamptz not null default now());
revoke all on all tables in schema deardaily_private from public,anon,authenticated;
-- These narrowly scoped functions need hidden ownership/abuse records. Every callable
-- function checks auth.uid; no dynamic SQL, user-supplied roles or source-data returns.
create function public.my_public_profile() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('username',username,'display_name',display_name,'bio',bio,'avatar',avatar,'visible',visible,'joined_month',joined_month)
 from public.public_profiles where user_id=auth.uid() and auth.uid() is not null;
$$;
create function public.validate_public_attribution() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from deardaily_private.removed_stories where story_id=new.id) then raise exception 'Publication restricted by moderation' using errcode='42501'; end if;
 if new.public_username is not null then
  perform 1 from public.public_profiles where user_id=new.user_id and username=new.public_username and visible for share;
  if not found then raise exception 'Public identity not authorized' using errcode='42501'; end if;
 end if;
 return new;
end; $$;
create trigger check_public_attribution before insert or update on public.public_stories for each row execute function public.validate_public_attribution();
create function public.detach_public_identity() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if TG_OP='DELETE' then update public.public_stories set public_username=null where user_id=old.user_id; return old; end if;
 if not new.visible or new.username<>old.username then update public.public_stories set public_username=null where user_id=old.user_id; end if;
 return new;
end; $$;
create trigger detach_identity before update or delete on public.public_profiles for each row execute function public.detach_public_identity();
create function public.submit_story_report(story uuid,reason text,explanation text default '') returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in to report' using errcode='42501'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(auth.uid()::text,0));
 if not exists(select 1 from public.public_stories where id=story) then raise exception 'Story unavailable' using errcode='22023'; end if;
 if exists(select 1 from deardaily_private.reports where reporter_id=auth.uid() and story_id=story) then raise exception 'Already reported' using errcode='23505'; end if;
 if (select count(*) from deardaily_private.reports where reporter_id=auth.uid() and created_at>now()-interval '24 hours')>=5 then raise exception 'Daily report limit reached' using errcode='54000'; end if;
 insert into deardaily_private.reports(story_id,reporter_id,reason,explanation) values(story,auth.uid(),reason,explanation);
end; $$;
create function public.moderation_queue() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if not exists(select 1 from deardaily_private.moderators where user_id=auth.uid()) then raise exception 'Moderator access required' using errcode='42501'; end if;
 return coalesce((select jsonb_agg(q) from (select r.id,r.story_id,r.reason,r.explanation,r.created_at,s.title,s.body from deardaily_private.reports r left join public.public_stories s on s.id=r.story_id where r.resolved_at is null order by r.created_at limit 100) q),'[]'::jsonb);
end; $$;
create function public.moderate_report(report uuid,decision text,note text) returns void language plpgsql security definer set search_path='' as $$
declare target uuid;
begin
 if not exists(select 1 from deardaily_private.moderators where user_id=auth.uid()) then raise exception 'Moderator access required' using errcode='42501'; end if;
 if decision not in ('dismiss','remove') or decision is null or note is null or char_length(btrim(note)) not between 1 and 500 then raise exception 'Invalid decision' using errcode='22023'; end if;
 select story_id into target from deardaily_private.reports where id=report and resolved_at is null for update;
 if not found then raise exception 'Report unavailable' using errcode='22023'; end if;
 if decision='remove' then
  insert into deardaily_private.removed_stories(story_id) select id from public.journal_entries where id=target on conflict do nothing;
  delete from public.public_stories where id=target;
 end if;
 insert into deardaily_private.moderation_audit(report_id,moderator_id,decision,note) values(report,auth.uid(),decision,note);
 update deardaily_private.reports set resolved_at=now() where id=report;
end; $$;
create function public.request_account_deletion() returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
 insert into deardaily_private.deletion_requests(user_id) values(auth.uid()) on conflict do nothing;
end; $$;
revoke all on function public.my_public_profile(),public.validate_public_attribution(),public.detach_public_identity(),public.submit_story_report(uuid,text,text),public.moderation_queue(),public.moderate_report(uuid,text,text),public.request_account_deletion() from public,anon,authenticated;
grant execute on function public.my_public_profile(),public.submit_story_report(uuid,text,text),public.moderation_queue(),public.moderate_report(uuid,text,text),public.request_account_deletion() to authenticated;

-- Defense in depth: private tables are outside the exposed schema and have no API grants.
alter table deardaily_private.moderators enable row level security;
alter table deardaily_private.moderators force row level security;
alter table deardaily_private.removed_stories enable row level security;
alter table deardaily_private.removed_stories force row level security;
alter table deardaily_private.reports enable row level security;
alter table deardaily_private.reports force row level security;
alter table deardaily_private.moderation_audit enable row level security;
alter table deardaily_private.moderation_audit force row level security;
alter table deardaily_private.deletion_requests enable row level security;
alter table deardaily_private.deletion_requests force row level security;
