import { CheckCircle2, Copy, ArrowLeft, History, BadgePercent } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Confetti from "@/components/Confetti";

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

export default function PurchaseSuccessModal({ result, onClose, totalSavings = 0 }: PurchaseSuccessModalProps) {
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();
  const showConfetti = totalSavings >= 10000;

  const copyCredentials = (creds: string) => {
    navigator.clipboard.writeText(creds);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const credentialsList = result?.credentials?.split("\n").filter(Boolean) || [];

  return (
    <Dialog open={!!result} onOpenChange={() => onClose()}>
        <DialogContent className="bg-card border-border/50 max-w-md relative overflow-hidden">
          {showConfetti && <Confetti />}
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-success" />
              Purchase Successful!
            </DialogTitle>
          </DialogHeader>

        {result && (
          <div className="space-y-4">
            <div className="stat-card">
              <p className="text-sm text-muted-foreground mb-1">Product</p>
              <p className="text-foreground font-semibold">{result.product_name}</p>
              {result.quantity && result.quantity > 1 && (
                <p className="text-xs text-muted-foreground mt-1">
                  {result.quantity} accounts × {(result.unit_price || 0).toLocaleString()} MMK
                </p>
              )}
            </div>

            <div className="stat-card">
              <p className="text-sm text-muted-foreground mb-2">
                Account Credentials {credentialsList.length > 1 ? `(${credentialsList.length})` : ""}
              </p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {credentialsList.map((cred, i) => (
                  <div key={i} className="flex items-center gap-2">
                    {credentialsList.length > 1 && (
                      <span className="text-[10px] text-muted-foreground font-mono w-5 shrink-0">#{i + 1}</span>
                    )}
                    <code className="flex-1 text-sm font-mono text-primary bg-primary/10 px-3 py-2 rounded-lg break-all">
                      {cred}
                    </code>
                    <button
                      onClick={() => copyCredentials(cred)}
                      className="p-2 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors duration-200 shrink-0"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              {credentialsList.length > 1 && (
                <button
                  onClick={() => copyCredentials(result.credentials)}
                  className="mt-2 text-xs text-primary hover:text-primary/80 transition-colors"
                >
                  {copied ? "✓ Copied all" : "Copy all credentials"}
                </button>
              )}
              {credentialsList.length === 1 && copied && (
                <p className="text-xs text-success mt-1">✓ Copied</p>
              )}
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total Charged</span>
              <span className="font-mono font-semibold text-foreground">{result.price.toLocaleString()} MMK</span>
            </div>

            {totalSavings > 0 && (
              <div className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-success/10 border border-success/20 animate-fade-in">
                <BadgePercent className="w-4 h-4 text-success" />
                <span className="text-sm font-semibold text-success">
                  You saved {totalSavings.toLocaleString()} MMK{showConfetti ? " 🎉" : ""}
                </span>
              </div>
            )}

            <p className="text-xs text-muted-foreground text-center">
              These credentials are also saved in your Order History.
            </p>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={() => {
                  onClose();
                  navigate("/dashboard/products");
                }}
              >
                <ArrowLeft className="w-4 h-4" />
                Products
              </Button>
              <Button
                className="flex-1 gap-2 btn-glow"
                onClick={() => {
                  onClose();
                  navigate("/dashboard/orders");
                }}
              >
                <History className="w-4 h-4" />
                Order History
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
