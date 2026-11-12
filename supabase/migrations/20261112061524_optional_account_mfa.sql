-- MFA enrollment is optional. Enrolled accounts must verify before private access.
create function public.account_mfa_verified() returns boolean
language sql stable security definer set search_path='' as $$
 select (auth.jwt()->>'aal') = 'aal2' or not exists (
   select 1 from auth.mfa_factors where user_id=auth.uid() and status='verified'
 )
$$;
revoke all on function public.account_mfa_verified() from public,anon;
grant execute on function public.account_mfa_verified() to authenticated;

-- Security-definer RPCs and views also use has_role, so enforce MFA there.
create or replace function public.has_role(required_role text) returns boolean
language sql stable security definer set search_path='' as $$
 select public.account_mfa_verified() and exists (
   select 1 from public.account_roles where user_id=auth.uid() and role=required_role
 )
$$;

create policy roles_mfa on public.account_roles as restrictive for all to authenticated
 using(public.account_mfa_verified()) with check(public.account_mfa_verified());

create policy staff_mfa on public.staff_members as restrictive for all to authenticated
 using(public.account_mfa_verified()) with check(public.account_mfa_verified());
create policy instructors_mfa on public.instructors as restrictive for all to authenticated
 using(public.account_mfa_verified()) with check(public.account_mfa_verified());
create policy bookings_mfa on public.bookings as restrictive for all to authenticated
 using(public.account_mfa_verified()) with check(public.account_mfa_verified());
create policy notifications_mfa on public.sms_notifications as restrictive for all to authenticated
 using(public.account_mfa_verified()) with check(public.account_mfa_verified());
