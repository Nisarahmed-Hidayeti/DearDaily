-- Explicit public snapshot only; all existing profiles start with no shared streak.
alter table public.public_profiles add column public_streak integer default null check(public_streak between 0 and 36500);
grant select(public_streak) on public.public_profiles to anon,authenticated;
create or replace function public.my_public_profile() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('username',username,'display_name',display_name,'bio',bio,'avatar',avatar,'visible',visible,'joined_month',joined_month,'cover_id',cover_id,'public_streak',public_streak)
 from public.public_profiles where user_id=auth.uid() and auth.uid() is not null;
$$;
create function public.set_public_streak(enabled boolean,today date default current_date) returns integer language plpgsql security definer set search_path='' as $$
declare streak integer; anchor date;
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
 if enabled is null or today is null or today<current_date-1 or today>current_date+1 then raise exception 'Invalid streak choice' using errcode='22023'; end if;
 perform 1 from public.public_profiles where user_id=auth.uid() for update;
 if not found then raise exception 'Save your profile first' using errcode='22023'; end if;
 if enabled then
  anchor=case when exists(select 1 from public.journal_entries where user_id=auth.uid() and status='saved' and entry_date=today) then today else today-1 end;
  select count(*)::integer into streak from (
   select entry_date,row_number() over(order by entry_date desc) as n from (
    select distinct entry_date from public.journal_entries where user_id=auth.uid() and status='saved' and entry_date<=anchor and entry_date>=anchor-36499
   ) d
  ) s where entry_date=anchor-(n::integer-1);
 end if;
 update public.public_profiles set public_streak=streak where user_id=auth.uid();
 return streak;
end; $$;
revoke all on function public.my_public_profile(),public.set_public_streak(boolean,date) from public,anon,authenticated;
grant execute on function public.my_public_profile(),public.set_public_streak(boolean,date) to authenticated;
