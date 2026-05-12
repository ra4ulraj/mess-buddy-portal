-- Roles
create type public.app_role as enum ('admin', 'student');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role);
$$;

create policy "view own roles" on public.user_roles for select
  using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));
create policy "admins manage roles" on public.user_roles for all
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default 'Student',
  roll_number text unique,
  hostel text not null default 'Sarayu Hostel',
  block text not null default 'C',
  room text not null default 'C-214',
  balance numeric not null default 0,
  meal_plan text not null default 'Veg Premium',
  plan_ends date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "view own or admin" on public.profiles for select
  using (auth.uid() = id or public.has_role(auth.uid(), 'admin'));
create policy "insert own" on public.profiles for insert
  with check (auth.uid() = id);
create policy "update own or admin" on public.profiles for update
  using (auth.uid() = id or public.has_role(auth.uid(), 'admin'));

-- Attendance
create type public.meal_type as enum ('Breakfast', 'Lunch', 'Dinner');
create type public.attendance_status as enum ('approved', 'credit', 'invalid');

create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references auth.users(id) on delete cascade,
  meal_type public.meal_type not null,
  status public.attendance_status not null,
  amount numeric not null default 0,
  balance_after numeric,
  reason text,
  scanned_at timestamptz not null default now(),
  scanned_date date not null default (now() at time zone 'utc')::date
);
create index attendance_student_idx on public.attendance(student_id, scanned_at desc);
create unique index attendance_one_per_meal_per_day
  on public.attendance(student_id, meal_type, scanned_date)
  where status in ('approved', 'credit');

alter table public.attendance enable row level security;

create policy "view own or admin" on public.attendance for select
  using (auth.uid() = student_id or public.has_role(auth.uid(), 'admin'));
create policy "insert own" on public.attendance for insert
  with check (auth.uid() = student_id);
create policy "admins manage all" on public.attendance for all
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- Auto-create profile + role on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  _role public.app_role;
begin
  _role := coalesce(nullif(new.raw_user_meta_data->>'role',''), 'student')::public.app_role;
  insert into public.profiles (id, name, roll_number, hostel, balance, meal_plan)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)),
    new.raw_user_meta_data->>'roll_number',
    coalesce(new.raw_user_meta_data->>'hostel', 'Sarayu Hostel'),
    coalesce((new.raw_user_meta_data->>'balance')::numeric, 0),
    coalesce(new.raw_user_meta_data->>'meal_plan', 'Veg Premium')
  );
  insert into public.user_roles (user_id, role) values (new.id, _role);
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Realtime
alter publication supabase_realtime add table public.profiles;
alter publication supabase_realtime add table public.attendance;