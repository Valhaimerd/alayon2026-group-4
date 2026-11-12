-- Run once as the project administrator after creating and confirming the Auth user.
-- This is account provisioning, not a schema migration. Do not expose it as an app endpoint.
-- Replace the placeholder email below with the intended staff account before running.
do $$
declare
  target_email text := 'staff@example.com';
  staff_id uuid;
  confirmed boolean;
begin
  select id, email_confirmed_at is not null into staff_id, confirmed
  from auth.users where lower(email) = lower(target_email);
  if staff_id is null then
    raise exception 'Create the Auth account for % first', target_email;
  end if;
  if not confirmed then
    raise exception 'Confirm the Auth account email before granting staff access';
  end if;
  insert into public.staff_members(user_id) values(staff_id)
  on conflict(user_id) do nothing;
end $$;
