import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface ReviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  productName: string;
  userId: string;
}

export default function ReviewModal({ open, onOpenChange, orderId, productName, userId }: ReviewModalProps) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error("Please select a rating");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("order_reviews" as any).insert({
        order_id: orderId,
        user_id: userId,
        rating,
        comment: comment.trim(),
      } as any);
      if (error) {
        if (error.code === "23505") {
          toast.error("You have already reviewed this order");
        } else {
          throw error;
        }
        return;
      }
      toast.success("Review submitted — thank you!");
      queryClient.invalidateQueries({ queryKey: ["order-reviews"] });
      queryClient.invalidateQueries({ queryKey: ["providers"] });
      onOpenChange(false);
      setRating(0);
      setComment("");
    } catch (err: any) {
      toast.error(err.message || "Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  };

  const displayRating = hoveredRating || rating;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md glass-card border-border/40">
        <DialogHeader>
          <DialogTitle className="text-foreground">Rate Your Experience</DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">
            How was your experience with <span className="font-semibold text-foreground">{productName}</span>?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Star rating */}
          <div className="flex flex-col items-center gap-2">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star
                    className={cn(
                      "w-8 h-8 transition-colors",
                      star <= displayRating
                        ? "text-amber-400 fill-amber-400"
                        : "text-muted-foreground/30"
                    )}
                  />
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {displayRating === 0
                ? "Tap a star to rate"
                : displayRating === 1
                ? "Poor"
                : displayRating === 2
                ? "Fair"
                : displayRating === 3
                ? "Good"
                : displayRating === 4
                ? "Very Good"
                : "Excellent"}
            </p>
          </div>

          {/* Comment */}
          <Textarea
            placeholder="Share details about your experience (optional)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="bg-muted/20 border-border/40 min-h-[80px] text-sm resize-none"
            maxLength={500}
          />

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 btn-glow"
              onClick={handleSubmit}
              disabled={submitting || rating === 0}
            >
              {submitting ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
              ) : (
                "Submit Review"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
