import { CheckCircle2, Copy, ArrowLeft, History } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

interface PurchaseResult {
  order_id: string;
  credentials: string;
  product_name: string;
  price: number;
}

interface PurchaseSuccessModalProps {
  result: PurchaseResult | null;
  onClose: () => void;
}

export default function PurchaseSuccessModal({ result, onClose }: PurchaseSuccessModalProps) {
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  const copyCredentials = (creds: string) => {
    navigator.clipboard.writeText(creds);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={!!result} onOpenChange={() => onClose()}>
      <DialogContent className="bg-card border-border/50 max-w-md">
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
            </div>

            <div className="stat-card">
              <p className="text-sm text-muted-foreground mb-2">Account Credentials</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-sm font-mono text-primary bg-primary/10 px-3 py-2 rounded-lg break-all">
                  {result.credentials}
                </code>
                <button
                  onClick={() => copyCredentials(result.credentials)}
                  className="p-2 rounded-lg bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors duration-200"
                >
                  {copied ? <CheckCircle2 className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Amount Charged</span>
              <span className="font-mono font-semibold text-foreground">{result.price.toLocaleString()} MMK</span>
            </div>

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
                variant="outline"
                className="flex-1 gap-2"
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
