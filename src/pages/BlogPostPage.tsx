import { useParams, Link } from "react-router-dom";
import { SITE_URL } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { Calendar, ArrowLeft, BookOpen } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/ThemeToggle";

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  cover_image_url: string | null;
  meta_title: string | null;
  meta_description: string | null;
  meta_keywords: string | null;
  published_at: string | null;
  created_at: string;
}

export default function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();

  const { data: post, isLoading } = useQuery({
    queryKey: ["blog-post", slug],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("blog_posts")
        .select("*")
        .eq("slug", slug!)
        .eq("is_published", true)
        .single();
      if (error) throw error;
      return data as BlogPost;
    },
    enabled: !!slug,
  });

  // Dynamic meta tags
  useEffect(() => {
    if (!post) return;
    const metaTitle = post.meta_title || `${post.title} – KKTechDeals`;
    document.title = metaTitle;

    const setMeta = (name: string, content: string) => {
      let el = document.querySelector(`meta[name="${name}"]`) || document.querySelector(`meta[property="${name}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(name.startsWith("og:") ? "property" : "name", name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    const desc = post.meta_description || post.excerpt || post.title;
    setMeta("description", desc);
    setMeta("og:title", metaTitle);
    setMeta("og:description", desc);
    setMeta("og:type", "article");
    setMeta("og:url", `${SITE_URL}/blog/${post.slug}`);
    if (post.cover_image_url) setMeta("og:image", post.cover_image_url);
    if (post.meta_keywords) setMeta("keywords", post.meta_keywords);

    return () => {
      document.title = "Myanmar Biggest Unlock Marketplace | IMEI, GSM & Digital Services – KKTechDeals";
    };
  }, [post]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
        <BookOpen className="h-12 w-12 text-muted-foreground/30" />
        <p className="text-lg font-semibold text-foreground">Article not found</p>
        <Button variant="outline" asChild>
          <Link to="/blog">Back to Blog</Link>
        </Button>
      </div>
    );
  }

  const publishDate = post.published_at || post.created_at;

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-4 sm:px-8">
          <Link to="/" className="text-xl font-extrabold tracking-tight text-foreground">
            KK<span className="text-primary">Tech</span>
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Button variant="ghost" size="sm" asChild>
              <Link to="/blog">Blog</Link>
            </Button>
          </div>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-5 py-10 sm:px-8 animate-fade-in">
        <Link
          to="/blog"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Blog
        </Link>

        {post.cover_image_url && (
          <div className="rounded-2xl overflow-hidden mb-8 border border-border">
            <img
              src={post.cover_image_url}
              alt={post.title}
              className="w-full aspect-video object-cover"
            />
          </div>
        )}

        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
          <Calendar className="h-4 w-4" />
          {format(new Date(publishDate), "MMMM d, yyyy")}
        </div>

        <h1 className="text-3xl font-extrabold text-foreground tracking-tight sm:text-4xl mb-6">
          {post.title}
        </h1>

        {post.excerpt && (
          <p className="text-lg text-muted-foreground leading-relaxed mb-8 border-l-4 border-primary/30 pl-4">
            {post.excerpt}
          </p>
        )}

        <div
          className="prose prose-sm sm:prose-base dark:prose-invert max-w-none
            prose-headings:text-foreground prose-headings:font-bold
            prose-p:text-secondary-foreground prose-p:leading-relaxed
            prose-a:text-primary prose-a:no-underline hover:prose-a:underline
            prose-strong:text-foreground
            prose-img:rounded-xl prose-img:border prose-img:border-border"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
      </article>

      {/* Article JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: post.title,
            description: post.meta_description || post.excerpt,
            url: `${SITE_URL}/blog/${post.slug}`,
            datePublished: publishDate,
            dateModified: post.created_at,
            image: post.cover_image_url || undefined,
            author: { "@type": "Organization", name: "KKTechDeals" },
            publisher: {
              "@type": "Organization",
              name: "KKTechDeals",
              logo: { "@type": "ImageObject", url: `${SITE_URL}/pwa-512x512.png` },
            },
          }),
        }}
      />
    </div>
  );
}
