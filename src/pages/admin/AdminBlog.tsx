import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Search, Plus, Pencil, Trash2, Eye, EyeOff, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { DataCard } from "@/components/shared";
import ConfirmModal from "@/components/shared/ConfirmModal";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

interface PostForm {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_image_url: string;
  meta_title: string;
  meta_description: string;
  meta_keywords: string;
  is_published: boolean;
}

const emptyForm: PostForm = {
  title: "", slug: "", excerpt: "", content: "",
  cover_image_url: "", meta_title: "", meta_description: "", meta_keywords: "",
  is_published: false,
};

function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export default function AdminBlog() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<PostForm>(emptyForm);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["admin-blog-posts"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("blog_posts")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const filtered = posts.filter((p: any) =>
    !search.trim() || p.title.toLowerCase().includes(search.trim().toLowerCase())
  );

  const openCreate = () => {
    setEditId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (post: any) => {
    setEditId(post.id);
    setForm({
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt || "",
      content: post.content || "",
      cover_image_url: post.cover_image_url || "",
      meta_title: post.meta_title || "",
      meta_description: post.meta_description || "",
      meta_keywords: post.meta_keywords || "",
      is_published: post.is_published,
    });
    setDialogOpen(true);
  };

  const handleTitleChange = (title: string) => {
    const updates: Partial<PostForm> = { title };
    if (!editId) updates.slug = slugify(title);
    setForm((f) => ({ ...f, ...updates }));
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.slug.trim()) {
      toast.error("Title and slug are required");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        slug: form.slug.trim(),
        excerpt: form.excerpt.trim(),
        content: form.content,
        cover_image_url: form.cover_image_url.trim() || null,
        meta_title: form.meta_title.trim() || `${form.title.trim()} – Buy Online in Myanmar | KKTechDeals`,
        meta_description: form.meta_description.trim() || form.excerpt.trim() || null,
        meta_keywords: form.meta_keywords.trim() || null,
        is_published: form.is_published,
        published_at: form.is_published ? new Date().toISOString() : null,
        author_id: user?.id,
      };

      if (editId) {
        const { published_at, author_id, ...updatePayload } = payload;
        // Only set published_at if transitioning to published
        const existing = posts.find((p: any) => p.id === editId);
        const finalPayload = {
          ...updatePayload,
          ...(form.is_published && !existing?.published_at ? { published_at: new Date().toISOString() } : {}),
        };
        const { error } = await (supabase as any).from("blog_posts").update(finalPayload).eq("id", editId);
        if (error) throw error;
        toast.success("Post updated");
      } else {
        const { error } = await (supabase as any).from("blog_posts").insert(payload);
        if (error) throw error;
        toast.success("Post created");
      }
      setDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["admin-blog-posts"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { error } = await (supabase as any).from("blog_posts").delete().eq("id", deleteTarget.id);
      if (error) throw error;
      toast.success("Post deleted");
      queryClient.invalidateQueries({ queryKey: ["admin-blog-posts"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to delete");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">Blog Posts</p>
          <p className="text-xs text-muted-foreground mt-0.5">{posts.length} post{posts.length !== 1 ? "s" : ""}</p>
        </div>
        <Button size="sm" className="btn-glow" onClick={openCreate}>
          <Plus className="w-4 h-4 mr-1.5" />
          New Post
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Search posts..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
      </div>

      <DataCard noPadding>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/30 text-[10px] uppercase tracking-widest text-muted-foreground">
                <th className="text-left px-5 py-3 font-semibold">Title</th>
                <th className="text-left px-3 py-3 font-semibold">Slug</th>
                <th className="text-center px-3 py-3 font-semibold">Status</th>
                <th className="text-center px-3 py-3 font-semibold">Date</th>
                <th className="text-right px-5 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/10">
                    <td colSpan={5} className="px-5 py-4"><div className="h-4 bg-muted/30 rounded animate-pulse" /></td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-muted-foreground">No posts found</td></tr>
              ) : (
                filtered.map((p: any) => (
                  <tr key={p.id} className="border-b border-border/10 hover:bg-muted/10 transition-colors">
                    <td className="px-5 py-3 font-semibold text-foreground max-w-[200px] truncate">{p.title}</td>
                    <td className="px-3 py-3 text-muted-foreground font-mono text-xs max-w-[150px] truncate">/blog/{p.slug}</td>
                    <td className="px-3 py-3 text-center">
                      <span className={cn(
                        "text-[11px] px-2.5 py-1 rounded-full font-medium inline-flex items-center gap-1",
                        p.is_published ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                      )}>
                        {p.is_published ? <><Eye className="w-3 h-3" /> Published</> : <><EyeOff className="w-3 h-3" /> Draft</>}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center text-xs text-muted-foreground">
                      {format(new Date(p.published_at || p.created_at), "MMM d, yyyy")}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {p.is_published && (
                          <Button size="icon" variant="ghost" className="h-8 w-8" asChild>
                            <a href={`/blog/${p.slug}`} target="_blank" rel="noopener"><ExternalLink className="w-3.5 h-3.5" /></a>
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(p)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteTarget({ id: p.id, title: p.title })}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </DataCard>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Post" : "New Post"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input value={form.title} onChange={(e) => handleTitleChange(e.target.value)} placeholder="Post title" />
            </div>
            <div className="space-y-1.5">
              <Label>Slug</Label>
              <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="post-url-slug" className="font-mono text-sm" />
              <p className="text-[11px] text-muted-foreground">URL: /blog/{form.slug || "..."}</p>
            </div>
            <div className="space-y-1.5">
              <Label>Excerpt</Label>
              <Textarea value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} placeholder="Short summary for listings and SEO..." rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label>Content (HTML)</Label>
              <Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="<p>Write your article content here...</p>" rows={10} className="font-mono text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label>Cover Image URL</Label>
              <Input value={form.cover_image_url} onChange={(e) => setForm({ ...form, cover_image_url: e.target.value })} placeholder="https://..." />
            </div>

            {/* SEO Fields */}
            <div className="border-t border-border pt-4 space-y-4">
              <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">SEO Settings</p>
              <div className="space-y-1.5">
                <Label>Meta Title</Label>
                <Input value={form.meta_title} onChange={(e) => setForm({ ...form, meta_title: e.target.value })} placeholder="Auto-generated if empty" />
                <p className="text-[11px] text-muted-foreground">{(form.meta_title || `${form.title} – Buy Online in Myanmar | KKTechDeals`).length}/60 chars</p>
              </div>
              <div className="space-y-1.5">
                <Label>Meta Description</Label>
                <Textarea value={form.meta_description} onChange={(e) => setForm({ ...form, meta_description: e.target.value })} placeholder="Uses excerpt if empty" rows={2} />
                <p className="text-[11px] text-muted-foreground">{(form.meta_description || form.excerpt).length}/160 chars</p>
              </div>
              <div className="space-y-1.5">
                <Label>Meta Keywords</Label>
                <Input value={form.meta_keywords} onChange={(e) => setForm({ ...form, meta_keywords: e.target.value })} placeholder="imei unlock, myanmar, gsm tools" />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <Label>Publish</Label>
              <Switch checked={form.is_published} onCheckedChange={(v) => setForm({ ...form, is_published: v })} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="btn-glow">
              {saving ? "Saving..." : editId ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmModal
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Delete Post"
        description={`Are you sure you want to delete "${deleteTarget?.title}"? This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        destructive
        loading={deleting}
      />
    </div>
  );
}
