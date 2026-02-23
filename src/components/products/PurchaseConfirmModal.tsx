import { AlertTriangle } from "lucide-react";
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

interface PurchaseConfirmModalProps {
  product: any | null;
  agreedTerms: boolean;
  onAgreedTermsChange: (agreed: boolean) => void;
  onConfirm: (product: any) => void;
  onClose: () => void;
}

export default function PurchaseConfirmModal({
  product,
  agreedTerms,
  onAgreedTermsChange,
  onConfirm,
  onClose,
}: PurchaseConfirmModalProps) {
  return (
    <AlertDialog open={!!product} onOpenChange={(open) => { if (!open) onClose(); }}>
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

            <div className="stat-card space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Product</span>
                <span className="font-semibold text-foreground">{product.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Deduct from Wallet</span>
                <span className="font-mono font-bold gold-text">{product.wholesale_price.toLocaleString()} MMK</span>
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
          <AlertDialogCancel className="border-border">Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={!agreedTerms}
            onClick={() => product && onConfirm(product)}
            className="btn-glow disabled:opacity-50"
          >
            Confirm
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
