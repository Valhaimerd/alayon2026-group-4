-- Run through trusted administrator SQL access after creating/confirming the initial account.
-- Scheduling authority is independent: this script grants administrator + registrar explicitly.
do $$
declare account_id uuid;
begin
 select u.id into account_id from auth.users u join public.staff_members s on s.user_id=u.id
 where lower(u.email)='valhaimerd@gmail.com' and u.email_confirmed_at is not null;
 if account_id is null then raise exception 'Confirmed initial staff account not found'; end if;
 insert into public.account_roles(user_id,role) values(account_id,'administrator'),(account_id,'registrar') on conflict do nothing;
end $$;
