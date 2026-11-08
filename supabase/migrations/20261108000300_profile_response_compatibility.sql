-- Preserve the deployed client's writable profile-response contract.
-- Optional public streaks are read separately through existing column permissions.
create or replace function public.my_public_profile() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('username',username,'display_name',display_name,'bio',bio,'avatar',avatar,'visible',visible,'joined_month',joined_month,'cover_id',cover_id)
 from public.public_profiles where user_id=auth.uid() and auth.uid() is not null;
$$;
revoke all on function public.my_public_profile() from public,anon,authenticated;
grant execute on function public.my_public_profile() to authenticated;
