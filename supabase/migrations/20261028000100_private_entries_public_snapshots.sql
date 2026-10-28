-- Private source entries and explicit public snapshots. Never expose the source table.
create table public.journal_entries (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  title text not null default '' check (char_length(title) <= 200),
  body text not null default '' check (char_length(body) <= 100000),
  mood text not null default 'Calm' check (mood in ('Calm','Happy','Reflective','Low')),
  tags text[] not null default '{}' check (cardinality(tags) <= 10 and array_position(tags,null) is null and char_length(array_to_string(tags,',')) <= 309),
  category text not null default 'Personal' check (category in ('Personal','Gratitude','Growth','Travel')),
  entry_date date not null default current_date,
  status text not null default 'draft' check (status in ('draft','saved')),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id,user_id)
);
create index journal_entries_owner_date on public.journal_entries(user_id,entry_date desc);

-- This dedicated public interface contains copies made only by a publish action.
-- Only the four intended story fields are readable by API roles.
create table public.public_stories (
  id uuid primary key,
  user_id uuid not null,
  title text not null check (char_length(btrim(title)) between 1 and 200),
  body text not null check (char_length(btrim(body)) between 1 and 100000),
  published_at timestamptz not null default now(),
  foreign key (id,user_id) references public.journal_entries(id,user_id) on delete cascade
);
alter table public.journal_entries enable row level security;
alter table public.journal_entries force row level security;
alter table public.public_stories enable row level security;
alter table public.public_stories force row level security;
revoke all on public.journal_entries,public.public_stories from public,anon,authenticated;
grant select,delete on public.journal_entries to authenticated;
grant insert(id,user_id,title,body,mood,tags,category,entry_date,status),
  update(title,body,mood,tags,category,entry_date,status) on public.journal_entries to authenticated;
grant select(id,title,body,published_at) on public.public_stories to anon,authenticated;
grant insert(id,user_id,title,body), update(title,body) on public.public_stories to authenticated;
grant delete on public.public_stories to authenticated;
create policy entries_read on public.journal_entries for select to authenticated using ((select auth.uid())=user_id);
create policy entries_create on public.journal_entries for insert to authenticated with check ((select auth.uid())=user_id);
create policy entries_edit on public.journal_entries for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy entries_remove on public.journal_entries for delete to authenticated using ((select auth.uid())=user_id);
create policy stories_read on public.public_stories for select to anon,authenticated using (true);
create policy stories_publish on public.public_stories for insert to authenticated with check ((select auth.uid())=user_id);
create policy stories_edit on public.public_stories for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy stories_unpublish on public.public_stories for delete to authenticated using ((select auth.uid())=user_id);
create function public.version_journal_entry() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  new.version=old.version+1;
  new.updated_at=now();
  return new;
end;
$$;
revoke all on function public.version_journal_entry() from public,anon,authenticated;
create trigger journal_entry_version before update on public.journal_entries
for each row execute function public.version_journal_entry();
