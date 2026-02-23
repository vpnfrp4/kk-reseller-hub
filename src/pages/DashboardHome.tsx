import { useAuth } from "@/contexts/AuthContext";
import { mockTransactions, mockOrders } from "@/data/mock-data";
import {
  Wallet,
  TrendingUp,
  ShoppingCart,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { Link } from "react-router-dom";

export default function DashboardHome() {
  const { user } = useAuth();

  const stats = [
    {
      label: "Wallet Balance",
      value: `${user?.balance?.toLocaleString()} MMK`,
      icon: Wallet,
      change: "+12%",
      positive: true,
    },
    {
      label: "Total Spent",
      value: `${user?.totalSpent?.toLocaleString()} MMK`,
      icon: TrendingUp,
      change: "This month",
      positive: true,
    },
    {
      label: "Total Orders",
      value: user?.totalOrders?.toString() || "0",
      icon: ShoppingCart,
      change: "+5 this week",
      positive: true,
    },
  ];

  const recentTransactions = mockTransactions.slice(0, 4);
  const recentOrders = mockOrders.slice(0, 3);

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <div className="animate-fade-in">
        <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
          Welcome back, <span className="text-primary glow-text">{user?.name}</span>
        </h1>
        <p className="text-muted-foreground mt-1">Here's your reseller overview</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((stat, i) => (
          <div
            key={stat.label}
            className="stat-card animate-fade-in"
            style={{ animationDelay: `${i * 0.1}s` }}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <stat.icon className="w-5 h-5 text-primary" />
              </div>
              <span className="flex items-center gap-1 text-xs text-success">
                {stat.positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {stat.change}
              </span>
            </div>
            <p className="text-2xl font-bold font-mono text-foreground">{stat.value}</p>
            <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Quick sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <div className="glass-card p-6 animate-fade-in" style={{ animationDelay: "0.3s" }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">Recent Transactions</h3>
            <Link to="/dashboard/wallet" className="text-xs text-primary hover:underline">View all</Link>
          </div>
          <div className="space-y-3">
            {recentTransactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-foreground">{tx.description}</p>
                  <p className="text-xs text-muted-foreground">{tx.date}</p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-mono font-semibold ${tx.type === "topup" ? "text-success" : "text-foreground"}`}>
                    {tx.type === "topup" ? "+" : ""}{tx.amount.toLocaleString()}
                  </p>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                    tx.status === "approved" ? "bg-success/10 text-success" :
                    tx.status === "pending" ? "bg-warning/10 text-warning" :
                    "bg-destructive/10 text-destructive"
                  }`}>
                    {tx.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Orders */}
        <div className="glass-card p-6 animate-fade-in" style={{ animationDelay: "0.4s" }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">Recent Orders</h3>
            <Link to="/dashboard/orders" className="text-xs text-primary hover:underline">View all</Link>
          </div>
          <div className="space-y-3">
            {recentOrders.map((order) => (
              <div key={order.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-foreground">{order.productName}</p>
                  <p className="text-xs text-muted-foreground font-mono">{order.credentials}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-mono font-semibold text-foreground">{order.price.toLocaleString()} MMK</p>
                  <p className="text-xs text-muted-foreground">{order.date}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
