

# Set Up pg_cron Schedule for Auto-Fetching USD Rate

## Overview
Enable the `pg_cron` and `pg_net` extensions, then create a scheduled job that calls the `fetch-usd-rate` edge function every 6 hours to keep the USD/MMK exchange rate up to date automatically.

## Steps

### 1. Enable required extensions
Run a database migration to enable `pg_cron` and `pg_net` extensions, which are needed for scheduling HTTP calls from within the database.

### 2. Create the cron job
Use the database insert tool (not migration, since it contains project-specific secrets) to schedule a `net.http_post` call to the `fetch-usd-rate` edge function every 6 hours.

The job will:
- Run on schedule `0 */6 * * *` (every 6 hours at minute 0)
- POST to the edge function URL with the anon key for authorization
- The edge function itself checks the `auto_fetch` flag before updating, so the admin toggle controls whether rates actually change

## Technical Details

**Extensions:** `pg_cron` (scheduling) and `pg_net` (HTTP requests from SQL)

**Cron expression:** `0 */6 * * *` -- runs at 00:00, 06:00, 12:00, 18:00 UTC daily

**Edge function URL:** `https://etickkjsiibsftjtbavy.supabase.co/functions/v1/fetch-usd-rate`

**Safety:** The edge function already validates rates (range check, unchanged check) and respects the `auto_fetch` toggle in `system_settings`, so no risk of bad data from the scheduled job.

