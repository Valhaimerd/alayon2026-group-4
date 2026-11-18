-- Confirmed room names; preserve IDs, geometry associations, capacities and bookings.
-- The first-floor upper row reads CISC Room 3 / 2 / 1 from left to right.
update public.rooms as room
set name = names.name
from (values
  ('g1', 'CISC Room 3'),
  ('g2', 'CISC Room 2'),
  ('g3', 'CISC Room 1'),
  ('g4', 'CISC Laboratory 11'),
  ('s1', 'CISC Laboratory 26'),
  ('s2', 'CISC Laboratory 25'),
  ('s3', 'CISC Laboratory 24'),
  ('s4', 'CISC Laboratory 23'),
  ('s5', 'CISC Laboratory 22'),
  ('s6', 'CISC Laboratory 21'),
  ('s7', 'CISC Training Room')
) as names(id, name)
where room.id = names.id;

-- Keep unsent notice snapshots aligned with the renamed physical room. This
-- changes only the room label, so dispatch still rejects stale time/room moves.
-- Queued/superseded notices retain their original historical text.
update public.sms_notifications as notice
set room_name = room.name
from public.bookings as booking
join public.rooms as room on room.id = booking.room_id
where notice.booking_id = booking.id
  and notice.state in ('pending', 'failed')
  and notice.room_name = case room.id
    when 'g1' then 'Room G01'
    when 'g2' then 'Room G02'
    when 'g3' then 'Room G03'
    when 'g4' then 'Room G04'
    when 's1' then 'Room S01'
    when 's2' then 'Room S02'
    when 's3' then 'Room S03'
    when 's4' then 'Computer lab 1'
    when 's5' then 'Computer lab 2'
    when 's6' then 'Computer lab 3'
    when 's7' then 'Room S07'
  end;
