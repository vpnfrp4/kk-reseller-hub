-- Allow admins to insert wallet transactions (for manual balance adjustments)
CREATE POLICY "Admins can insert transactions"
ON public.wallet_transactions
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
