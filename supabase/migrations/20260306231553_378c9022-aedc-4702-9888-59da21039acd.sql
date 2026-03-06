
-- Categories table for admin-managed category organization
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text DEFAULT '',
  icon text DEFAULT '📦',
  image_url text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Anyone can read active categories
CREATE POLICY "Anyone can read categories" ON public.categories FOR SELECT USING (true);

-- Admins can manage categories
CREATE POLICY "Admins can insert categories" ON public.categories FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update categories" ON public.categories FOR UPDATE USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete categories" ON public.categories FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- Seed from existing product categories
INSERT INTO public.categories (name, sort_order)
SELECT DISTINCT category, ROW_NUMBER() OVER (ORDER BY MIN(sort_order), category)::int
FROM public.products
WHERE category IS NOT NULL AND category != ''
GROUP BY category
ON CONFLICT (name) DO NOTHING;
