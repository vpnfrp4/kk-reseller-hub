ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS designation text NOT NULL DEFAULT 'customer';

-- Backfill: users with orders become resellers
UPDATE public.profiles SET designation = 'reseller' WHERE total_orders > 0 OR total_spent > 0;