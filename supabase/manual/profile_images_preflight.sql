-- READ ONLY. Verify deardaily-dev in the dashboard before running. No row content or secrets.
select jsonb_build_object(
 'database',current_database(),
 'new_objects_absent',to_regclass('public.profile_image_assets') is null and to_regclass('public.profile_image_copies') is null and to_regclass('public.profile_image_settings') is null and not exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('reserve_profile_image','reserve_profile_image_copy','my_profile_images','public_profile_images','public_profile_image_record','commit_profile_images','queue_profile_image_cleanup','hide_profile_images','prune_profile_images')),
 'buckets',(select jsonb_agg(jsonb_build_object('id',id,'private',not public,'limit',file_size_limit,'mimes',allowed_mime_types)) from storage.buckets where id in ('deardaily-private','deardaily-story-media')),
 'rls',(select jsonb_agg(jsonb_build_object('table',relname,'enabled',relrowsecurity,'forced',relforcerowsecurity)) from pg_class where oid in ('public.journal_entries'::regclass,'public.public_stories'::regclass,'public.public_profiles'::regclass,'public.private_media'::regclass,'public.story_media'::regclass)),
 'journals',(select count(*) from public.journal_entries),'stories',(select count(*) from public.public_stories),'profiles',(select count(*) from public.public_profiles),'accounts',(select count(*) from auth.users),
 'migration_ledger_absent',to_regclass('supabase_migrations.schema_migrations') is null,
 'profile_triggers',(select jsonb_agg(jsonb_build_object('name',tgname,'definition',pg_get_triggerdef(oid))) from pg_trigger where tgrelid='public.public_profiles'::regclass and not tgisinternal)
) as profile_image_preflight;
