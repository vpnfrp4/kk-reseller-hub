import { useState, useMemo } from "react";
import { AlertTriangle, Minus, Plus, TrendingDown, BadgePercent } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";

interface PricingTier {
  min_qty: number;
  max_qty: number | null;
  unit_price: number;
}

interface PurchaseConfirmModalProps {
  product: any | null;
  agreedTerms: boolean;
  onAgreedTermsChange: (agreed: boolean) => void;
  onConfirm: (product: any, quantity: number) => void;
  onClose: () => void;
  pricingTiers?: PricingTier[];
}

export default function PurchaseConfirmModal({
  product,
  agreedTerms,
  onAgreedTermsChange,
  onConfirm,
  onClose,
  pricingTiers = [],
}: PurchaseConfirmModalProps) {
  const [quantity, setQuantity] = useState(1);

  const maxQty = product ? Math.min(product.stock, 100) : 1;

  const currentTier = useMemo(() => {
    if (!pricingTiers.length) return null;
    const sorted = [...pricingTiers].sort((a, b) => b.min_qty - a.min_qty);
    return sorted.find((t) => quantity >= t.min_qty && (t.max_qty === null || quantity <= t.max_qty)) || null;
  }, [pricingTiers, quantity]);

  const unitPrice = currentTier ? currentTier.unit_price : (product?.wholesale_price || 0);
  const totalPrice = unitPrice * quantity;
  const basePrice = product?.wholesale_price || 0;
  const baseTierPrice = pricingTiers.length > 0
    ? Math.max(...pricingTiers.map((t) => t.unit_price))
    : basePrice;
  const totalSavings = (baseTierPrice - unitPrice) * quantity;

  const nextTier = useMemo(() => {
    if (!pricingTiers.length) return null;
    const sorted = [...pricingTiers].sort((a, b) => a.min_qty - b.min_qty);
    return sorted.find((t) => t.min_qty > quantity) || null;
  }, [pricingTiers, quantity]);

  // Reset quantity when product changes
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setQuantity(1);
      onClose();
    }
  };

  return (
    <AlertDialog open={!!product} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="bg-card border-border/50 max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-foreground flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-warning" />
            Confirm Purchase
          </AlertDialogTitle>
        </AlertDialogHeader>

        {product && (
          <div className="space-y-4">
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3">
              <p className="text-sm text-destructive leading-relaxed">
                ဝယ်ယူပြီးသား အကောင့်များကို Refund (ငွေပြန်အမ်းခြင်း) လုံးဝပြုလုပ်ပေးမည်မဟုတ်ပါ။ Customer အဆင်သင့်ရှိမှသာ ဝယ်ယူပေးပါရန်။
              </p>
            </div>

            <div className="stat-card space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Product</span>
                <span className="font-semibold text-foreground">{product.name} {product.duration}</span>
              </div>

              {/* Quantity Selector */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Quantity</span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </Button>
                  <span className="w-10 text-center font-mono font-bold text-foreground text-lg">
                    {quantity}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setQuantity(Math.min(maxQty, quantity + 1))}
                    disabled={quantity >= maxQty}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {/* Quick-select buttons */}
              <div className="flex items-center gap-1.5">
                {[5, 10, 20].filter((q) => q <= maxQty).map((q) => (
                  <button
                    key={q}
                    onClick={() => setQuantity(q)}
                    className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all border ${
                      quantity === q
                        ? "bg-primary/15 border-primary/40 text-primary"
                        : "bg-muted/40 border-border/50 text-muted-foreground hover:text-foreground hover:border-border"
                    }`}
                  >
                    ×{q}
                  </button>
                ))}
                {maxQty > 20 && (
                  <button
                    onClick={() => setQuantity(maxQty)}
                    className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-all border ${
                      quantity === maxQty
                        ? "bg-primary/15 border-primary/40 text-primary"
                        : "bg-muted/40 border-border/50 text-muted-foreground hover:text-foreground hover:border-border"
                    }`}
                  >
                    Max
                  </button>
                )}
              </div>

              {/* Stock indicator */}
              <p className="text-[11px] text-muted-foreground text-right">
                {product.stock} available in stock
              </p>

              {/* Tier Pricing Table */}
              {pricingTiers.length > 0 && (
                <div className="rounded-lg bg-muted/30 border border-border/30 p-3 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Price Tiers</p>
                  {[...pricingTiers].sort((a, b) => a.min_qty - b.min_qty).map((tier, i) => {
                    const isActive = currentTier && tier.min_qty === currentTier.min_qty;
                    const label = tier.max_qty
                      ? `${tier.min_qty}–${tier.max_qty}`
                      : `${tier.min_qty}+`;
                    return (
                      <div
                        key={i}
                        className={`flex items-center justify-between text-xs px-2 py-1.5 rounded-md transition-all ${
                          isActive
                            ? "bg-primary/10 border border-primary/30 text-foreground font-semibold"
                            : "text-muted-foreground"
                        }`}
                      >
                        <span>{label} accounts</span>
                        <span className={`font-mono ${isActive ? "gold-text" : ""}`}>
                          {tier.unit_price.toLocaleString()} MMK / each
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Next tier hint */}
              {nextTier && (
                <div className="flex items-center gap-1.5 text-[11px] text-primary">
                  <TrendingDown className="w-3 h-3" />
                  Buy {nextTier.min_qty - quantity} more to unlock {nextTier.unit_price.toLocaleString()} MMK/each
                </div>
              )}

              {/* Savings comparison banner */}
              {quantity > 1 && totalSavings > 0 && (
                <div className="rounded-lg bg-success/10 border border-success/20 p-3 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <BadgePercent className="w-4 h-4 text-success" />
                    <span className="text-xs font-semibold text-success">
                      You save {Math.round(((baseTierPrice - unitPrice) / baseTierPrice) * 100)}% with bulk pricing
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px]">
                    <div className="flex-1 space-y-1">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Individual ({quantity} × {baseTierPrice.toLocaleString()})</span>
                        <span className="font-mono line-through">{(baseTierPrice * quantity).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-success font-medium">
                        <span>Bulk ({quantity} × {unitPrice.toLocaleString()})</span>
                        <span className="font-mono">{totalPrice.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  {/* Visual savings bar */}
                  <div className="relative h-2 rounded-full bg-muted/50 overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full bg-success/60 transition-all duration-500"
                      style={{ width: `${100 - Math.round(((baseTierPrice - unitPrice) / baseTierPrice) * 100)}%` }}
                    />
                  </div>
                  <p className="text-center text-xs font-mono font-bold text-success">
                    -{totalSavings.toLocaleString()} MMK saved
                  </p>
                </div>
              )}

              <div className="border-t border-border/30 pt-3 space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Unit Price</span>
                  <div className="flex items-center gap-2">
                    {quantity > 1 && totalSavings > 0 && (
                      <span className="font-mono text-xs text-muted-foreground line-through">
                        {baseTierPrice.toLocaleString()}
                      </span>
                    )}
                    <span className="font-mono font-semibold text-foreground">{unitPrice.toLocaleString()} MMK</span>
                  </div>
                </div>
                <div className="flex justify-between text-sm pt-1">
                  <span className="text-muted-foreground font-medium">Deduct from Wallet</span>
                  <span className="font-mono font-bold gold-text text-lg">{totalPrice.toLocaleString()} MMK</span>
                </div>
              </div>
            </div>

            <label className="flex items-start gap-3 cursor-pointer select-none">
              <Checkbox
                checked={agreedTerms}
                onCheckedChange={(checked) => onAgreedTermsChange(checked === true)}
                className="mt-0.5"
              />
              <span className="text-sm text-muted-foreground">
                I agree to the{" "}
                <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80">
                  Terms and Conditions
                </a>.
              </span>
            </label>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel className="border-border" onClick={() => setQuantity(1)}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={!agreedTerms}
            onClick={() => product && onConfirm(product, quantity)}
            className="btn-glow disabled:opacity-50"
          >
            Confirm — {totalPrice.toLocaleString()} MMK
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
