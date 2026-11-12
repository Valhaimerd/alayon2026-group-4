drop policy published_read on public.bookings;
alter table public.sms_notifications drop constraint sms_notifications_state_check;
alter table public.sms_notifications add constraint sms_notifications_state_check check(state in ('pending','queued','failed','superseded'));
create or replace function public.queue_schedule_notice() returns trigger language plpgsql set search_path='' as $$
begin
 if old.published is distinct from new.published or old.room_id is distinct from new.room_id or old.starts_at is distinct from new.starts_at or old.ends_at is distinct from new.ends_at or old.instructor_id is distinct from new.instructor_id or old.title is distinct from new.title then
 update public.sms_notifications set state='superseded' where booking_id=new.id and state in ('pending','failed');
 end if;
 if old.published and new.published and new.instructor_id is not null and
 (old.room_id is distinct from new.room_id or old.starts_at is distinct from new.starts_at or old.ends_at is distinct from new.ends_at) then
 insert into public.sms_notifications(booking_id,instructor_id,title,room_name,starts_at)
 select new.id,new.instructor_id,new.title,r.name,new.starts_at from public.rooms r
 where r.id=new.room_id and exists(select 1 from public.instructors i where i.id=new.instructor_id and i.consent and i.phone is not null);
 end if;
 return new;
end $$;
