-- Explicit opt-in snapshot. No live journal query is exposed to public callers.
begin;
alter table public.public_profiles add column public_rhythm jsonb default null;
grant select(public_rhythm) on public.public_profiles to anon,authenticated;
create function public.set_public_rhythm(enabled boolean,today date default current_date) returns jsonb
language plpgsql security definer set search_path='' as $$
declare snapshot jsonb; first_day date;
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
 if enabled is null or today is null or today<current_date-1 or today>current_date+1 then raise exception 'Invalid calendar choice' using errcode='22023'; end if;
 perform 1 from public.public_profiles where user_id=auth.uid() for update;
 if not found then raise exception 'Save your profile first' using errcode='22023'; end if;
 if enabled then
  first_day=today-(extract(isodow from today)::int-1)-77;
  select jsonb_build_object('start',first_day::text,'days',coalesce(jsonb_agg(d.entry_date::text order by d.entry_date),'[]'::jsonb)) into snapshot
  from (select distinct entry_date from public.journal_entries where user_id=auth.uid() and status='saved' and entry_date between first_day and today) d;
 end if;
 update public.public_profiles set public_rhythm=snapshot where user_id=auth.uid();
 return snapshot;
end;$$;
revoke all on function public.set_public_rhythm(boolean,date) from public,anon,authenticated;
grant execute on function public.set_public_rhythm(boolean,date) to authenticated;
commit;
