-- Banned/pending accounts may be deactivated; activation still requires confirmation and no ban.
create or replace function public.provision_instructor(p_email text,p_code text,p_name text,p_active boolean)
returns uuid language plpgsql security definer set search_path='' as $$
declare account_id uuid; profile_id uuid;
begin
 if not public.has_role('administrator') then raise insufficient_privilege using message='Administrator access required'; end if;
 if length(trim(p_name)) not between 1 and 100 or length(trim(p_code)) not between 1 and 40 then raise exception 'Enter a name and instructor code'; end if;
 select id into account_id from auth.users where lower(email)=lower(trim(p_email))
 and (not p_active or (email_confirmed_at is not null and (banned_until is null or banned_until<=now())));
 if account_id is null then raise exception 'Create and confirm this account in Supabase Auth first'; end if;
 insert into public.account_roles(user_id,role) values(account_id,'instructor') on conflict do nothing;
 insert into public.instructors(user_id,instructor_code,name,active) values(account_id,trim(p_code),trim(p_name),p_active)
 on conflict(user_id) do update set instructor_code=excluded.instructor_code,name=excluded.name,active=excluded.active
 returning id into profile_id;
 return profile_id;
end $$;
