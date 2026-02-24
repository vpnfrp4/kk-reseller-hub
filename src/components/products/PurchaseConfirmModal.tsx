import { useState, useMemo } from "react";
import { TrendingDown, AlertTriangle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Money, QuantitySelector } from "@/components/shared";

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
  const baseTierPrice = pricingTiers.length > 0
    ? Math.max(...pricingTiers.map((t) => t.unit_price))
    : (product?.wholesale_price || 0);
  const totalSavings = (baseTierPrice - unitPrice) * quantity;

  const nextTier = useMemo(() => {
    if (!pricingTiers.length) return null;
    const sorted = [...pricingTiers].sort((a, b) => a.min_qty - b.min_qty);
    return sorted.find((t) => t.min_qty > quantity) || null;
  }, [pricingTiers, quantity]);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setQuantity(1);
      onClose();
    }
  };

  return (
    <AlertDialog open={!!product} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="bg-card border-border max-w-md rounded-modal p-card gap-card">
        {product && (
          <div className="space-y-card">
            {/* Product Name */}
            <div>
              <h2 className="text-h3 text-foreground">{product.name}</h2>
              <p className="text-caption text-muted-foreground">{product.duration}</p>
            </div>

            <Separator />

            {/* Quantity Selector */}
            <div className="space-y-compact">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">Quantity</span>
                <QuantitySelector
                  value={quantity}
                  onChange={setQuantity}
                  min={1}
                  max={maxQty}
                />
              </div>

              {/* Quick-select */}
              <div className="flex items-center gap-tight">
                {[5, 10, 20].filter((q) => q <= maxQty).map((q) => (
                  <button
                    key={q}
                    onClick={() => setQuantity(q)}
                    className={`flex-1 py-2 rounded-btn text-sm font-medium transition-all border ${
                      quantity === q
                        ? "bg-primary/10 border-primary/30 text-primary"
                        : "bg-muted/30 border-border text-muted-foreground hover:text-foreground hover:border-border"
                    }`}
                  >
                    ×{q}
                  </button>
                ))}
                {maxQty > 20 && (
                  <button
                    onClick={() => setQuantity(maxQty)}
                    className={`flex-1 py-2 rounded-btn text-sm font-medium transition-all border ${
                      quantity === maxQty
                        ? "bg-primary/10 border-primary/30 text-primary"
                        : "bg-muted/30 border-border text-muted-foreground hover:text-foreground hover:border-border"
                    }`}
                  >
                    Max
                  </button>
                )}
              </div>

              <p className="text-caption text-muted-foreground text-right">
                {product.stock} available
              </p>
            </div>

            {/* Tier Pricing Table */}
            {pricingTiers.length > 0 && (
              <div className="rounded-card bg-muted/20 border border-border p-default space-y-tight">
                <p className="text-caption font-medium text-muted-foreground uppercase tracking-wider">Price Tiers</p>
                {[...pricingTiers].sort((a, b) => a.min_qty - b.min_qty).map((tier, i) => {
                  const isActive = currentTier && tier.min_qty === currentTier.min_qty;
                  const label = tier.max_qty ? `${tier.min_qty}–${tier.max_qty}` : `${tier.min_qty}+`;
                  return (
                    <div
                      key={i}
                      className={`flex items-center justify-between text-sm px-compact py-tight rounded-btn transition-all ${
                        isActive
                          ? "bg-primary/8 border border-primary/20 text-foreground font-medium"
                          : "text-muted-foreground"
                      }`}
                    >
                      <span>{label} accounts</span>
                      <Money amount={tier.unit_price} compact />
                    </div>
                  );
                })}
              </div>
            )}

            {/* Next tier hint */}
            {nextTier && (
              <p className="flex items-center gap-1.5 text-caption text-primary">
                <TrendingDown className="w-3 h-3" />
                Buy {nextTier.min_qty - quantity} more for <Money amount={nextTier.unit_price} compact className="text-primary" />/each
              </p>
            )}

            {/* Price Breakdown */}
            <div className="space-y-tight">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Unit Price</span>
                <div className="flex items-center gap-tight">
                  {quantity > 1 && totalSavings > 0 && (
                    <Money amount={baseTierPrice} strikethrough muted compact className="text-xs" />
                  )}
                  <Money amount={unitPrice} className="text-foreground text-sm" />
                </div>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Quantity</span>
                <span className="font-mono tabular-nums text-foreground">×{quantity}</span>
              </div>
              {totalSavings > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Savings</span>
                  <span className="font-mono tabular-nums text-primary font-medium">-{totalSavings.toLocaleString()} MMK</span>
                </div>
              )}

              <Separator />

              <div className="flex justify-between items-baseline pt-micro">
                <span className="text-sm font-medium text-foreground">Total</span>
                <Money amount={totalPrice} className="text-2xl font-bold text-foreground tracking-tight" />
              </div>
            </div>

            {/* Warning line */}
            <p className="text-caption text-muted-foreground flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0" />
              Refund not available after confirmation.
            </p>

            {/* Terms */}
            <label className="flex items-start gap-compact cursor-pointer select-none">
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

        <AlertDialogFooter className="flex-col gap-tight sm:flex-col">
          <AlertDialogAction
            disabled={!agreedTerms}
            onClick={() => product && onConfirm(product, quantity)}
            className="w-full h-12 rounded-btn bg-primary text-primary-foreground font-semibold hover:brightness-90 transition-all text-base"
          >
            Confirm Purchase
          </AlertDialogAction>
          <p className="text-caption text-muted-foreground text-center">
            This will deduct <Money amount={totalPrice} compact className="text-muted-foreground inline" /> from your wallet.
          </p>
          <AlertDialogCancel className="w-full border-border rounded-btn" onClick={() => setQuantity(1)}>
            Cancel
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
