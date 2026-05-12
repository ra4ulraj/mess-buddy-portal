-- Hostel mess management backend: auth profiles, roles, attendance, payments, dues, and realtime.

create extension if not exists pgcrypto;

DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'student');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.meal_type AS ENUM ('Breakfast', 'Lunch', 'Dinner');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.attendance_status AS ENUM ('approved', 'credit', 'invalid');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.payment_type AS ENUM ('recharge', 'credit', 'due');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.payment_status AS ENUM ('Paid', 'Credit', 'Pending');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Student',
  roll_number text UNIQUE,
  hostel text NOT NULL DEFAULT 'Sarayu Hostel',
  block text NOT NULL DEFAULT 'C',
  room text NOT NULL DEFAULT 'C-214',
  meal_plan text NOT NULL DEFAULT 'Veg Premium',
  balance numeric NOT NULL DEFAULT 0,
  plan_ends date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'student',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

CREATE TABLE IF NOT EXISTS public.attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  meal_type public.meal_type NOT NULL,
  status public.attendance_status NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  balance_after numeric,
  reason text,
  scanned_at timestamptz NOT NULL DEFAULT now(),
  scanned_date date NOT NULL DEFAULT current_date
);

CREATE UNIQUE INDEX IF NOT EXISTS attendance_one_valid_meal_per_day
  ON public.attendance (student_id, scanned_date, meal_type)
  WHERE status IN ('approved', 'credit');

CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payment_type public.payment_type NOT NULL,
  title text NOT NULL DEFAULT 'Wallet recharge',
  amount numeric NOT NULL,
  status public.payment_status NOT NULL DEFAULT 'Paid',
  method text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS touch_profiles_updated_at ON public.profiles;
CREATE TRIGGER touch_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requested_role public.app_role := COALESCE((NEW.raw_user_meta_data ->> 'role')::public.app_role, 'student');
BEGIN
  INSERT INTO public.profiles (
    id,
    name,
    roll_number,
    hostel,
    block,
    room,
    meal_plan,
    balance,
    plan_ends
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', split_part(NEW.email, '@', 1), 'Student'),
    NULLIF(NEW.raw_user_meta_data ->> 'roll_number', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'hostel', 'Sarayu Hostel'),
    COALESCE(NEW.raw_user_meta_data ->> 'block', 'C'),
    COALESCE(NEW.raw_user_meta_data ->> 'room', 'C-214'),
    COALESCE(NEW.raw_user_meta_data ->> 'meal_plan', 'Veg Premium'),
    COALESCE(NULLIF(NEW.raw_user_meta_data ->> 'balance', '')::numeric, 0),
    (current_date + interval '30 days')::date
  ) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    roll_number = COALESCE(public.profiles.roll_number, EXCLUDED.roll_number),
    meal_plan = EXCLUDED.meal_plan,
    updated_at = now();

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, requested_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles readable by owner or admin" ON public.profiles;
CREATE POLICY "profiles readable by owner or admin"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "profiles updateable by owner or admin" ON public.profiles;
CREATE POLICY "profiles updateable by owner or admin"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "roles readable by owner or admin" ON public.user_roles;
CREATE POLICY "roles readable by owner or admin"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "roles managed by admin" ON public.user_roles;
CREATE POLICY "roles managed by admin"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "attendance readable by owner or admin" ON public.attendance;
CREATE POLICY "attendance readable by owner or admin"
  ON public.attendance FOR SELECT
  USING (auth.uid() = student_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "attendance insertable by owner or admin" ON public.attendance;
CREATE POLICY "attendance insertable by owner or admin"
  ON public.attendance FOR INSERT
  WITH CHECK (auth.uid() = student_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "attendance updateable by admin" ON public.attendance;
CREATE POLICY "attendance updateable by admin"
  ON public.attendance FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "payments readable by owner or admin" ON public.payments;
CREATE POLICY "payments readable by owner or admin"
  ON public.payments FOR SELECT
  USING (auth.uid() = student_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "payments insertable by owner or admin" ON public.payments;
CREATE POLICY "payments insertable by owner or admin"
  ON public.payments FOR INSERT
  WITH CHECK (auth.uid() = student_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "payments updateable by admin" ON public.payments;
CREATE POLICY "payments updateable by admin"
  ON public.payments FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance;
ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;
