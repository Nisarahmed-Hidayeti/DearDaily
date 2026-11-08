-- Run manually ONLY after project/identity preflight and explicit hosted approval.
-- Replace the placeholder in the SQL editor, never in frontend code or a migration.
begin;
set local deardaily.owner_email = 'REPLACE_WITH_VERIFIED_OWNER_EMAIL';
do $$
declare target uuid; wanted text;
begin
 wanted=lower(current_setting('deardaily.owner_email',true));
 if wanted is null or wanted='replace_with_verified_owner_email' then raise exception 'Verified owner email must be supplied'; end if;
 select id into strict target from auth.users where lower(email)=wanted and email_confirmed_at is not null;
 if exists(select 1 from deardaily_private.owners where user_id<>target) then raise exception 'Unexpected existing owner; stop for review'; end if;
 insert into deardaily_private.owners(user_id) values(target) on conflict(user_id) do nothing;
end $$;
commit;
