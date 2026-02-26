

## Plan: Add PriceComparisonTable to ProductDetailPage

### Change
Add the existing `PriceComparisonTable` component after the Description section (line 503), passing the current product's `category` and `id` to show competing services.

### Implementation
- **File**: `src/pages/ProductDetailPage.tsx`
  - Import `PriceComparisonTable` from `@/components/marketplace/PriceComparisonTable`
  - Insert `<PriceComparisonTable category={product.category} excludeProductId={product.id} />` after the StructuredDescription block (after line 503), before the Modals section

Single file, 2-line change.

