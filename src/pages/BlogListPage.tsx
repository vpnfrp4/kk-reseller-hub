import { useQuery } from "@tanstack/react-query";
import { SITE_URL } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Calendar, ArrowRight, BookOpen } from "lucide-react";
import { format } from "date-fns";
import { useEffect } from "react";
import ThemeToggle from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  cover_image_url: string | null;
  published_at: string | null;
  created_at: string;
}

export default function BlogListPage() {
  useEffect(() => {
    const title = "Blog – IMEI Unlock, GSM & Digital Services | KKTech";
    const desc = "Tips, tutorials, and industry insights on IMEI unlocking, GSM services, and digital products in Myanmar.";
    const url = `${SITE_URL}/blog`;
    const image = `${SITE_URL}/og-image.png`;

    document.title = title;
    const setMeta = (attr: string, key: string, content: string) => {
      let el = document.querySelector(`meta[${attr}="${key}"]`);
      if (!el) { el = document.createElement("meta"); el.setAttribute(attr, key); document.head.appendChild(el); }
      el.setAttribute("content", content);
    };
    setMeta("name", "description", desc);
    setMeta("property", "og:title", title);
    setMeta("property", "og:description", desc);
    setMeta("property", "og:url", url);
    setMeta("property", "og:image", image);
    setMeta("property", "og:type", "website");
    setMeta("name", "twitter:title", title);
    setMeta("name", "twitter:description", desc);
    setMeta("name", "twitter:image", image);
    setMeta("name", "twitter:card", "summary_large_image");

    return () => {
      document.title = "Myanmar Biggest Unlock Marketplace | IMEI, GSM & Digital Services – KKTechDeals";
    };
  }, []);

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["blog-posts-public"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("blog_posts")
        .select("id, slug, title, excerpt, cover_image_url, published_at, created_at")
        .eq("is_published", true)
        .order("published_at", { ascending: false });
      return (data || []) as BlogPost[];
    },
    staleTime: 60_000,
  });

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
              <Link to="/login">Log In</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 py-12 sm:px-8">
        <div className="mb-10 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/[0.08] px-4 py-2 mb-4">
            <BookOpen className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-primary">KKTechDeals Blog</span>
          </div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight sm:text-4xl">
            Latest Articles &amp; Guides
          </h1>
          <p className="mt-3 text-muted-foreground max-w-lg mx-auto">
            Tips, tutorials, and industry insights on IMEI unlocking, GSM services, and digital products in Myanmar.
          </p>
        </div>

        {isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-border bg-card p-6 animate-pulse">
                <div className="h-40 rounded-xl bg-muted/30 mb-4" />
                <div className="h-5 bg-muted/30 rounded w-3/4 mb-2" />
                <div className="h-4 bg-muted/20 rounded w-full" />
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20">
            <BookOpen className="mx-auto h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-lg font-semibold text-foreground">No articles yet</p>
            <p className="text-sm text-muted-foreground mt-1">Check back soon for new content.</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2">
            {posts.map((post) => (
              <Link
                key={post.id}
                to={`/blog/${post.slug}`}
                className="group rounded-2xl border border-border bg-card overflow-hidden shadow-card transition-all hover:shadow-elevated hover:border-primary/30"
              >
                {post.cover_image_url ? (
                  <div className="aspect-video overflow-hidden">
                    <img
                      src={post.cover_image_url}
                      alt={post.title}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                ) : (
                  <div className="aspect-video bg-muted/20 flex items-center justify-center">
                    <BookOpen className="h-10 w-10 text-muted-foreground/20" />
                  </div>
                )}
                <div className="p-5">
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-2">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(post.published_at || post.created_at), "MMM d, yyyy")}
                  </div>
                  <h2 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                    {post.title}
                  </h2>
                  {post.excerpt && (
                    <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{post.excerpt}</p>
                  )}
                  <span className="inline-flex items-center gap-1 mt-3 text-sm font-semibold text-primary">
                    Read more <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* JSON-LD Blog */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Blog",
            name: "KKTechDeals Blog",
            url: `${SITE_URL}/blog`,
            description: "Tips, tutorials, and industry insights on IMEI unlocking, GSM services, and digital products in Myanmar.",
          }),
        }}
      />
    </div>
  );
}
