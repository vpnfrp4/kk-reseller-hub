

## Plan: Seed Provider Data and Link to Products

### Current State
- 5 providers exist: KKTech (verified, 4.9 rating), DHRU, GSMUnlockHub, UnlockBase, iRemoval (all unverified, 0 ratings, 0 completions)
- All products are linked to KKTech (`0df39ae4-...`)
- The 4 other providers have no products linked and no meaningful stats

### Changes
Update the 4 existing non-KKTech providers with realistic seed data:

1. **DHRU** (`b116db11-...`): rating 4.7, success_rate 96, total_completed 342, is_verified true, fulfillment_type "api", total_reviews 89
2. **GSMUnlockHub** (`853155a0-...`): rating 4.2, success_rate 88, total_completed 156, is_verified true, fulfillment_type "manual", total_reviews 41
3. **UnlockBase** (`804e5401-...`): rating 3.8, success_rate 82, total_completed 73, is_verified false, fulfillment_type "manual", total_reviews 18
4. **iRemoval** (`07aa0c07-...`): rating 4.5, success_rate 94, total_completed 210, is_verified true, fulfillment_type "api", total_reviews 55

Then link some existing products to different providers to diversify the catalog (update `provider_id` on ~4-6 products across categories).

### Implementation
- 4 UPDATE statements on `imei_providers` for stats
- ~4-6 UPDATE statements on `products` to reassign `provider_id`
- All via the data insert tool (no schema changes)

