alter table public.bookings add constraint same_day_booking check ((starts_at at time zone 'Asia/Manila')::date = (ends_at at time zone 'Asia/Manila')::date);
