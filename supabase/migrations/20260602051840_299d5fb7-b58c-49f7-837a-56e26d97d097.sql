create or replace function public.apply_balance_delta(_user_id uuid, _delta numeric)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  _new numeric;
  _caller uuid := auth.uid();
begin
  if _caller is null then
    raise exception 'not authenticated';
  end if;
  if _caller <> _user_id and not public.has_role(_caller, 'admin'::public.app_role) then
    raise exception 'forbidden';
  end if;
  update public.profiles
    set balance = coalesce(balance, 0) + _delta,
        updated_at = now()
    where id = _user_id
    returning balance into _new;
  if _new is null then
    raise exception 'profile not found';
  end if;
  return _new;
end;
$$;

revoke all on function public.apply_balance_delta(uuid, numeric) from public;
grant execute on function public.apply_balance_delta(uuid, numeric) to authenticated;
grant execute on function public.apply_balance_delta(uuid, numeric) to service_role;