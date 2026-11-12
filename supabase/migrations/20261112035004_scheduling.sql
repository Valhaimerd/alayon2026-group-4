create extension if not exists btree_gist;
create table public.staff_members (user_id uuid primary key references auth.users(id) on delete cascade);
alter table public.staff_members enable row level security;
create policy own_staff_role on public.staff_members for select to authenticated using(user_id=auth.uid());
create table public.rooms (
 id text primary key, name text not null, capacity integer not null check(capacity>0), floor integer not null
);
alter table public.rooms enable row level security;
create policy rooms_read on public.rooms for select to anon,authenticated using(true);
create table public.instructors (
 id uuid primary key default gen_random_uuid(), name text not null, phone text, consent boolean not null default false
);
alter table public.instructors enable row level security;
create policy instructors_staff on public.instructors for all to authenticated
 using(exists(select 1 from public.staff_members where user_id=auth.uid()))
 with check(exists(select 1 from public.staff_members where user_id=auth.uid()));
create table public.bookings (
 id uuid primary key default gen_random_uuid(), room_id text not null references public.rooms(id),
 title text not null check(length(trim(title)) between 1 and 200),
 instructor_id uuid references public.instructors(id), instructor_name text not null,
 starts_at timestamptz not null, ends_at timestamptz not null,
 class_size integer not null check(class_size>0), published boolean not null default false,
 created_by uuid not null default auth.uid() references auth.users(id),
 check(ends_at>starts_at),
 exclude using gist(room_id with =, tstzrange(starts_at,ends_at,'[)') with &&) where(published)
);
alter table public.bookings enable row level security;
create policy published_read on public.bookings for select to anon,authenticated using(published);
create policy bookings_staff on public.bookings for all to authenticated
 using(exists(select 1 from public.staff_members where user_id=auth.uid()))
 with check(exists(select 1 from public.staff_members where user_id=auth.uid()));
create table public.sms_notifications (
 id uuid primary key default gen_random_uuid(), booking_id uuid not null references public.bookings(id),
 instructor_id uuid not null references public.instructors(id), title text not null, room_name text not null,
 starts_at timestamptz not null, state text not null default 'pending' check(state in ('pending','queued','failed')),
 provider_id text, created_at timestamptz not null default now()
);
alter table public.sms_notifications enable row level security;
create policy notifications_staff on public.sms_notifications for all to authenticated
 using(exists(select 1 from public.staff_members where user_id=auth.uid()))
 with check(exists(select 1 from public.staff_members where user_id=auth.uid()));
create function public.validate_room_booking() returns trigger language plpgsql set search_path='' as $$
declare capacity integer;
begin
 select r.capacity into capacity from public.rooms r where r.id=new.room_id;
 if new.published and new.class_size>capacity then raise exception 'Class size exceeds room capacity'; end if;
 return new;
end $$;
create trigger booking_capacity before insert or update on public.bookings for each row execute function public.validate_room_booking();
create function public.queue_schedule_notice() returns trigger language plpgsql set search_path='' as $$
begin
 if old.published and new.published and new.instructor_id is not null and
 (old.room_id is distinct from new.room_id or old.starts_at is distinct from new.starts_at or old.ends_at is distinct from new.ends_at) then
 insert into public.sms_notifications(booking_id,instructor_id,title,room_name,starts_at)
 select new.id,new.instructor_id,new.title,r.name,new.starts_at from public.rooms r
 where r.id=new.room_id and exists(select 1 from public.instructors i where i.id=new.instructor_id and i.consent and i.phone is not null);
 end if;
 return new;
end $$;
create trigger schedule_notice after update on public.bookings for each row execute function public.queue_schedule_notice();
revoke all on public.staff_members,public.rooms,public.instructors,public.bookings,public.sms_notifications from anon,authenticated;
grant select on public.staff_members,public.rooms to authenticated;
grant select on public.rooms to anon;
-- Public readers see a view with only published, nonprivate schedule fields.
create view public.published_schedule with (security_barrier=true) as
 select id,room_id,title,instructor_name,starts_at,ends_at from public.bookings where published;
revoke all on public.published_schedule from public;
grant select on public.published_schedule to anon,authenticated;
grant select,insert,update,delete on public.instructors,public.bookings to authenticated;
grant select,update on public.sms_notifications to authenticated;
-- Trigger inserts require the same staff-only policy.
grant insert on public.sms_notifications to authenticated;
insert into public.rooms(id,name,capacity,floor) values
('g1','Room G01',40,0),('g2','Room G02',40,0),('g3','Room G03',45,0),('g4','Room G04',35,0),
('s1','Room S01',40,1),('s2','Room S02',40,1),('s3','Room S03',40,1),
('s4','Computer lab 1',30,1),('s5','Computer lab 2',30,1),('s6','Computer lab 3',30,1),('s7','Room S07',25,1);
