import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useSearchParams } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { LangProvider } from "@/contexts/LangContext";
import Login from "./pages/Login";
import DashboardHome from "./pages/DashboardHome";
import WalletPage from "./pages/WalletPage";
import ProductsPage from "./pages/ProductsPage";
import OrdersPage from "./pages/OrdersPage";
import OrderDetailPage from "./pages/OrderDetailPage";
import ProductDetailPage from "./pages/ProductDetailPage";
import OrderFlowPage from "./pages/OrderFlowPage";
import PlaceOrderPage from "./pages/PlaceOrderPage";
import ProviderProfilePage from "./pages/ProviderProfilePage";
import SettingsPage from "./pages/SettingsPage";
import NotificationsPage from "./pages/NotificationsPage";
import TopUpStatusPage from "./pages/TopUpStatusPage";
import ResetPassword from "./pages/ResetPassword";
import TermsPage from "./pages/TermsPage";
import DashboardLayout from "./components/dashboard/DashboardLayout";
import AdminLayout from "./components/admin/AdminLayout";
import AdminOverview from "./pages/admin/AdminOverview";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminCredentials from "./pages/admin/AdminCredentials";
import AdminTopups from "./pages/admin/AdminTopups";
import AdminResellers from "./pages/admin/AdminResellers";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminProviders from "./pages/admin/AdminProviders";
import LandingPage from "./pages/LandingPage";
import ImeiCheckPage from "./pages/ImeiCheckPage";
import ImeiMarketplacePage from "./pages/ImeiMarketplacePage";
import ImeiOrdersPage from "./pages/ImeiOrdersPage";
import ImeiUnlockPage from "./pages/services/ImeiUnlockPage";
import VpnKeysPage from "./pages/services/VpnKeysPage";
import CapcutProPage from "./pages/services/CapcutProPage";
import InstallPage from "./pages/InstallPage";
import BlogListPage from "./pages/BlogListPage";
import BlogPostPage from "./pages/BlogPostPage";
import AdminBlog from "./pages/admin/AdminBlog";
import AdminProfitDashboard from "./pages/admin/AdminProfitDashboard";
import AdminMonitoring from "./pages/admin/AdminMonitoring";
import NotFound from "./pages/NotFound";
import { useRealtimeNotifications } from "@/hooks/use-realtime-notifications";
import { useState, useCallback } from "react";
import SplashScreen from "@/components/SplashScreen";
import PwaUpdatePrompt from "@/components/PwaUpdatePrompt";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <DashboardLayout>{children}</DashboardLayout>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <AdminLayout>{children}</AdminLayout>;
}

function WalletTopupRedirect() {
  const [searchParams] = useSearchParams();
  const txId = searchParams.get("id") || "";
  return txId
    ? <Navigate to={`/dashboard/topup-status/${txId}`} replace />
    : <Navigate to="/dashboard/wallet" replace />;
}

function AppRoutes() {
  const { isAuthenticated, loading } = useAuth();
  useRealtimeNotifications();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/install" element={<InstallPage />} />
      <Route path="/tools/imei-check" element={<ImeiCheckPage />} />
      <Route path="/imei-marketplace" element={<ImeiMarketplacePage />} />
      <Route path="/services/imei-unlock" element={<ImeiUnlockPage />} />
      <Route path="/services/vpn-keys" element={<VpnKeysPage />} />
      <Route path="/services/capcut-pro" element={<CapcutProPage />} />
      <Route path="/blog" element={<BlogListPage />} />
      <Route path="/blog/:slug" element={<BlogPostPage />} />
      <Route path="/orders" element={<Navigate to="/dashboard/orders" replace />} />
      <Route path="/products" element={<Navigate to="/dashboard/products" replace />} />
      <Route path="/wallet" element={<Navigate to="/dashboard/wallet" replace />} />
      <Route path="/settings" element={<Navigate to="/dashboard/settings" replace />} />
      <Route path="/notifications" element={<Navigate to="/dashboard/notifications" replace />} />
      <Route path="/dashboard" element={<ProtectedRoute><DashboardHome /></ProtectedRoute>} />
      <Route path="/dashboard/place-order" element={<ProtectedRoute><PlaceOrderPage /></ProtectedRoute>} />
      <Route path="/dashboard/wallet" element={<ProtectedRoute><WalletPage /></ProtectedRoute>} />
      <Route path="/dashboard/wallet/topup-status" element={<WalletTopupRedirect />} />
      <Route path="/dashboard/topup-status/:id" element={<ProtectedRoute><TopUpStatusPage /></ProtectedRoute>} />
      <Route path="/dashboard/products" element={<ProtectedRoute><ProductsPage /></ProtectedRoute>} />
      <Route path="/dashboard/products/:id" element={<ProtectedRoute><ProductDetailPage /></ProtectedRoute>} />
      <Route path="/dashboard/order/:id" element={<ProtectedRoute><OrderFlowPage /></ProtectedRoute>} />
      <Route path="/dashboard/providers/:id" element={<ProtectedRoute><ProviderProfilePage /></ProtectedRoute>} />
      <Route path="/dashboard/orders" element={<ProtectedRoute><OrdersPage /></ProtectedRoute>} />
      <Route path="/dashboard/orders/:id" element={<ProtectedRoute><OrderDetailPage /></ProtectedRoute>} />
      <Route path="/dashboard/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
      <Route path="/dashboard/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
      <Route path="/dashboard/imei-orders" element={<ProtectedRoute><ImeiOrdersPage /></ProtectedRoute>} />
      <Route path="/dashboard/*" element={<Navigate to="/dashboard" replace />} />
      <Route path="/admin" element={<AdminRoute><AdminOverview /></AdminRoute>} />
      <Route path="/admin/products" element={<AdminRoute><AdminProducts /></AdminRoute>} />
      <Route path="/admin/providers" element={<AdminRoute><AdminProviders /></AdminRoute>} />
      <Route path="/admin/credentials" element={<AdminRoute><AdminCredentials /></AdminRoute>} />
      <Route path="/admin/topups" element={<AdminRoute><AdminTopups /></AdminRoute>} />
        <Route path="/admin/resellers" element={<AdminRoute><AdminResellers /></AdminRoute>} />
        <Route path="/admin/orders" element={<AdminRoute><AdminOrders /></AdminRoute>} />
        <Route path="/admin/settings" element={<AdminRoute><AdminSettings /></AdminRoute>} />
        <Route path="/admin/blog" element={<AdminRoute><AdminBlog /></AdminRoute>} />
        <Route path="/admin/profit" element={<AdminRoute><AdminProfitDashboard /></AdminRoute>} />
        <Route path="/admin/monitoring" element={<AdminRoute><AdminMonitoring /></AdminRoute>} />
        <Route path="/admin/*" element={<Navigate to="/admin" replace />} />
        <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => {
  const [splashDone, setSplashDone] = useState(false);
  const handleSplashFinished = useCallback(() => setSplashDone(true), []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <LangProvider>
          {!splashDone && <SplashScreen onFinished={handleSplashFinished} />}
          <Toaster />
          <Sonner />
          <PwaUpdatePrompt />
          <BrowserRouter>
            <AuthProvider>
              <CurrencyProvider>
                <AppRoutes />
              </CurrencyProvider>
            </AuthProvider>
          </BrowserRouter>
        </LangProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
