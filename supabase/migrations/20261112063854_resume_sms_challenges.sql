-- A refresh must not force the user to request another message.
create or replace function public.account_sms_status() returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('enabled',coalesce(s.enabled,false),
 'phone',case when s.enabled then '•••• '||right(s.phone,4) else null end,
 'pending',(select jsonb_build_object('id',c.id,'purpose',c.purpose,'phone','•••• '||right(c.phone,4))
   from private.account_sms_challenges c where c.user_id=auth.uid()
   and c.session_id=auth.jwt()->>'session_id' and c.delivered and c.expires_at>now() and c.attempts<5))
 from (select auth.uid() as user_id) u left join private.account_sms_settings s using(user_id)
$$;
