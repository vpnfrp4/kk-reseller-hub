

## Analysis

The `imei_providers` table already exists with all required fields (name, avg_rating, success_rate, total_completed, fulfillment_type, commission_percent). The `products` table already has a `provider_id` column. There are 4 providers in the DB but no products are linked (all `provider_id` = null).

The issue is purely in the frontend: `ProductCard.tsx` uses hardcoded mock data (`rating 4.8`, `success 98%`, `completed 1200`) instead of fetching real provider data.

## Plan

### 1. Create a default "KKTech" provider for non-IMEI products
Insert a new provider row for "KKTech" (the platform itself) to represent digital/manual product fulfillment, so all products can be linked.

### 2. Fetch providers alongside products in ProductsPage
Update the products query in `ProductsPage.tsx` to also fetch `imei_providers` data, then pass provider info to each `ProductCard`.

### 3. Update ProductCard to use real provider data
- Add `provider` prop to `ProductCardProps` with fields: `name`, `avg_rating`, `success_rate`, `total_completed`, `is_verified`, `fulfillment_type`
- Replace the hardcoded `providerName`, `successRate`, `providerRating`, `completedOrders` with values from the prop
- Fall back gracefully when no provider is linked (show "—" for stats)

### 4. Update ProductDetailPage and PriceComparisonTable
These components also reference provider data — ensure they use the same real provider lookup pattern.

### Technical Details
- No schema changes needed — `imei_providers` and `products.provider_id` already exist
- Data insert: one new "KKTech" provider row via the insert tool
- Files modified: `ProductsPage.tsx`, `ProductCard.tsx`, `ProductDetailPage.tsx`
- The `PriceComparisonTable.tsx` already fetches real provider data correctly

