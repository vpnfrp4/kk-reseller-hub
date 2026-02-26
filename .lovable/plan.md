
# Update Orders Page for Product Types

## Overview
Add `product_type` badges to the Orders list and detail pages, expand status filters to cover IMEI/manual/api statuses (processing, completed, rejected, pending_review), and show IMEI-specific fields (IMEI number, result) on the detail page.

## Changes

### 1. `src/components/shared/MmLabel.tsx` -- Add missing statuses
Add `processing` and `completed` to the `MmStatus` map:
- `processing`: amber/spinning style, label "Processing"
- `completed`: green style, label "Completed"

### 2. `src/pages/OrdersPage.tsx` -- Product type badge column + expanded filters

**New column**: Add a `product_type` column after `product_name` showing a colored badge:
- `digital` -- blue "Digital"
- `imei` -- amber "IMEI"
- `manual` -- purple "Manual"  
- `api` -- green "API"

**Status filter**: Expand the status `<Select>` to include:
- All, Delivered, Pending, Processing, Completed, Rejected, Pending Review

**Credentials column**: Conditionally render -- for IMEI orders show IMEI number instead; for manual/pending orders show a "Pending" placeholder instead of empty credentials.

**CSV export**: Add `product_type` column to export.

### 3. `src/pages/OrderDetailPage.tsx` -- IMEI/manual/api awareness

**Header**: Show a product type badge next to the status badge.

**Status handling**: Expand `isPending` to include `processing`; expand `isDelivered` to include `completed`.

**Timeline**: Add a 4th step for IMEI orders ("Result Ready") and adjust step logic for `processing`/`completed` statuses.

**Customer Details section**: Show IMEI number row when `order.imei_number` exists. Show `product_type` row.

**Delivery Result**: For IMEI completed orders, show `order.result` as the delivery content (instead of credentials). For standard digital orders, keep existing credentials display.

**Admin notes**: Display `order.admin_notes` if present (already in DB schema).

## Technical Details

- Product type badge will be a small inline helper function in each file (consistent styling)
- No database changes needed -- all fields (`product_type`, `imei_number`, `result`, `admin_notes`, `fulfillment_mode`) already exist in the `orders` table
- Status labels reuse the existing `MmStatus` component with the new entries added
