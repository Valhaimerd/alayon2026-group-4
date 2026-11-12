-- Run inside BEGIN/ROLLBACK on an authorized test target. No SMS is sent.
update private.account_sms_config set secret_hash=encode(sha256(convert_to('test-server-secret','UTF8')),'hex');
insert into auth.users(id,email,email_confirmed_at) values('81000000-0000-4000-8000-000000000001','sms-test@example.invalid',now());
insert into public.account_roles values('81000000-0000-4000-8000-000000000001','instructor');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"81000000-0000-4000-8000-000000000001","session_id":"test-session-one","aal":"aal1"}',true);
create function pg_temp.sms_assert(condition boolean) returns void language plpgsql as $$ begin if condition is distinct from true then raise exception 'SMS MFA assertion failed'; end if; end $$;
select pg_temp.sms_assert(public.account_mfa_verified());
do $$ begin
 begin
   perform public.start_account_sms('wrong-secret','82000000-0000-4000-8000-000000000001',repeat('a',64),'+639934593138');
   raise exception 'Server credential bypass';
 exception when insufficient_privilege then null; end;
end $$;
select pg_temp.sms_assert((public.start_account_sms('test-server-secret','82000000-0000-4000-8000-000000000001',repeat('a',64),'+639934593138')->>'ok')::boolean);
select pg_temp.sms_assert(public.start_account_sms('test-server-secret','82000000-0000-4000-8000-000000000002',repeat('a',64),'+639934593138')->>'reason'='cooldown');
select pg_temp.sms_assert(public.verify_account_sms('test-server-secret','82000000-0000-4000-8000-000000000001',repeat('a',64))->>'reason'='expired');
select public.account_sms_delivery('test-server-secret','82000000-0000-4000-8000-000000000001',true);
select pg_temp.sms_assert(public.account_sms_status()->'pending'->>'id'='82000000-0000-4000-8000-000000000001');
select pg_temp.sms_assert(public.verify_account_sms('test-server-secret','82000000-0000-4000-8000-000000000001',repeat('b',64))->>'reason'='incorrect');
select pg_temp.sms_assert((public.verify_account_sms('test-server-secret','82000000-0000-4000-8000-000000000001',repeat('a',64))->>'ok')::boolean);
select pg_temp.sms_assert((public.account_sms_status()->>'enabled')::boolean);
select pg_temp.sms_assert(public.account_sms_status()->>'phone'=repeat(chr(8226),4)||' 3138');
select pg_temp.sms_assert(public.account_mfa_verified());
select pg_temp.sms_assert(public.verify_account_sms('test-server-secret','82000000-0000-4000-8000-000000000001',repeat('a',64))->>'reason'='expired');
-- Another session cannot reuse the first session's verification or disable MFA.
select set_config('request.jwt.claims','{"sub":"81000000-0000-4000-8000-000000000001","session_id":"test-session-two","aal":"aal1"}',true);
select pg_temp.sms_assert(not public.account_mfa_verified());
select pg_temp.sms_assert(public.account_sms_status()->'pending'='null'::jsonb);
select pg_temp.sms_assert(not public.has_role('instructor'));
select pg_temp.sms_assert(not exists(select 1 from public.account_roles));
select pg_temp.sms_assert(not public.disable_account_sms('test-server-secret'));
reset role;
update private.account_sms_settings set last_sent=now()-interval '61 seconds' where user_id='81000000-0000-4000-8000-000000000001';
set local role authenticated;
select public.start_account_sms('test-server-secret','82000000-0000-4000-8000-000000000002',repeat('a',64));
select public.account_sms_delivery('test-server-secret','82000000-0000-4000-8000-000000000002',true);
-- A challenge belongs to exactly one session, with no attempts consumed by another.
select set_config('request.jwt.claims','{"sub":"81000000-0000-4000-8000-000000000001","session_id":"test-session-three","aal":"aal1"}',true);
select pg_temp.sms_assert(public.verify_account_sms('test-server-secret','82000000-0000-4000-8000-000000000002',repeat('a',64))->>'reason'='expired');
select set_config('request.jwt.claims','{"sub":"81000000-0000-4000-8000-000000000001","session_id":"test-session-two","aal":"aal1"}',true);
do $$ begin for n in 1..5 loop perform public.verify_account_sms('test-server-secret','82000000-0000-4000-8000-000000000002',repeat('b',64)); end loop; end $$;
select pg_temp.sms_assert(public.verify_account_sms('test-server-secret','82000000-0000-4000-8000-000000000002',repeat('a',64))->>'reason'='expired');
reset role;
update private.account_sms_challenges set attempts=0,expires_at=now()-interval '1 second' where user_id='81000000-0000-4000-8000-000000000001';
set local role authenticated;
select pg_temp.sms_assert(public.verify_account_sms('test-server-secret','82000000-0000-4000-8000-000000000002',repeat('a',64))->>'reason'='expired');
reset role;
update private.account_sms_settings set last_sent=now()-interval '61 seconds',sent_count=10,sent_on=current_date where user_id='81000000-0000-4000-8000-000000000001';
set local role authenticated;
select pg_temp.sms_assert(public.start_account_sms('test-server-secret','82000000-0000-4000-8000-000000000003',repeat('a',64))->>'reason'='daily_limit');
-- The verified session can disable SMS; stale sessions then have ordinary access.
select set_config('request.jwt.claims','{"sub":"81000000-0000-4000-8000-000000000001","session_id":"test-session-one","aal":"aal1"}',true);
select pg_temp.sms_assert(public.disable_account_sms('test-server-secret'));
select pg_temp.sms_assert(not (public.account_sms_status()->>'enabled')::boolean);
reset role;
select 'SMS MFA credential, session, replay, attempt, delivery, rate and expiry checks passed' as result;
