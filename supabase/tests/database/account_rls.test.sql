begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select no_plan();
-- Transaction-scoped fixtures; no real accounts or credentials.
insert into auth.users (id) values
 ('00000000-0000-0000-0000-000000000001'),
 ('00000000-0000-0000-0000-000000000002');
select ok((select relrowsecurity from pg_class where oid='public.profiles'::regclass), 'profiles RLS enabled');
select ok((select relrowsecurity from pg_class where oid='public.user_settings'::regclass), 'settings RLS enabled');
select is((select count(*)::int from pg_policies where schemaname='public' and tablename in ('profiles','user_settings')), 8, 'explicit per-operation policies');
select ok(not has_table_privilege('anon','public.profiles','SELECT'), 'anonymous profile grants revoked');
select ok(not has_table_privilege('anon','public.user_settings','SELECT'), 'anonymous settings grants revoked');
select ok(not has_column_privilege('authenticated','public.profiles','id','UPDATE'), 'profile owner update denied');
select ok(not has_column_privilege('authenticated','public.user_settings','user_id','UPDATE'), 'settings owner cannot be changed');

set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}',true);
select lives_ok($$insert into public.profiles(display_name) values ('Writer A')$$, 'A creates own profile');
select lives_ok($$insert into public.user_settings(theme_id) values ('forest-green')$$, 'A creates own settings');
select is((select id from public.profiles)::text, '00000000-0000-0000-0000-000000000001', 'profile ownership derives from auth.uid');
select is((select user_id from public.user_settings)::text, '00000000-0000-0000-0000-000000000001', 'settings ownership derives from auth.uid');
select is((select theme_id from public.user_settings), 'forest-green', 'A reads own settings');
select lives_ok($$update public.profiles set display_name='Writer A updated'$$, 'A updates own profile');
select lives_ok($$update public.user_settings set theme_id='paper-white'$$, 'A updates own theme');
select throws_ok($$update public.user_settings set theme_id='invalid'$$, '23514', null, 'invalid theme rejected');
select is((select theme_id from public.user_settings), 'paper-white', 'rejected theme leaves original value intact');
select throws_ok($$update public.profiles set id='00000000-0000-0000-0000-000000000002'$$, '42501', null, 'profile ownership immutable');
select throws_ok($$update public.user_settings set user_id='00000000-0000-0000-0000-000000000002'$$, '42501', null, 'settings ownership immutable');
select throws_ok($$insert into public.profiles(id,display_name) values ('00000000-0000-0000-0000-000000000002','spoof')$$, '42501', null, 'cannot insert profile for B');
select throws_ok($$insert into public.user_settings(user_id,theme_id) values ('00000000-0000-0000-0000-000000000002','obsidian-black')$$, '42501', null, 'cannot insert settings for B');
select throws_ok($$update public.profiles set created_at=now()$$, '42501', null, 'created timestamp cannot be forged');

select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}',true);
select is((select count(*)::int from public.profiles), 0, 'B cannot read A profile');
select is((select count(*)::int from public.user_settings), 0, 'B cannot read A settings');
select lives_ok($$update public.profiles set display_name='compromised' where id='00000000-0000-0000-0000-000000000001'$$, 'cross-user profile update matches no row');
select lives_ok($$update public.user_settings set theme_id='obsidian-black' where user_id='00000000-0000-0000-0000-000000000001'$$, 'cross-user settings update matches no row');
select lives_ok($$delete from public.profiles where id='00000000-0000-0000-0000-000000000001'$$, 'cross-user profile delete matches no row');
select lives_ok($$delete from public.user_settings where user_id='00000000-0000-0000-0000-000000000001'$$, 'cross-user settings delete matches no row');
select lives_ok($$insert into public.profiles(display_name) values ('Writer B')$$, 'B creates own profile');
select lives_ok($$insert into public.user_settings(theme_id) values ('midnight-purple')$$, 'B creates own settings');
select is((select count(*)::int from public.profiles), 1, 'B sees only own profile');
select lives_ok($$delete from public.profiles$$, 'B deletes own profile');
select lives_ok($$delete from public.user_settings$$, 'B deletes own settings');
select is((select count(*)::int from public.profiles), 0, 'B own profile deleted');
select is((select count(*)::int from public.user_settings), 0, 'B own settings deleted');

reset role;
select is((select display_name from public.profiles where id='00000000-0000-0000-0000-000000000001'), 'Writer A updated', 'A profile remains intact after B writes/deletes');
select is((select theme_id from public.user_settings where user_id='00000000-0000-0000-0000-000000000001'), 'paper-white', 'A settings remain intact after B writes/deletes');
select is((select count(*)::int from public.profiles), 1, 'exactly A profile remains');
select is((select count(*)::int from public.user_settings), 1, 'exactly A settings remain');

set local role anon;
select set_config('request.jwt.claims','{"role":"anon"}',true);
select throws_ok($$select * from public.profiles$$,'42501',null,'anon cannot select profiles');
select throws_ok($$select * from public.user_settings$$,'42501',null,'anon cannot select settings');
select throws_ok($$insert into public.profiles(display_name) values ('intruder')$$,'42501',null,'anon cannot insert profile');
select throws_ok($$insert into public.user_settings(theme_id) values ('forest-green')$$,'42501',null,'anon cannot insert settings');
select throws_ok($$update public.profiles set display_name='intruder'$$,'42501',null,'anon cannot update profile');
select throws_ok($$update public.user_settings set theme_id='forest-green'$$,'42501',null,'anon cannot update settings');
select throws_ok($$delete from public.profiles$$,'42501',null,'anon cannot delete profiles');
select throws_ok($$delete from public.user_settings$$,'42501',null,'anon cannot delete settings');

set local role authenticated;
select set_config('request.jwt.claims','{}',true);
select is((select count(*)::int from public.profiles), 0, 'missing identity reads no profiles');
select is((select count(*)::int from public.user_settings), 0, 'missing identity reads no settings');
select throws_ok($$insert into public.profiles(display_name) values ('missing')$$,null,null,'missing identity cannot insert profile');
select throws_ok($$insert into public.user_settings(theme_id) values ('forest-green')$$,null,null,'missing identity cannot insert settings');
select lives_ok($$update public.profiles set display_name='missing'$$,'missing identity update matches no profile');
select lives_ok($$update public.user_settings set theme_id='forest-green'$$,'missing identity update matches no settings');
select lives_ok($$delete from public.profiles$$,'missing identity delete matches no profile');
select lives_ok($$delete from public.user_settings$$,'missing identity delete matches no settings');

select set_config('request.jwt.claims','{"sub":"not-a-uuid","role":"authenticated"}',true);
select throws_ok($$select * from public.profiles$$,'22P02',null,'malformed identity cannot read profiles');
select throws_ok($$select * from public.user_settings$$,'22P02',null,'malformed identity cannot read settings');
select throws_ok($$insert into public.profiles(display_name) values ('invalid')$$,'22P02',null,'malformed identity cannot insert');
select throws_ok($$insert into public.user_settings(theme_id) values ('forest-green')$$,'22P02',null,'malformed identity cannot insert settings');
select throws_ok($$update public.profiles set display_name='invalid'$$,'22P02',null,'malformed identity cannot update');
select throws_ok($$update public.user_settings set theme_id='forest-green'$$,'22P02',null,'malformed identity cannot update settings');
select throws_ok($$delete from public.profiles$$,'22P02',null,'malformed identity cannot delete');
select throws_ok($$delete from public.user_settings$$,'22P02',null,'malformed identity cannot delete settings');

select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000099","role":"authenticated"}',true);
select is((select count(*)::int from public.profiles), 0, 'unknown valid UUID sees no profiles');
select throws_ok($$insert into public.profiles(display_name) values ('unknown')$$,'23503',null,'unknown identity violates auth FK');
select throws_ok($$insert into public.user_settings(theme_id) values ('forest-green')$$,'23503',null,'unknown settings identity violates auth FK');
reset role;
select is((select display_name from public.profiles), 'Writer A updated', 'unauthorized attempts did not alter profile');
select is((select theme_id from public.user_settings), 'paper-white', 'unauthorized attempts did not alter settings');
select is((select count(*)::int from public.profiles), 1, 'unauthorized attempts did not insert/delete profile');
select is((select count(*)::int from public.user_settings), 1, 'unauthorized attempts did not insert/delete settings');
delete from auth.users where id='00000000-0000-0000-0000-000000000001';
select is((select count(*)::int from public.profiles), 0, 'account deletion cascades to profiles');
select is((select count(*)::int from public.user_settings), 0, 'account deletion cascades to settings');
select * from finish();
rollback;
