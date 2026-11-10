begin;
-- Existing snapshots stay unchanged until their author confirms ongoing sharing.
alter table public.public_profiles add column public_activity_live boolean not null default false;
alter table public.public_profiles add column public_activity_timezone text not null default 'UTC';
grant select(public_activity_live) on public.public_profiles to anon,authenticated;
create function deardaily_private.shared_activity(owner_id uuid,share_streak boolean,share_calendar boolean,zone text) returns jsonb
language plpgsql stable set search_path='' as $$
declare today date; first_day date; anchor date; streak integer; calendar jsonb;
begin
 today=(current_timestamp at time zone zone)::date;
 if share_calendar then
  first_day=today-(extract(isodow from today)::int-1)-77;
  select jsonb_build_object('start',first_day::text,'days',coalesce(jsonb_agg(d.entry_date::text order by d.entry_date),'[]'::jsonb)) into calendar from (
   select distinct entry_date from public.journal_entries where user_id=owner_id and status='saved' and entry_date between first_day and today
  ) d;
 end if;
 if share_streak then
  anchor=case when exists(select 1 from public.journal_entries where user_id=owner_id and status='saved' and entry_date=today) then today else today-1 end;
  select count(*)::integer into streak from (
   select entry_date,row_number() over(order by entry_date desc) n from (
    select distinct entry_date from public.journal_entries where user_id=owner_id and status='saved' and entry_date between anchor-36499 and anchor
   ) d
  ) s where entry_date=anchor-(n::int-1);
 end if;
 return jsonb_build_object('public_streak',streak,'public_rhythm',calendar);
end;$$;
revoke all on function deardaily_private.shared_activity(uuid,boolean,boolean,text) from public,anon,authenticated;
create function public.set_public_writing_visibility(show_streak boolean,show_calendar boolean,zone text default 'UTC') returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
 if show_streak is null or show_calendar is null or zone is null or length(zone)>64 or not exists(select 1 from pg_catalog.pg_timezone_names where name=zone) then raise exception 'Invalid sharing choice' using errcode='22023'; end if;
 perform 1 from public.public_profiles where user_id=auth.uid() for update;
 if not found then raise exception 'Save profile first' using errcode='22023'; end if;
 result=deardaily_private.shared_activity(auth.uid(),show_streak,show_calendar,zone);
 update public.public_profiles set public_streak=(result->>'public_streak')::int,public_rhythm=nullif(result->'public_rhythm','null'::jsonb),public_activity_live=true,public_activity_timezone=zone where user_id=auth.uid();
 return result;
end;$$;
create function public.get_public_writing_activity(profile_username text) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare p public.public_profiles%rowtype;
begin
 select * into p from public.public_profiles where username=profile_username and visible=true;
 if not found then return null; end if;
 if p.public_activity_live then
  return deardaily_private.shared_activity(p.user_id,p.public_streak is not null,p.public_rhythm is not null,p.public_activity_timezone);
 end if;
 return jsonb_build_object('public_streak',p.public_streak,'public_rhythm',p.public_rhythm);
end;$$;
revoke all on function public.set_public_writing_visibility(boolean,boolean,text),public.get_public_writing_activity(text) from public,anon,authenticated;
grant execute on function public.set_public_writing_visibility(boolean,boolean,text) to authenticated;
grant execute on function public.get_public_writing_activity(text) to anon,authenticated;
commit;
