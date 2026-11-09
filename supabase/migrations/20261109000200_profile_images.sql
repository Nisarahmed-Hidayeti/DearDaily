-- Additive profile images. Existing journal registries, objects and policies are untouched.
-- Both existing image buckets stay private and gateway-only.
create table public.profile_image_assets (
 id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade,
 kind text not null check(kind in ('avatar','banner')), object_key text not null unique,
 status text not null default 'pending' check(status in ('pending','ready')),
 bytes integer not null check(bytes between 1 and 2097152),
 width integer, height integer, created_at timestamptz not null default now(),
 unique(id,user_id), check(object_key='profile/'||user_id::text||'/'||id::text||'.webp'),
 check((width is null and height is null) or (width between 1 and 1600 and height between 1 and 1600)),
 check(kind<>'avatar' or width is null or (width=512 and height=512))
);
create index profile_image_assets_owner on public.profile_image_assets(user_id,created_at);
create table public.profile_image_copies (
 id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade,
 asset_id uuid not null, kind text not null check(kind in ('avatar','banner')),
 object_key text not null unique, bytes integer not null check(bytes between 1 and 2097152),
 created_at timestamptz not null default now(),
 foreign key(asset_id,user_id) references public.profile_image_assets(id,user_id) on delete cascade,
 check(object_key='profile/'||id::text||'.webp')
);
create index profile_image_copies_owner on public.profile_image_copies(user_id,asset_id);
create table public.profile_image_settings (
 user_id uuid primary key references auth.users(id) on delete cascade,
 avatar_asset uuid references public.profile_image_assets(id) on delete set null,
 banner_asset uuid references public.profile_image_assets(id) on delete set null,
 avatar_copy uuid references public.profile_image_copies(id) on delete set null,
 banner_copy uuid references public.profile_image_copies(id) on delete set null,
 banner_position integer not null default 50 check(banner_position between 0 and 100),
 version bigint not null default 1 check(version>0)
);
alter table public.profile_image_assets enable row level security;
alter table public.profile_image_assets force row level security;
alter table public.profile_image_copies enable row level security;
alter table public.profile_image_copies force row level security;
alter table public.profile_image_settings enable row level security;
alter table public.profile_image_settings force row level security;
revoke all on public.profile_image_assets,public.profile_image_copies,public.profile_image_settings from public,anon,authenticated;
grant all on public.profile_image_assets,public.profile_image_copies,public.profile_image_settings to service_role;

create function public.reserve_profile_image(media uuid, slot text, byte_count integer) returns uuid
language plpgsql security definer set search_path='' as $$
declare who uuid=auth.uid();begin
 if who is null then raise exception 'Sign in required' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended('profile-images',91));
 if slot not in ('avatar','banner') or slot is null or byte_count is null or byte_count not between 1 and 2097152 then raise exception 'Invalid profile image' using errcode='23514';end if;
 if (select count(*) from public.profile_image_assets where user_id=who)>=12
 or (select coalesce(sum(bytes),0) from public.profile_image_assets where user_id=who)+byte_count>16777216
 or (select coalesce(sum(bytes),0) from public.profile_image_assets)+byte_count>134217728 then raise exception 'Profile image quota reached' using errcode='54000';end if;
 insert into public.profile_image_assets(id,user_id,kind,object_key,bytes)
 values(media,who,slot,'profile/'||who::text||'/'||media::text||'.webp',byte_count);
 return media;
end $$;

create function public.reserve_profile_image_copy(who uuid, asset uuid, copy uuid) returns text
language plpgsql security definer set search_path='' as $$
declare item public.profile_image_assets;begin
 perform pg_advisory_xact_lock(hashtextextended('profile-images',91));
 select * into item from public.profile_image_assets where id=asset and user_id=who and status='ready';
 if not found then raise exception 'Image unavailable' using errcode='42501';end if;
 if (select count(*) from public.profile_image_copies where user_id=who)>=12
 or (select coalesce(sum(bytes),0) from public.profile_image_copies)+item.bytes>134217728 then raise exception 'Profile copy quota reached' using errcode='54000';end if;
 insert into public.profile_image_copies(id,user_id,asset_id,kind,object_key,bytes)
 values(copy,who,asset,item.kind,'profile/'||copy::text||'.webp',item.bytes);
 return 'profile/'||copy::text||'.webp';
end $$;

create function public.my_profile_images() returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce((select jsonb_build_object('avatar_asset',avatar_asset,'banner_asset',banner_asset,
 'share_avatar',avatar_copy is not null,'share_banner',banner_copy is not null,
 'banner_position',banner_position,'version',version) from public.profile_image_settings where user_id=auth.uid() and auth.uid() is not null),
 jsonb_build_object('avatar_asset',null,'banner_asset',null,'share_avatar',false,'share_banner',false,'banner_position',50,'version',0));
$$;

-- Public interface has only independently randomized public IDs and the deliberate crop.
create function public.public_profile_images(handle text) returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('avatar',s.avatar_copy,'banner',s.banner_copy,'banner_position',case when s.banner_copy is null then 50 else s.banner_position end)
 from public.profile_image_settings s join public.public_profiles p on p.user_id=s.user_id
 where p.username=handle and p.visible;
$$;

-- Service-only resolution; every public GET rechecks current visibility and consent.
create function public.public_profile_image_record(media uuid) returns text language sql stable security definer set search_path='' as $$
 select c.object_key from public.profile_image_copies c join public.profile_image_settings s on s.user_id=c.user_id
 join public.public_profiles p on p.user_id=c.user_id
 where c.id=media and p.visible and (s.avatar_copy=c.id or s.banner_copy=c.id);
$$;

create function public.commit_profile_images(who uuid, expected_version bigint, avatar uuid, banner uuid,
 public_avatar uuid, public_banner uuid, focal integer) returns void
language plpgsql security definer set search_path='' as $$
declare current_version bigint;begin
 -- Serialize with hide/delete; never republish while a concurrent hide commits.
 perform 1 from public.public_profiles where user_id=who for share;
 perform pg_advisory_xact_lock(hashtextextended('profile-images',91));
 select version into current_version from public.profile_image_settings where user_id=who for update;
 if coalesce(current_version,0)<>expected_version or expected_version is null then raise exception 'Profile images changed; reload before saving' using errcode='40001';end if;
 if focal is null or focal not between 0 and 100 then raise exception 'Invalid crop' using errcode='23514';end if;
 if avatar is not null and not exists(select 1 from public.profile_image_assets where id=avatar and user_id=who and kind='avatar' and status='ready') then raise exception 'Avatar unavailable' using errcode='42501';end if;
 if banner is not null and not exists(select 1 from public.profile_image_assets where id=banner and user_id=who and kind='banner' and status='ready') then raise exception 'Banner unavailable' using errcode='42501';end if;
 if public_avatar is not null and not exists(select 1 from public.profile_image_copies where id=public_avatar and asset_id=avatar and user_id=who and kind='avatar') then raise exception 'Public avatar unavailable' using errcode='42501';end if;
 if public_banner is not null and not exists(select 1 from public.profile_image_copies where id=public_banner and asset_id=banner and user_id=who and kind='banner') then raise exception 'Public banner unavailable' using errcode='42501';end if;
 if (public_avatar is not null or public_banner is not null) and not exists(select 1 from public.public_profiles where user_id=who and visible) then raise exception 'Public profile is hidden' using errcode='42501';end if;
 insert into public.profile_image_settings(user_id,avatar_asset,banner_asset,avatar_copy,banner_copy,banner_position,version)
 values(who,avatar,banner,public_avatar,public_banner,focal,coalesce(current_version,0)+1)
 on conflict(user_id) do update set avatar_asset=excluded.avatar_asset,banner_asset=excluded.banner_asset,
 avatar_copy=excluded.avatar_copy,banner_copy=excluded.banner_copy,banner_position=excluded.banner_position,version=excluded.version;
 -- Exact replaced public copies lose authorization now. Objects are queued separately.
 delete from public.profile_image_copies where user_id=who and id is distinct from public_avatar and id is distinct from public_banner;
end $$;

create function public.queue_profile_image_cleanup() returns trigger language plpgsql security definer set search_path='' as $$begin
 insert into public.media_gc(user_id,bucket,object_key) values(old.user_id,
 case when tg_table_name='profile_image_assets' then 'deardaily-private' else 'deardaily-story-media' end,old.object_key);
 return old;end $$;
create trigger profile_image_asset_gc after delete on public.profile_image_assets for each row execute function public.queue_profile_image_cleanup();
create trigger profile_image_copy_gc after delete on public.profile_image_copies for each row execute function public.queue_profile_image_cleanup();

create function public.hide_profile_images() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_op='DELETE' or (old.visible and not new.visible) then
  perform pg_advisory_xact_lock(hashtextextended('profile-images',91));
  update public.profile_image_settings set avatar_copy=null,banner_copy=null,version=version+1 where user_id=old.user_id;
  delete from public.profile_image_copies where user_id=old.user_id;
 end if;
 return null;
end $$;
create trigger revoke_hidden_profile_images after update of visible or delete on public.public_profiles for each row execute function public.hide_profile_images();

create function public.prune_profile_images() returns integer language plpgsql security definer set search_path='' as $$
declare who uuid=auth.uid();n integer;begin
 if who is null then raise exception 'Sign in required' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended('profile-images',91));
 delete from public.profile_image_copies c where user_id=who and created_at<now()-interval '1 hour'
 and not exists(select 1 from public.profile_image_settings s where s.user_id=who and (s.avatar_copy=c.id or s.banner_copy=c.id));
 delete from public.profile_image_assets a where user_id=who and created_at<now()-interval '1 hour'
 and not exists(select 1 from public.profile_image_settings s where s.user_id=who and (s.avatar_asset=a.id or s.banner_asset=a.id))
 and not exists(select 1 from public.profile_image_copies c where c.asset_id=a.id);
 get diagnostics n=row_count;return n;
end $$;

revoke all on function public.reserve_profile_image(uuid,text,integer),public.reserve_profile_image_copy(uuid,uuid,uuid),public.my_profile_images(),public.public_profile_images(text),public.public_profile_image_record(uuid),public.commit_profile_images(uuid,bigint,uuid,uuid,uuid,uuid,integer),public.queue_profile_image_cleanup(),public.hide_profile_images(),public.prune_profile_images() from public,anon,authenticated;
grant execute on function public.reserve_profile_image(uuid,text,integer),public.my_profile_images(),public.prune_profile_images() to authenticated;
grant execute on function public.public_profile_images(text) to anon,authenticated;
grant execute on function public.reserve_profile_image_copy(uuid,uuid,uuid),public.public_profile_image_record(uuid),public.commit_profile_images(uuid,bigint,uuid,uuid,uuid,uuid,integer) to service_role;
