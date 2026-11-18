-- Add the selectable first-floor Conference Room under a stable room ID.
-- 25 is the user-specified provisional maximum; official capacity is unconfirmed.
-- Existing booking capacity checks enforce this maximum without bypassing RLS.
insert into public.rooms (id, name, capacity, floor)
values ('g5', 'Conference Room', 25, 0)
on conflict (id) do nothing;
