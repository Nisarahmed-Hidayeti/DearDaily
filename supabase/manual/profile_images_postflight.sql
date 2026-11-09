-- Read-only rollout verification. No row contents, credentials or private object paths.
select jsonb_build_object(
 'rls',(select jsonb_agg(jsonb_build_object('table',c.relname,'enabled',c.relrowsecurity,'forced',c.relforcerowsecurity)) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname in ('profile_image_assets','profile_image_copies','profile_image_settings','journal_entries','public_stories','public_profiles','private_media','story_media')),
 'private_buckets',(select bool_and(not public) from storage.buckets where id in ('deardaily-private','deardaily-story-media')),
 'registries_ungranted',not exists(select 1 from information_schema.role_table_grants where table_schema='public' and table_name in ('profile_image_assets','profile_image_copies','profile_image_settings') and grantee in ('anon','authenticated','PUBLIC')),
 'privileged_rpcs_ungranted',not exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace cross join lateral aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a where n.nspname='public' and p.proname in ('commit_profile_images','reserve_profile_image_copy','public_profile_image_record','hide_profile_images','queue_profile_image_cleanup') and (a.grantee=0 or a.grantee in (select oid from pg_roles where rolname in ('anon','authenticated')))),
 'journals',(select count(*) from public.journal_entries),
 'stories',(select count(*) from public.public_stories),
 'profiles',(select count(*) from public.public_profiles),
 'accounts',(select count(*) from auth.users),
 'profile_assets',(select count(*) from public.profile_image_assets),
 'profile_copies',(select count(*) from public.profile_image_copies),
 'profile_settings',(select count(*) from public.profile_image_settings),
 'profile_objects',(select count(*) from storage.objects where bucket_id in ('deardaily-private','deardaily-story-media') and name like 'profile/%'),
 'queued_profile_cleanup',(select count(*) from public.media_gc where object_key like 'profile/%'),
 'migration_ledger_absent',to_regclass('supabase_migrations.schema_migrations') is null
) as profile_image_postflight;
