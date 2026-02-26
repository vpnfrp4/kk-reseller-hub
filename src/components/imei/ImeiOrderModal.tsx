import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Money from "@/components/shared/Money";
import {
  Smartphone,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Copy,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

interface ImeiService {
  id: string;
  brand: string;
  service_name: string;
  carrier: string;
  country: string;
  processing_time: string;
  price: number;
  final_price?: number;
}

interface Props {
  service: ImeiService;
  onClose: () => void;
}

export default function ImeiOrderModal({ service, onClose }: Props) {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [imei, setImei] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ order_id: string } | null>(null);

  const displayPrice = service.final_price || service.price;
  const balance = profile?.balance || 0;
  const insufficientBalance = balance < displayPrice;

  const validateImei = (value: string): boolean => {
    const cleaned = value.replace(/[\s\-]/g, "");
    if (!/^\d{15}$/.test(cleaned)) return false;
    // Luhn check
    let sum = 0;
    for (let i = 0; i < 15; i++) {
      let d = parseInt(cleaned[i], 10);
      if (i % 2 === 1) { d *= 2; if (d > 9) d -= 9; }
      sum += d;
    }
    return sum % 10 === 0;
  };

  const handleSubmit = async () => {
    setError("");
    const cleaned = imei.replace(/[\s\-]/g, "");

    if (!cleaned) { setError("Please enter an IMEI number."); return; }
    if (!/^\d{15}$/.test(cleaned)) { setError("IMEI must be exactly 15 digits."); return; }
    if (!validateImei(cleaned)) { setError("Invalid IMEI number (Luhn check failed)."); return; }
    if (insufficientBalance) { setError("Insufficient balance."); return; }

    setSubmitting(true);
    try {
      const { data, error: rpcError } = await supabase.functions.invoke("purchase", {
        body: {
          product_id: service.id,
          quantity: 1,
          fulfillment_mode: "manual",
          imei_number: cleaned,
        },
      });

      if (rpcError) throw rpcError;

      const result = data as any;
      if (!result.success) {
        setError(result.error || "Purchase failed.");
        return;
      }

      setSuccess({ order_id: result.order_id });
      await refreshProfile();
      queryClient.invalidateQueries({ queryKey: ["imei-orders"] });
      toast.success("IMEI order placed successfully!");
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-md">
        {success ? (
          // Success state
          <div className="text-center py-4 space-y-4">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
              <CheckCircle2 className="w-7 h-7 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Order Placed</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Your IMEI unlock request has been submitted and is being processed.
              </p>
            </div>
            <div className="glass-card p-4 text-left space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Service</span>
                <span className="font-semibold">{service.service_name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Brand</span>
                <span>{service.brand}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">IMEI</span>
                <span className="font-mono text-xs">{imei.replace(/[\s\-]/g, "")}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Amount</span>
                <Money amount={displayPrice} className="font-bold text-primary" />
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Est. Time</span>
                <span className="text-xs">{service.processing_time}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={onClose}>
                Close
              </Button>
              <Button className="flex-1" onClick={() => { onClose(); navigate("/dashboard/imei-orders"); }}>
                View Orders
              </Button>
            </div>
          </div>
        ) : (
          // Order form
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-primary" />
                Place IMEI Order
              </DialogTitle>
              <DialogDescription>
                Submit your IMEI number for processing
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-2">
              {/* Service details */}
              <div className="glass-card p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Service</span>
                  <span className="font-semibold text-foreground">{service.service_name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Brand / Carrier</span>
                  <span className="text-foreground">{service.brand} / {service.carrier}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Country</span>
                  <span className="text-foreground">{service.country}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Processing Time</span>
                  <span className="inline-flex items-center gap-1 text-foreground">
                    <Clock className="w-3 h-3" /> {service.processing_time}
                  </span>
                </div>
                <div className="border-t border-border pt-2 flex justify-between text-sm">
                  <span className="font-semibold">Price</span>
                  <Money amount={displayPrice} className="text-lg font-bold text-primary" />
                </div>
              </div>

              {/* Balance check */}
              <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
                insufficientBalance
                  ? "bg-destructive/10 border border-destructive/20 text-destructive"
                  : "bg-secondary border border-border text-foreground"
              }`}>
                <Wallet className="w-4 h-4 shrink-0" />
                <span>
                  Balance: <strong className="font-mono">{balance.toLocaleString()} MMK</strong>
                </span>
                {insufficientBalance && (
                   <span className="ml-auto text-xs font-semibold">
                     Need {(displayPrice - balance).toLocaleString()} more
                  </span>
                )}
              </div>

              {/* IMEI input */}
              <div className="space-y-2">
                <Label htmlFor="imei-input" className="text-sm font-semibold">
                  IMEI Number
                </Label>
                <Input
                  id="imei-input"
                  type="text"
                  inputMode="numeric"
                  placeholder="Enter 15-digit IMEI number"
                  maxLength={17}
                  value={imei}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^\d\s\-]/g, "");
                    if (v.replace(/[\s\-]/g, "").length <= 15) setImei(v);
                  }}
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Dial <span className="font-mono font-semibold">*#06#</span> on the device to find IMEI
                </p>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={onClose} className="flex-1">
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={submitting || insufficientBalance}
                  className="flex-1"
                >
                  {submitting ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-1" />
                  ) : null}
                  {submitting ? "Processing..." : "Submit Order"}
                </Button>
              </div>

              <p className="text-[11px] text-center text-muted-foreground">
                Orders are non-refundable. Please verify your IMEI before submitting.
              </p>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
