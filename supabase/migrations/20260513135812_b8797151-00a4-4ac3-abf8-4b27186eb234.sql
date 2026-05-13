
-- Enums
do $$ begin
  create type public.payment_type as enum ('recharge','credit','due');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_status as enum ('Paid','Credit','Pending');
exception when duplicate_object then null; end $$;

-- Table
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null,
  amount numeric not null default 0,
  method text,
  payment_type public.payment_type not null default 'recharge',
  status public.payment_status not null default 'Paid',
  title text not null default 'Wallet recharge',
  created_at timestamptz not null default now()
);

create index if not exists payments_student_id_created_at_idx
  on public.payments (student_id, created_at desc);

alter table public.payments enable row level security;

drop policy if exists "view own or admin" on public.payments;
create policy "view own or admin" on public.payments
  for select using (auth.uid() = student_id or public.has_role(auth.uid(),'admin'));

drop policy if exists "insert own" on public.payments;
create policy "insert own" on public.payments
  for insert with check (auth.uid() = student_id);

drop policy if exists "admins manage all" on public.payments;
create policy "admins manage all" on public.payments
  for all using (public.has_role(auth.uid(),'admin'))
  with check (public.has_role(auth.uid(),'admin'));

-- Realtime
alter publication supabase_realtime add table public.payments;
