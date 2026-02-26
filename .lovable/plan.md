
## Problem

The `orders_status_check` CHECK constraint on the `orders` table only permits 4 statuses:
- `delivered`, `pending`, `pending_review`, `pending_creation`

The edge function `update-order-status` and the admin UI support 9 statuses including `processing`, `completed`, `rejected`, `cancelled`, and `api_pending` — all of which fail against this constraint.

## Fix

**Single database migration**: Drop the existing CHECK constraint and recreate it with all valid statuses:

```sql
ALTER TABLE public.orders DROP CONSTRAINT orders_status_check;
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check 
  CHECK (status = ANY (ARRAY[
    'pending', 'pending_review', 'pending_creation',
    'processing', 'completed', 'delivered',
    'rejected', 'cancelled', 'api_pending'
  ]));
```

No code changes needed — the edge function and UI already handle all these statuses correctly.
