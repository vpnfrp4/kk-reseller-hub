

## Plan: Redesign Landing Page with Marketplace Hero

### 1. Redesign Hero Section
Replace the current generic hero with a marketplace-focused hero:
- New headline: "Compare & Buy IMEI Unlock Services Instantly"
- Subtitle emphasizing price comparison and multi-provider marketplace
- Search-style CTA area with a visual "search by IMEI" input mockup leading to `/login`
- Animated badge: "32 Services · 3 Categories · 4 Verified Providers"

### 2. Add Live Stats Section
New section below hero with animated stat counters fetched from the database:
- Total products available (from `products` table count)
- Active providers (from `imei_providers` table count)
- Average success rate (from `imei_providers` avg)
- Orders processed (from `orders` table count)
- Use the existing `useCountUp` hook for animated number transitions
- Stats displayed in a 4-column grid with icons and labels

### 3. Add Comparison Benefits Table
New visible section replacing the hidden "Why Choose Us" block:
- Side-by-side comparison table: "KKTech vs Traditional Unlock Sites"
- Rows: Pricing Model, Provider Selection, Success Rate Visibility, Bulk Ordering, Delivery Tracking, Payment Methods
- KKTech column shows green checkmarks with specific benefits
- Competitors column shows red X or generic descriptions
- Styled as a glassmorphism card matching the design system

### 4. Keep Existing Sections
Retain services grid, how-it-works steps, FAQ, SEO blocks, footer, and floating contact button unchanged.

### Technical Details
- **File modified**: `src/pages/LandingPage.tsx` — hero rewrite (lines 223-286), new stats section insertion, replace hidden "Why Choose Us" with visible comparison table
- **Database queries**: 3 lightweight count/avg queries via `@tanstack/react-query` + supabase client (products count, providers count/avg, orders count)
- **Hooks used**: existing `useCountUp` for stat animations
- **No new dependencies** required

