export interface ResellerUser {
  id: string;
  name: string;
  email: string;
  balance: number;
  totalSpent: number;
  totalOrders: number;
  joinedDate: string;
}

export interface WalletTransaction {
  id: string;
  type: 'topup' | 'purchase';
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  method?: string;
  description: string;
  date: string;
  screenshotUrl?: string;
}

export interface Product {
  id: string;
  name: string;
  icon: string;
  category: string;
  retailPrice: number;
  wholesalePrice: number;
  duration: string;
  stock: number;
}

export interface Order {
  id: string;
  productName: string;
  credentials: string;
  price: number;
  date: string;
  status: 'delivered' | 'pending';
}
