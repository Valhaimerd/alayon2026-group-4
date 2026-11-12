-- SMS verification is independent of Supabase's paid phone-MFA service.
-- Only our server can write challenges: authenticated RPC calls also require a
-- random server credential whose SHA-256 hash is provisioned separately.
create schema if not exists private;
revoke all on schema private from public,anon,authenticated;
create table private.account_sms_config (id boolean primary key default true check(id), secret_hash text not null);
create table private.account_sms_settings (
 user_id uuid primary key references auth.users(id) on delete cascade,
 phone text, enabled boolean not null default false,
 last_sent timestamptz, sent_on date, sent_count integer not null default 0,
 check(not enabled or phone is not null)
);
create table private.account_sms_challenges (
 user_id uuid primary key references auth.users(id) on delete cascade,
 id uuid not null unique, session_id text not null, phone text not null,
 purpose text not null check(purpose in ('enroll','login')),
 code_hash text not null, expires_at timestamptz not null,
 attempts integer not null default 0, delivered boolean not null default false
);
create table private.account_sms_sessions (
 user_id uuid not null references auth.users(id) on delete cascade,
 session_id text not null, expires_at timestamptz not null,
 primary key(user_id,session_id)
);
revoke all on all tables in schema private from public,anon,authenticated;

create function private.check_sms_server(p_secret text) returns void
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or nullif(auth.jwt()->>'session_id','') is null or not exists (
   select 1 from private.account_sms_config where secret_hash=encode(sha256(convert_to(p_secret,'UTF8')),'hex')
 ) then raise insufficient_privilege using message='SMS server authorization required'; end if;
end $$;
revoke all on function private.check_sms_server(text) from public,anon,authenticated;

create or replace function public.account_mfa_verified() returns boolean
language sql stable security definer set search_path='' as $$
 select coalesce((auth.jwt()->>'aal')='aal2',false)
 or exists(select 1 from private.account_sms_sessions s join private.account_sms_settings c using(user_id)
   where s.user_id=auth.uid() and c.enabled and s.session_id=auth.jwt()->>'session_id' and s.expires_at>now())
 or (not exists(select 1 from auth.mfa_factors where user_id=auth.uid() and status='verified')
   and not exists(select 1 from private.account_sms_settings where user_id=auth.uid() and enabled))
$$;

create function public.account_sms_status() returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('enabled',coalesce(s.enabled,false),'phone',case when s.enabled then '•••• '||right(s.phone,4) else null end)
 from (select auth.uid() as user_id) u left join private.account_sms_settings s using(user_id)
$$;

create function public.start_account_sms(p_secret text,p_id uuid,p_code_hash text,p_phone text default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare settings private.account_sms_settings; target_phone text;
begin
 perform private.check_sms_server(p_secret);
 if p_phone is not null and (not public.account_mfa_verified() or p_phone !~ '^\+[1-9][0-9]{7,14}$') then
   return jsonb_build_object('ok',false,'reason','verify_first'); end if;
 if p_code_hash is null or p_code_hash !~ '^[a-f0-9]{64}$' then raise exception 'Invalid challenge'; end if;
 insert into private.account_sms_settings(user_id) values(auth.uid()) on conflict do nothing;
 select * into settings from private.account_sms_settings where user_id=auth.uid() for update;
 if p_phone is null and not settings.enabled then return jsonb_build_object('ok',false,'reason','not_enabled'); end if;
 if settings.last_sent>now()-interval '60 seconds' then return jsonb_build_object('ok',false,'reason','cooldown'); end if;
 if settings.sent_on=current_date and settings.sent_count>=10 then return jsonb_build_object('ok',false,'reason','daily_limit'); end if;
 target_phone=coalesce(p_phone,settings.phone);
 update private.account_sms_settings set last_sent=now(),sent_on=current_date,
   sent_count=case when settings.sent_on=current_date then settings.sent_count+1 else 1 end where user_id=auth.uid();
 delete from private.account_sms_challenges where user_id=auth.uid();
 insert into private.account_sms_challenges(user_id,id,session_id,phone,purpose,code_hash,expires_at)
 values(auth.uid(),p_id,auth.jwt()->>'session_id',target_phone,case when p_phone is null then 'login' else 'enroll' end,p_code_hash,now()+interval '5 minutes');
 return jsonb_build_object('ok',true,'phone',target_phone);
end $$;

create function public.account_sms_delivery(p_secret text,p_id uuid,p_delivered boolean) returns void
language plpgsql security definer set search_path='' as $$
begin
 perform private.check_sms_server(p_secret);
 update private.account_sms_challenges set delivered=p_delivered
 where user_id=auth.uid() and id=p_id and session_id=auth.jwt()->>'session_id';
end $$;

create function public.verify_account_sms(p_secret text,p_id uuid,p_code_hash text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare challenge private.account_sms_challenges;
begin
 perform private.check_sms_server(p_secret);
 select * into challenge from private.account_sms_challenges where user_id=auth.uid() and id=p_id
   and session_id=auth.jwt()->>'session_id' for update;
 if not found or challenge.expires_at<=now() or challenge.attempts>=5 or not challenge.delivered then
   return jsonb_build_object('ok',false,'reason','expired'); end if;
 update private.account_sms_challenges set attempts=attempts+1 where user_id=auth.uid();
 if challenge.code_hash is distinct from p_code_hash then return jsonb_build_object('ok',false,'reason','incorrect'); end if;
 if challenge.purpose='enroll' then
   update private.account_sms_settings set phone=challenge.phone,enabled=true where user_id=auth.uid();
   delete from private.account_sms_sessions where user_id=auth.uid();
 end if;
 delete from private.account_sms_sessions where user_id=auth.uid() and expires_at<=now();
 insert into private.account_sms_sessions(user_id,session_id,expires_at)
 values(auth.uid(),auth.jwt()->>'session_id',now()+interval '12 hours')
 on conflict(user_id,session_id) do update set expires_at=excluded.expires_at;
 delete from private.account_sms_challenges where user_id=auth.uid();
 return jsonb_build_object('ok',true);
end $$;

create function public.disable_account_sms(p_secret text) returns boolean
language plpgsql security definer set search_path='' as $$
begin
 perform private.check_sms_server(p_secret);
 if not public.account_mfa_verified() then return false; end if;
 update private.account_sms_settings set enabled=false,phone=null where user_id=auth.uid();
 delete from private.account_sms_sessions where user_id=auth.uid();
 delete from private.account_sms_challenges where user_id=auth.uid();
 return true;
end $$;

revoke all on function public.account_sms_status(),public.start_account_sms(text,uuid,text,text),public.account_sms_delivery(text,uuid,boolean),public.verify_account_sms(text,uuid,text),public.disable_account_sms(text) from public,anon;
grant execute on function public.account_sms_status(),public.start_account_sms(text,uuid,text,text),public.account_sms_delivery(text,uuid,boolean),public.verify_account_sms(text,uuid,text),public.disable_account_sms(text) to authenticated;
