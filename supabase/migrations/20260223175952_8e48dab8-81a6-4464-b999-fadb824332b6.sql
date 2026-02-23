
-- Storage bucket for payment screenshots
INSERT INTO storage.buckets (id, name, public) VALUES ('payment-screenshots', 'payment-screenshots', false);

CREATE POLICY "Users can upload own screenshots"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'payment-screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own screenshots"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'payment-screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);
