import { mockOrders } from "@/data/mock-data";
import { Copy, CheckCircle2 } from "lucide-react";
import { useState } from "react";

export default function OrdersPage() {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyCredentials = (id: string, creds: string) => {
    navigator.clipboard.writeText(creds);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-8">
      <div className="animate-fade-in">
        <h1 className="text-2xl font-bold text-foreground">Order History</h1>
        <p className="text-muted-foreground text-sm">View all your previous purchases</p>
      </div>

      <div className="glass-card overflow-hidden animate-fade-in" style={{ animationDelay: "0.1s" }}>
        {/* Desktop */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs font-medium text-muted-foreground p-4">Order ID</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-4">Product</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-4">Credentials</th>
                <th className="text-right text-xs font-medium text-muted-foreground p-4">Price</th>
                <th className="text-left text-xs font-medium text-muted-foreground p-4">Date</th>
                <th className="text-center text-xs font-medium text-muted-foreground p-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {mockOrders.map((order) => (
                <tr key={order.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="p-4 text-sm font-mono text-muted-foreground">{order.id}</td>
                  <td className="p-4 text-sm font-medium text-foreground">{order.productName}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <code className="text-xs font-mono text-muted-foreground bg-muted/50 px-2 py-1 rounded">
                        {order.credentials}
                      </code>
                      <button
                        onClick={() => copyCredentials(order.id, order.credentials)}
                        className="text-muted-foreground hover:text-primary transition-colors"
                      >
                        {copiedId === order.id ? (
                          <CheckCircle2 className="w-4 h-4 text-success" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </td>
                  <td className="p-4 text-sm font-mono text-right text-foreground">{order.price.toLocaleString()} MMK</td>
                  <td className="p-4 text-sm text-muted-foreground">{order.date}</td>
                  <td className="p-4 text-center">
                    <span className="text-xs px-2 py-1 rounded-full bg-success/10 text-success">
                      {order.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile */}
        <div className="md:hidden divide-y divide-border/50">
          {mockOrders.map((order) => (
            <div key={order.id} className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">{order.productName}</p>
                <span className="text-xs px-2 py-0.5 rounded-full bg-success/10 text-success">{order.status}</span>
              </div>
              <div className="flex items-center gap-2">
                <code className="text-xs font-mono text-muted-foreground bg-muted/50 px-2 py-1 rounded flex-1 truncate">
                  {order.credentials}
                </code>
                <button
                  onClick={() => copyCredentials(order.id, order.credentials)}
                  className="text-muted-foreground hover:text-primary"
                >
                  {copiedId === order.id ? <CheckCircle2 className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{order.date}</span>
                <span className="font-mono">{order.price.toLocaleString()} MMK</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
