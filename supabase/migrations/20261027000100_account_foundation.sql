-- Private account records only. No journal tables or public profile access.
create table public.profiles (
  id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  display_name text check (display_name is null or char_length(display_name) between 1 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.user_settings (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  theme_id text not null default 'midnight-purple'
    check (theme_id in ('midnight-purple','forest-green','paper-white','obsidian-black')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
alter table public.profiles force row level security;
alter table public.user_settings enable row level security;
alter table public.user_settings force row level security;

revoke all on public.profiles, public.user_settings from public, anon, authenticated;
grant select, delete on public.profiles, public.user_settings to authenticated;
-- auth.uid() supplies defaults and RLS validates every supplied ID against the JWT.
-- Explicit insert IDs act as identity preconditions across session switches.
-- Clients cannot modify ownership or timestamps.
grant insert (id, display_name), update (display_name) on public.profiles to authenticated;
grant insert (user_id, theme_id), update (theme_id) on public.user_settings to authenticated;

create policy profiles_select_own on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy profiles_insert_own on public.profiles for insert to authenticated with check ((select auth.uid()) = id);
create policy profiles_update_own on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy profiles_delete_own on public.profiles for delete to authenticated using ((select auth.uid()) = id);
create policy settings_select_own on public.user_settings for select to authenticated using ((select auth.uid()) = user_id);
create policy settings_insert_own on public.user_settings for insert to authenticated with check ((select auth.uid()) = user_id);
create policy settings_update_own on public.user_settings for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy settings_delete_own on public.user_settings for delete to authenticated using ((select auth.uid()) = user_id);

create function public.touch_account_updated_at() returns trigger
language plpgsql security invoker set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
revoke all on function public.touch_account_updated_at() from public, anon, authenticated;
create trigger profiles_updated_at before update on public.profiles
for each row execute function public.touch_account_updated_at();
create trigger settings_updated_at before update on public.user_settings
for each row execute function public.touch_account_updated_at();
