
-- Blog posts table
CREATE TABLE public.blog_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  excerpt TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  cover_image_url TEXT,
  meta_title TEXT,
  meta_description TEXT,
  meta_keywords TEXT,
  is_published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMP WITH TIME ZONE,
  author_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- Public can read published posts
CREATE POLICY "Anyone can read published posts"
  ON public.blog_posts FOR SELECT
  USING (is_published = true);

-- Admins can read all posts (including drafts)
CREATE POLICY "Admins can read all posts"
  ON public.blog_posts FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can manage posts
CREATE POLICY "Admins can insert posts"
  ON public.blog_posts FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update posts"
  ON public.blog_posts FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete posts"
  ON public.blog_posts FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Index for slug lookups
CREATE INDEX idx_blog_posts_slug ON public.blog_posts (slug);
CREATE INDEX idx_blog_posts_published ON public.blog_posts (is_published, published_at DESC);

-- Updated_at trigger
CREATE TRIGGER update_blog_posts_updated_at
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
