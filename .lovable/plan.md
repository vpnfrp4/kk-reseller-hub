
# Auto-Fetch Live USD/MMK Exchange Rates

## Overview
Create an edge function that fetches the live USD/MMK rate from a free public API, updates the `system_settings` table, and triggers the existing `recalculate_usd_prices()` function. Add a pg_cron schedule to run it automatically, and enhance the admin UI with auto-fetch toggle and last-updated info.

## Architecture

```text
pg_cron (every 6 hours)
  --> Edge Function: fetch-usd-rate
      --> ExchangeRate API (free, no key needed)
      --> UPDATE system_settings SET value = {rate, source, updated_at}
      --> Triggers on_usd_rate_change() --> recalculate_usd_prices()
```

## Changes

### 1. Edge Function: `supabase/functions/fetch-usd-rate/index.ts`

- Fetches from `https://open.er-api.com/v6/latest/USD` (free, no API key required, 1440 requests/day limit)
- Extracts `rates.MMK` from the response
- Updates `system_settings` where `key = 'usd_mmk_rate'` with `{ rate, source: "er-api", fetched_at: ISO timestamp }`
- Uses `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (both already configured as secrets)
- Returns JSON with old rate, new rate, and whether prices were recalculated
- Includes basic validation: skip update if rate is unreasonable (< 500 or > 50000) or unchanged

### 2. Database: Update `system_settings` value schema

No schema migration needed -- the `value` column is already `jsonb`. We'll store additional fields alongside `rate`:
- `rate` (number) -- the exchange rate (existing)
- `source` (string) -- "manual" or "er-api"
- `fetched_at` (string) -- ISO timestamp of last auto-fetch
- `auto_fetch` (boolean) -- whether auto-fetch is enabled

The existing `on_usd_rate_change` trigger only reads `value->>'rate'`, so adding extra fields is safe.

### 3. Database: pg_cron job (via insert tool, not migration)

Enable `pg_cron` and `pg_net` extensions, then schedule the edge function to run every 6 hours. The cron job will only be created; the edge function itself checks the `auto_fetch` flag before updating.

### 4. Config: `supabase/config.toml`

Add `[functions.fetch-usd-rate]` with `verify_jwt = false` (the function validates the service role key internally).

### 5. Admin UI: `src/pages/admin/AdminSettings.tsx` -- ExchangeRateSection enhancements

- **Auto-fetch toggle**: Switch to enable/disable auto-fetching. Saves `auto_fetch: true/false` into the `usd_mmk_rate` setting value.
- **"Fetch Now" button**: Manually triggers the edge function and refreshes the rate display.
- **Last fetched info**: Show `fetched_at` timestamp and `source` ("Manual" vs "Live API") below the current rate.
- **Rate source badge**: Small badge next to rate showing whether it was set manually or auto-fetched.
- Keep the manual input field functional -- admins can always override the rate manually (sets `source: "manual"`).

## Technical Details

- **API choice**: `open.er-api.com` is free, requires no API key, supports MMK, and has generous rate limits (1440/day). Fallback: if API fails, the function logs the error and skips the update (no stale data risk).
- **Existing secrets**: `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are already configured -- no new secrets needed.
- **Trigger chain**: Updating the `system_settings` row automatically fires `on_usd_rate_change()` which calls `recalculate_usd_prices()` -- no additional code needed for price recalculation.
- **Safety**: The edge function validates the rate is within a reasonable range before updating. If the API returns garbage, the update is skipped.
- **Manual override preserved**: When an admin manually saves a rate, it sets `source: "manual"`. The auto-fetch will overwrite this on next run (if enabled), which is the expected behavior.
