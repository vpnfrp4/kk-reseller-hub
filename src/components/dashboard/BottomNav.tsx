import { useLocation } from "react-router-dom";
import PrefetchLink from "@/components/PrefetchLink";
import { Home, ShoppingCart, Receipt, Wallet, User } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Home", icon: Home, path: "/dashboard" },
  { label: "Order", icon: ShoppingCart, path: "/dashboard/place-order" },
  { label: "Orders", icon: Receipt, path: "/dashboard/orders" },
  { label: "Wallet", icon: Wallet, path: "/dashboard/wallet" },
  { label: "Account", icon: User, path: "/dashboard/settings" },
];

export default function BottomNav() {
  return null;
}
