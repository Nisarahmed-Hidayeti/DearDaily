-- Counts only. Execute in the owner SQL editor after confirming the target project.
begin read only;

select bucket_id, count(*) as objects,
       sum(coalesce((metadata->>'size')::bigint, 0)) as bytes
from storage.objects
where bucket_id in ('deardaily-private', 'deardaily-story-media',
                    'deardaily-voice-private', 'deardaily-voice-public')
group by bucket_id
order by bucket_id;

select 'journal_pending_over_24h' as category, count(*) from public.private_media
where status = 'pending' and created_at < now() - interval '24 hours'
union all
select 'profile_pending_over_24h', count(*) from public.profile_image_assets
where status = 'pending' and created_at < now() - interval '24 hours'
union all
select 'voice_pending_over_24h', count(*) from deardaily_private.voice_assets
where not ready and created_at < now() - interval '24 hours'
union all
select 'image_deletion_queue', count(*) from public.media_gc
union all
select 'voice_deletion_queue', count(*) from deardaily_private.voice_gc;

rollback;
