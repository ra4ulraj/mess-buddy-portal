CREATE TABLE public.qr_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_type public.meal_type NOT NULL,
  qr_token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  issued_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_qr_sessions_expires ON public.qr_sessions (expires_at DESC);
CREATE INDEX idx_qr_sessions_meal ON public.qr_sessions (meal_type, expires_at DESC);

ALTER TABLE public.qr_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated can view qr sessions"
  ON public.qr_sessions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "admins manage qr sessions"
  ON public.qr_sessions FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

ALTER PUBLICATION supabase_realtime ADD TABLE public.qr_sessions;