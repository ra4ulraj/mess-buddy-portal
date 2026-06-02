-- Prevent duplicate attendance scans at the database level.
-- The app already guards client-side, but two rapid scans on different
-- devices (or a network retry) can both pass that check and produce
-- duplicate rows. A partial unique index on (student_id, scanned_date,
-- meal_type) for non-invalid statuses makes the database the source of
-- truth and turns the race into a clean unique-violation error the app
-- can catch.
CREATE UNIQUE INDEX IF NOT EXISTS attendance_unique_meal_per_day
  ON public.attendance (student_id, scanned_date, meal_type)
  WHERE status <> 'invalid';

-- Helpful read indexes for the per-user attendance/payments history and
-- realtime refetches (most queries filter by student_id + ordered by
-- scanned_at/created_at desc).
CREATE INDEX IF NOT EXISTS attendance_student_scanned_at_idx
  ON public.attendance (student_id, scanned_at DESC);

CREATE INDEX IF NOT EXISTS payments_student_created_at_idx
  ON public.payments (student_id, created_at DESC);

CREATE INDEX IF NOT EXISTS notifications_user_created_at_idx
  ON public.notifications (user_id, created_at DESC);