
# Critical Security Fix: User Data Isolation

## Problem
New users see other users' order history, transactions, and wallet activity. The root cause is twofold:
1. Frontend queries do NOT filter by `user_id`
2. The RLS policy "Public can read completed orders limited" on the `orders` table exposes all completed/delivered orders to every user

## Fix Plan

### 1. Database Migration -- Fix the leaky RLS policy
- **Drop** the policy `Public can read completed orders limited` on `orders`. This policy allows any user (even unauthenticated) to SELECT all completed/delivered orders, leaking credentials and pricing to everyone.
- **Replace** with a scoped view or limited public feed (only `product_name`, `status`, `completed_at`) via the existing `recent_completions` view, which already exists and exposes only safe fields.

### 2. Frontend: Add `user_id` filters to all reseller-facing queries

**`src/pages/OrdersPage.tsx`**
- Add `.eq("user_id", user.id)` to the orders count query and orders list query
- Add `.eq("user_id", user.id)` to the CSV export query
- Get `user` from `useAuth()` context

**`src/pages/WalletPage.tsx`**
- Add `.eq("user_id", user.id)` to the wallet_transactions query (line 33-36)

**`src/pages/DashboardHome.tsx`**
- Add `.eq("user_id", user.id)` to "recent-transactions" query (line 81)
- Add `.eq("user_id", user.id)` to "recent-orders" query (line 90)
- Add `.eq("user_id", user.id)` to "wallet-health" orders and topups queries (lines 101-102)
- Add `.eq("user_id", user.id)` to "spending-sparkline-7d" query (line 117)
- Get `user` from existing `useAuth()` destructure

**`src/pages/NotificationsPage.tsx`**
- Add `.eq("user_id", user.id)` to notifications query (line 82-86) -- RLS exists but add for defense-in-depth

### 3. Files Changed Summary

| File | Change |
|------|--------|
| Database migration | Drop `Public can read completed orders limited` policy |
| `src/pages/OrdersPage.tsx` | Add `useAuth()`, filter all queries by `user.id` |
| `src/pages/WalletPage.tsx` | Add `user_id` filter to transactions query |
| `src/pages/DashboardHome.tsx` | Add `user_id` filter to 4 queries |
| `src/pages/NotificationsPage.tsx` | Add `user_id` filter (defense-in-depth) |

### 4. Impact
- New users will see empty state (no orders/transactions) until they make their own
- Admin queries remain unaffected (admin pages use separate queries with admin RLS)
- The `recent_completions` view continues to power the public "recent unlocks" ticker safely
- Existing marketplace features (RecentUnlocksFeed, RecentUnlocksTicker) that use `recent_completions` are unaffected
