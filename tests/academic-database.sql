-- Run after the academic migration inside a transaction; always roll back fixtures.
do $$ begin
 if (select count(*) from public.subject_components)<>113 then raise exception 'Catalog count mismatch'; end if;
 if (select count(*) from public.subject_components where parent_code is not null)<>38 then raise exception 'Lab count mismatch'; end if;
 if exists(select 1 from public.subject_components where active and (track is not null or code like 'IT Elective%' or code like 'NSTP%' or code='add101')) then raise exception 'Unresolved catalog entry enabled'; end if;
end $$;
create function pg_temp.expect_error(statement text, pattern text) returns void language plpgsql as $$
begin
 begin execute statement; exception when others then
   if sqlerrm ilike '%'||pattern||'%' then return; end if;
   raise;
 end;
 raise exception 'Expected rejection: %',pattern;
end $$;
insert into auth.users(id,email,email_confirmed_at) values
 ('71000000-0000-4000-8000-000000000001','registrar@academic-test.invalid',now()),
 ('71000000-0000-4000-8000-000000000002','instructor1@academic-test.invalid',now()),
 ('71000000-0000-4000-8000-000000000003','instructor2@academic-test.invalid',now()),
 ('71000000-0000-4000-8000-000000000004','pending@academic-test.invalid',null);
insert into public.account_roles values
 ('71000000-0000-4000-8000-000000000001','registrar'),
 ('71000000-0000-4000-8000-000000000002','instructor'),
 ('71000000-0000-4000-8000-000000000003','instructor'),
 ('71000000-0000-4000-8000-000000000004','instructor');
insert into public.instructors(id,user_id,instructor_code,name,active) values
 ('72000000-0000-4000-8000-000000000001','71000000-0000-4000-8000-000000000002','TEST-1','Test One',true),
 ('72000000-0000-4000-8000-000000000002','71000000-0000-4000-8000-000000000003','TEST-2','Test Two',true),
 ('72000000-0000-4000-8000-000000000003','71000000-0000-4000-8000-000000000004','TEST-P','Test Pending',true);
insert into public.academic_terms(id,name,starts_on,ends_on,semester)
 values('73000000-0000-4000-8000-000000000001','TEST academic term','2031-01-01','2031-05-31',1);
insert into public.class_sections(id,term_id,curriculum_id,name,year_level)
 values('74000000-0000-4000-8000-000000000001','73000000-0000-4000-8000-000000000001','bsit-provisional-2026','TEST BSIT 1A',1);
set local role authenticated;
select set_config('request.jwt.claim.sub','71000000-0000-4000-8000-000000000001',true);
select pg_temp.expect_error($q$insert into public.instructors(name) values('Forbidden')$q$,'permission denied');
select pg_temp.expect_error($q$insert into public.account_roles values(auth.uid(),'administrator')$q$,'permission denied');
select pg_temp.expect_error($q$insert into public.subject_components(curriculum_id,code,title,units) values('bsit-provisional-2026','BAD','BAD',3)$q$,'permission denied');
select pg_temp.expect_error($q$select public.provision_instructor('instructor1@academic-test.invalid','bad','Bad',true)$q$,'Administrator access');
select pg_temp.expect_error($q$select public.save_class_booking(null,'74000000-0000-4000-8000-000000000001','ITCC41','ITCC41','empty','72000000-0000-4000-8000-000000000001','g1',20,true,null)$q$,'150 meeting dates');
select public.save_class_booking(null,'74000000-0000-4000-8000-000000000001','ITCC41','ITCC41','00123','72000000-0000-4000-8000-000000000001','g1',20,true,
 '[{"start":"2031-01-06T09:00:00+08:00","end":"2031-01-06T10:00:00+08:00"}]');
select public.save_class_booking(null,'74000000-0000-4000-8000-000000000001','ITCC41','ITCC41A','00123','72000000-0000-4000-8000-000000000002','s4',20,false,
 '[{"start":"2031-01-06T10:00:00+08:00","end":"2031-01-06T12:00:00+08:00"}]');
do $$ begin
 if (select count(*) from public.subject_offerings where class_code='00123')<>1 then raise exception 'Offering duplicated'; end if;
 if (select count(*) from public.bookings where class_code='00123' and units=0 and subject_code='ITCC41A')<>1 then raise exception 'Lab units/link incorrect'; end if;
end $$;
select pg_temp.expect_error($q$select public.save_class_booking(null,'74000000-0000-4000-8000-000000000001','ITCC41','ITCC44A','bad-parent','72000000-0000-4000-8000-000000000001','g2',20,true,'[{"start":"2031-01-07T09:00:00+08:00","end":"2031-01-07T10:00:00+08:00"}]')$q$,'component');
select pg_temp.expect_error($q$select public.save_class_booking(null,'74000000-0000-4000-8000-000000000001','ITCC41','ITCC45','bad-main','72000000-0000-4000-8000-000000000001','g2',20,true,'[{"start":"2031-01-07T09:00:00+08:00","end":"2031-01-07T10:00:00+08:00"}]')$q$,'component');
select pg_temp.expect_error($q$select public.save_class_booking(null,'74000000-0000-4000-8000-000000000001','ITCC45','ITCC45','bad-year','72000000-0000-4000-8000-000000000001','g2',20,true,'[{"start":"2031-01-07T09:00:00+08:00","end":"2031-01-07T10:00:00+08:00"}]')$q$,'year, semester');
select pg_temp.expect_error($q$select public.save_class_booking(null,'74000000-0000-4000-8000-000000000001','ITCC41','ITCC41','room-conflict','72000000-0000-4000-8000-000000000002','g1',20,true,'[{"start":"2031-01-06T09:30:00+08:00","end":"2031-01-06T10:30:00+08:00"}]')$q$,'exclusion constraint');
select pg_temp.expect_error($q$select public.save_class_booking(null,'74000000-0000-4000-8000-000000000001','ITCC41','ITCC41','pending','72000000-0000-4000-8000-000000000003','g2',20,true,'[{"start":"2031-01-07T09:00:00+08:00","end":"2031-01-07T10:00:00+08:00"}]')$q$,'confirmed account');
select pg_temp.expect_error($q$select public.save_class_booking(null,'74000000-0000-4000-8000-000000000001','ITCC41','ITCC41','term','72000000-0000-4000-8000-000000000001','g2',20,true,'[{"start":"2032-01-07T09:00:00+08:00","end":"2032-01-07T10:00:00+08:00"}]')$q$,'term dates');
select pg_temp.expect_error($q$select public.save_class_booking(null,'74000000-0000-4000-8000-000000000001','ITCC41','ITCC41','capacity','72000000-0000-4000-8000-000000000001','g2',41,true,'[{"start":"2031-01-07T09:00:00+08:00","end":"2031-01-07T10:00:00+08:00"}]')$q$,'capacity');
select pg_temp.expect_error($q$select public.save_class_booking(null,'74000000-0000-4000-8000-000000000001','ITCC41','ITCC41','overnight','72000000-0000-4000-8000-000000000001','g2',20,true,'[{"start":"2031-01-07T23:00:00+08:00","end":"2031-01-08T01:00:00+08:00"}]')$q$,'same_day_booking');
select public.save_class_booking(null,'74000000-0000-4000-8000-000000000001','ITCC41','ITCC41','adjacent','72000000-0000-4000-8000-000000000001','g1',20,true,
 '[{"start":"2031-01-06T10:00:00+08:00","end":"2031-01-06T11:00:00+08:00"}]');
insert into public.bookings(id,kind,room_id,title,instructor_name,starts_at,ends_at,class_size,published)
 values('75000000-0000-4000-8000-000000000001','activity','g4','TEST legacy mapping','Activity','2031-01-08T09:00:00+08:00','2031-01-08T10:00:00+08:00',20,false);
update public.bookings set kind='legacy' where id='75000000-0000-4000-8000-000000000001';
select pg_temp.expect_error($q$update public.bookings set published=true where id='75000000-0000-4000-8000-000000000001'$q$,'Map this legacy');
select public.save_class_booking('75000000-0000-4000-8000-000000000001','74000000-0000-4000-8000-000000000001','ITCC41','ITCC41','mapped','72000000-0000-4000-8000-000000000001','g4',20,false,
 '[{"start":"2031-01-08T09:00:00+08:00","end":"2031-01-08T10:00:00+08:00"}]');
select pg_temp.expect_error($q$select public.save_class_booking(null,'74000000-0000-4000-8000-000000000001','ITCC41','ITCC41','atomic','72000000-0000-4000-8000-000000000001','g2',20,true,'[{"start":"2031-01-05T09:00:00+08:00","end":"2031-01-05T10:00:00+08:00"},{"start":"2031-01-06T09:30:00+08:00","end":"2031-01-06T10:30:00+08:00"}]')$q$,'instructor_no_overlap');
do $$ begin if exists(select 1 from public.subject_offerings where class_code='atomic') then raise exception 'Partial batch offering saved'; end if; end $$;
-- Posted metadata cannot replace canonical values.
update public.bookings set units=999,subject_name='Forged',year_level=4 where class_code='00123';
do $$ begin if exists(select 1 from public.bookings where class_code='00123' and (units=999 or subject_name='Forged' or year_level<>1)) then raise exception 'Canonical metadata overwritten'; end if; end $$;
-- One instructor sees only their draft/assignment, and cannot change anything.
select set_config('request.jwt.claim.sub','71000000-0000-4000-8000-000000000003',true);
do $$ begin
 if (select count(*) from public.bookings where class_code='00123')<>1 then raise exception 'Instructor draft isolation failed'; end if;
 if exists(select 1 from public.bookings where class_code='00123' and subject_code='ITCC41') then raise exception 'Colleague assignment leaked'; end if;
 if (select count(*) from public.instructors where instructor_code like 'TEST-%')<>1 then raise exception 'Colleague contacts leaked'; end if;
 update public.bookings set published=true where class_code='00123';
 if found then raise exception 'Instructor changed schedule'; end if;
end $$;
select pg_temp.expect_error($q$select public.save_class_booking(null,'74000000-0000-4000-8000-000000000001','ITCC41','ITCC41','bad-role','72000000-0000-4000-8000-000000000002','g2',20,true,'[{"start":"2031-01-09T09:00:00+08:00","end":"2031-01-09T10:00:00+08:00"}]')$q$,'Registrar access');
set local role anon;
do $$ begin
 if (select count(*) from public.published_schedule where class_code='00123')<>1 then raise exception 'Public draft leaked'; end if;
end $$;
select pg_temp.expect_error($q$select * from public.instructors$q$,'permission denied');
reset role;
-- Administrator privileges do not imply registrar scheduling privileges.
insert into public.account_roles values('71000000-0000-4000-8000-000000000003','administrator');
set local role authenticated;
select set_config('request.jwt.claim.sub','71000000-0000-4000-8000-000000000003',true);
select public.provision_instructor('instructor2@academic-test.invalid','TEST-2','Test Two',true);
select pg_temp.expect_error($q$select public.save_class_booking(null,'74000000-0000-4000-8000-000000000001','ITCC41','ITCC41','admin-no-registrar','72000000-0000-4000-8000-000000000002','g2',20,true,'[{"start":"2031-01-09T09:00:00+08:00","end":"2031-01-09T10:00:00+08:00"}]')$q$,'Registrar access');
reset role;
-- Deactivation retains history and prevents new assignments; unpublish remains possible.
update auth.users set banned_until=now()+interval '1 day' where id='71000000-0000-4000-8000-000000000002';
set local role authenticated;
select set_config('request.jwt.claim.sub','71000000-0000-4000-8000-000000000003',true);
select public.provision_instructor('instructor1@academic-test.invalid','TEST-1','Test One',false);
reset role;
do $$ begin if (select active from public.instructors where id='72000000-0000-4000-8000-000000000001') then raise exception 'Banned profile deactivation failed'; end if; end $$;
update public.instructors set active=false where id='72000000-0000-4000-8000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.sub','71000000-0000-4000-8000-000000000001',true);
select pg_temp.expect_error($q$select public.save_class_booking(null,'74000000-0000-4000-8000-000000000001','ITCC41','ITCC41','inactive','72000000-0000-4000-8000-000000000001','g2',20,true,'[{"start":"2031-01-09T09:00:00+08:00","end":"2031-01-09T10:00:00+08:00"}]')$q$,'confirmed account');
update public.bookings set published=false where class_code='00123' and published;
reset role;
select 'Academic role, catalog, allocation and transaction checks passed' as result;
