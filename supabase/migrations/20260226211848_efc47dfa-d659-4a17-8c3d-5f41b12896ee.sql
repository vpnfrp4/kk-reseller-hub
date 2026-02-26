ALTER TABLE public.orders DROP CONSTRAINT orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check 
  CHECK (status = ANY (ARRAY[
    'pending', 'pending_review', 'pending_creation',
    'processing', 'completed', 'delivered',
    'rejected', 'cancelled', 'api_pending'
  ]));