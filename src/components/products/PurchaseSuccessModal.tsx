import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useCountUp } from "@/hooks/use-count-up";
import { cn } from "@/lib/utils";
import OrderSuccessCard from "./OrderSuccessCard";

interface PurchaseResult {
  order_id: string;
  credentials: string;
  product_name: string;
  price: number;
  quantity?: number;
  unit_price?: number;
}

interface PurchaseSuccessModalProps {
  result: PurchaseResult | null;
  onClose: () => void;
  totalSavings?: number;
}

export default function PurchaseSuccessModal({
  result,
  onClose,
  totalSavings = 0,
}: PurchaseSuccessModalProps) {
  const { profile } = useAuth();

  const currentBalance = profile?.balance ?? 0;
  const previousBalance = currentBalance + (result?.price ?? 0);

  return (
    <Dialog open={!!result} onOpenChange={() => onClose()}>
      <DialogContent
        className={cn(
          "bg-card border-border/30 max-w-md p-0 gap-0 overflow-hidden",
          "shadow-[0_25px_60px_-12px_hsl(var(--foreground)/0.15)]",
          "rounded-[20px] animate-scale-in"
        )}
      >
        {result && (
          <div className="p-6 max-h-[85vh] overflow-y-auto">
            <OrderSuccessCard
              result={result}
              showConfetti={totalSavings >= 10000}
              previousBalance={previousBalance}
              currentBalance={currentBalance}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
