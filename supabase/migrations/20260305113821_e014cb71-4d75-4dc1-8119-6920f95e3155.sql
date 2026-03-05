
CREATE TABLE public.telegram_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  telegram_id text NOT NULL,
  telegram_username text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id),
  UNIQUE(telegram_id)
);

ALTER TABLE public.telegram_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own telegram connection"
  ON public.telegram_connections FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own telegram connection"
  ON public.telegram_connections FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own telegram connection"
  ON public.telegram_connections FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all telegram connections"
  ON public.telegram_connections FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role can manage telegram connections"
  ON public.telegram_connections FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
