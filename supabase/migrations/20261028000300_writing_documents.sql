-- ADDITIVE PROPOSAL ONLY. Do not apply to hosted databases without approval.
-- Legacy body remains the plain-text compatibility/search/export projection.
-- Rendering validates the constrained versioned document and uses React nodes.
alter table public.journal_entries
  add column writing_document jsonb,
  add column original_body text,
  add column page_icon text check (page_icon is null or page_icon in ('🌿','☀️','🌙','✨','📖','🪷','🌊','🍂','💭','🧡','✈️','🌻')),
  add column cover_preset text check (cover_preset is null or cover_preset in ('none','dawn','forest','ocean','clay')),
  add constraint entry_document_envelope check (writing_document is null or coalesce((
    jsonb_typeof(writing_document)='object' and writing_document->>'version'='1'
    and jsonb_typeof(writing_document->'content')='object'
    and writing_document->'content'->>'type'='doc'
    and octet_length(writing_document::text)<=400000
  ),false));
alter table public.public_stories
  add column writing_document jsonb,
  add column page_icon text check (page_icon is null or page_icon in ('🌿','☀️','🌙','✨','📖','🪷','🌊','🍂','💭','🧡','✈️','🌻')),
  add column cover_preset text check (cover_preset is null or cover_preset in ('none','dawn','forest','ocean','clay')),
  add constraint story_document_envelope check (writing_document is null or coalesce((
    jsonb_typeof(writing_document)='object' and writing_document->>'version'='1'
    and jsonb_typeof(writing_document->'content')='object'
    and writing_document->'content'->>'type'='doc'
    and octet_length(writing_document::text)<=400000
  ),false));
-- Owner-only journal RLS and explicit snapshot RLS remain unchanged.
-- original_body has no INSERT/UPDATE grant and never enters the public table.
grant insert(writing_document,page_icon,cover_preset),update(writing_document,page_icon,cover_preset) on public.journal_entries to authenticated;
grant select(writing_document,page_icon,cover_preset) on public.public_stories to anon,authenticated;
grant insert(writing_document,page_icon,cover_preset),update(writing_document,page_icon,cover_preset) on public.public_stories to authenticated;
create function public.preserve_original_writing() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  if old.writing_document is null and new.writing_document is not null and old.original_body is null then
    new.original_body=old.body;
  end if;
  if old.writing_document is not null and new.writing_document is not distinct from old.writing_document and new.body is distinct from old.body then
    raise exception 'Use the current rich editor to edit this entry' using errcode='23514';
  end if;
  return new;
end;
$$;
revoke all on function public.preserve_original_writing() from public,anon,authenticated;
create trigger preserve_original_writing before update on public.journal_entries for each row execute function public.preserve_original_writing();
-- An old client must not publish stale rich text beside newly reviewed plain text.
create function public.clear_stale_public_document() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  if new.body is distinct from old.body and new.writing_document is not distinct from old.writing_document then
    new.writing_document=null;
  end if;
  return new;
end;
$$;
revoke all on function public.clear_stale_public_document() from public,anon,authenticated;
create trigger clear_stale_public_document before update on public.public_stories for each row execute function public.clear_stale_public_document();
