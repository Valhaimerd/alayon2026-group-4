begin;
insert into auth.users(id,email) values('11111111-1111-4111-8111-111111111111','schedflow-rollback-test@example.invalid');
insert into public.staff_members(user_id) values('11111111-1111-4111-8111-111111111111');
set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);
insert into public.bookings(room_id,title,instructor_name,starts_at,ends_at,class_size,published)
values('g1','TEST rollback','Test','2030-01-01T09:00:00+08:00','2030-01-01T10:00:00+08:00',20,true),
('g1','TEST adjacent','Test','2030-01-01T10:00:00+08:00','2030-01-01T11:00:00+08:00',20,true),
('g1','TEST draft','Test','2030-01-01T09:00:00+08:00','2030-01-01T10:00:00+08:00',20,false);
do $$ begin
 begin
 insert into public.bookings(room_id,title,instructor_name,starts_at,ends_at,class_size,published)
 values('g1','TEST overlap','Test','2030-01-01T09:30:00+08:00','2030-01-01T10:30:00+08:00',20,true);
 raise exception 'Overlap was permitted';
 exception when exclusion_violation then null; end;
 begin
 insert into public.bookings(room_id,title,instructor_name,starts_at,ends_at,class_size,published)
 values('g2','TEST capacity','Test','2030-01-01T09:00:00+08:00','2030-01-01T10:00:00+08:00',41,true);
 raise exception 'Capacity was permitted';
 exception when raise_exception then if sqlerrm!='Class size exceeds room capacity' then raise; end if; end;
 begin
 insert into public.bookings(room_id,title,instructor_name,starts_at,ends_at,class_size,published)
 values('g2','TEST overnight','Test','2030-01-01T23:00:00+08:00','2030-01-02T01:00:00+08:00',20,true);
 raise exception 'Overnight booking permitted';
 exception when check_violation then null; end;
end $$;
set local role anon;
do $$ begin
 if (select count(*) from public.published_schedule where title like 'TEST %')!=2 then raise exception 'Public visibility incorrect'; end if;
 begin perform * from public.instructors; raise exception 'Private access permitted'; exception when insufficient_privilege then null; end;
end $$;
set local role authenticated;
insert into public.instructors(id,name,phone,consent) values('33333333-3333-4333-8333-333333333333','TEST','09123456789',true);
update public.bookings set instructor_id='33333333-3333-4333-8333-333333333333' where title='TEST rollback';
update public.bookings set starts_at='2030-01-01T08:00:00+08:00',ends_at='2030-01-01T09:00:00+08:00' where title='TEST rollback';
do $$ begin if (select count(*) from public.sms_notifications where title='TEST rollback' and state='pending')!=1 then raise exception 'Notice missing'; end if; end $$;
update public.bookings set published=false where title='TEST rollback';
do $$ begin if exists(select 1 from public.sms_notifications where title='TEST rollback' and state='pending') then raise exception 'Obsolete notice remained pending'; end if; end $$;
select set_config('request.jwt.claim.sub','22222222-2222-4222-8222-222222222222',true);
do $$ begin
 begin
 insert into public.bookings(room_id,title,instructor_name,starts_at,ends_at,class_size,published)
 values('g2','TEST forbidden','Test','2030-01-01T09:00:00+08:00','2030-01-01T10:00:00+08:00',20,true);
 raise exception 'Nonstaff write permitted';
 exception when insufficient_privilege then null; end;
 if (select count(*) from public.bookings where title='TEST draft')!=0 then raise exception 'Draft leaked'; end if;
 if (select count(*) from public.bookings)!=0 then raise exception 'Base booking data leaked'; end if;
end $$;
rollback;
