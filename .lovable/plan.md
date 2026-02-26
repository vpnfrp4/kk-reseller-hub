

# Update Admin Orders Page for Product Types

## Overview
Add product_type filtering and IMEI-specific field display to the admin Orders page and its detail modal.

## Changes

### 1. `src/pages/admin/AdminOrders.tsx` -- Product type filter + column + expanded statuses

**New product_type filter**: Add a second `<Select>` dropdown next to the existing status filter with options: All Types, Digital, IMEI, Manual, API.

**Expanded STATUS_OPTIONS**: Add `processing`, `completed`, `rejected` to the existing status options array so admins can filter by all possible statuses.

**New "Type" column**: Insert a product type badge column (between Product and User) using the same color scheme as the reseller page:
- `digital` -- blue
- `imei` -- amber  
- `manual` -- purple
- `api` -- green

**IMEI column in table**: For IMEI orders, show the IMEI number in a small mono-font tag below the product name cell (no extra column needed -- keeps table compact).

**Inline status select expansion**: Add `processing`, `completed`, `rejected` to the per-row status `<Select>` and bulk action buttons.

**Filter logic update**: Add `productTypeFilter` state and extend the `filtered` useMemo to also match on `product_type`.

### 2. `src/components/admin/OrderDetailModal.tsx` -- IMEI fields + result + admin notes

**Product type badge**: Show a product type badge next to the status badge in the Order Info section.

**IMEI Number row**: When `order.imei_number` exists, display it in the Order Info grid as a dedicated row with mono font.

**Result section**: For IMEI/manual orders with `order.result`, show a "Result" section (similar to Credentials) displaying the result text with a copy button.

**Admin Notes**: Display `order.admin_notes` if present, and add an editable textarea so admins can add/update notes directly from the modal (saves to DB on blur or button click).

**Expanded status badges**: Add `processing` and `completed` to the `statusBadge` styles map.

**Fulfill action expansion**: When fulfilling IMEI orders, add an optional "Result" textarea input alongside the existing credentials input, so admins can paste IMEI unlock results.

## Technical Details

- Product type badge is a small inline helper (consistent with reseller-side badge styling)
- No database changes needed -- `product_type`, `imei_number`, `result`, `admin_notes` already exist in the `orders` table
- Admin notes update uses `supabase.from("orders").update({ admin_notes })` which is allowed by existing admin RLS policy
- Status options extended to: delivered, pending, pending_creation, pending_review, processing, completed, rejected, cancelled
