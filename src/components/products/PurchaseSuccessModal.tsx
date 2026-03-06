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
  if (!result) return null;

  return (
    <OrderSuccessCard
      result={result}
      showConfetti={totalSavings >= 10000}
      onClose={onClose}
    />
  );
}
