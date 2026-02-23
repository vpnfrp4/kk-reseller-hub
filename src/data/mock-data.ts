import { ResellerUser, WalletTransaction, Product, Order } from "@/types/reseller";

export const mockUser: ResellerUser = {
  id: "r-001",
  name: "Aung Kyaw",
  email: "aungkyaw@reseller.com",
  balance: 45000,
  totalSpent: 320000,
  totalOrders: 47,
  joinedDate: "2024-11-15",
};

export const mockTransactions: WalletTransaction[] = [
  { id: "t-001", type: "topup", amount: 50000, status: "approved", method: "KPay", description: "Wallet Top-up via KPay", date: "2026-02-22" },
  { id: "t-002", type: "purchase", amount: -5000, status: "approved", description: "ExpressVPN 1-Month", date: "2026-02-21" },
  { id: "t-003", type: "topup", amount: 100000, status: "pending", method: "WavePay", description: "Wallet Top-up via WavePay", date: "2026-02-20" },
  { id: "t-004", type: "purchase", amount: -8000, status: "approved", description: "CapCut Pro 1-Year", date: "2026-02-19" },
  { id: "t-005", type: "topup", amount: 30000, status: "rejected", method: "KPay", description: "Wallet Top-up via KPay", date: "2026-02-18" },
];

export const mockProducts: Product[] = [
  { id: "p-001", name: "ExpressVPN", icon: "🛡️", category: "VPN", retailPrice: 8000, wholesalePrice: 5000, duration: "1 Month", stock: 24 },
  { id: "p-002", name: "ExpressVPN", icon: "🛡️", category: "VPN", retailPrice: 45000, wholesalePrice: 28000, duration: "1 Year", stock: 12 },
  { id: "p-003", name: "LetsVPN", icon: "🌐", category: "VPN", retailPrice: 5000, wholesalePrice: 3000, duration: "1 Month", stock: 50 },
  { id: "p-004", name: "LetsVPN", icon: "🌐", category: "VPN", retailPrice: 30000, wholesalePrice: 18000, duration: "1 Year", stock: 20 },
  { id: "p-005", name: "CapCut Pro", icon: "🎬", category: "Creative", retailPrice: 12000, wholesalePrice: 8000, duration: "1 Year", stock: 15 },
  { id: "p-006", name: "Canva Pro", icon: "🎨", category: "Creative", retailPrice: 15000, wholesalePrice: 10000, duration: "1 Year", stock: 8 },
];

export const mockOrders: Order[] = [
  { id: "o-001", productName: "ExpressVPN 1-Month", credentials: "user123@vpn.com / Xk9#mP2q", price: 5000, date: "2026-02-21", status: "delivered" },
  { id: "o-002", productName: "CapCut Pro 1-Year", credentials: "LIC-XXXX-YYYY-ZZZZ", price: 8000, date: "2026-02-19", status: "delivered" },
  { id: "o-003", productName: "LetsVPN 1-Month", credentials: "res_let@vpn.io / Mn4$bR7w", price: 3000, date: "2026-02-17", status: "delivered" },
];
