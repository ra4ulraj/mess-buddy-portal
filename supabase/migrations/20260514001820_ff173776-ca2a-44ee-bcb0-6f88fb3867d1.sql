-- Prevent duplicate meal scans at DB level (only counts approved/credit, not invalid)
CREATE UNIQUE INDEX IF NOT EXISTS attendance_unique_per_meal_per_day
ON public.attendance (student_id, scanned_date, meal_type)
WHERE status IN ('approved', 'credit');