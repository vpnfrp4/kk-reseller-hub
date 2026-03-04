import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useSearchParams } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import { LangProvider } from "@/contexts/LangContext";
import { useRealtimeNotifications } from "@/hooks/use-realtime-notifications";
import { lazy, Suspense, useState, useCallback } from "react";
import SplashScreen from "@/components/SplashScreen";
import PwaUpdatePrompt from "@/components/PwaUpdatePrompt";
import DashboardLayout from "./components/dashboard/DashboardLayout";
import AdminLayout from "./components/admin/AdminLayout";

// ─── Lazy-loaded pages ───
const Login = lazy(() => import("./pages/Login"));
const DashboardHome = lazy(() => import("./pages/DashboardHome"));
const WalletPage = lazy(() => import("./pages/WalletPage"));
const ProductsPage = lazy(() => import("./pages/ProductsPage"));
const OrdersPage = lazy(() => import("./pages/OrdersPage"));
const OrderDetailPage = lazy(() => import("./pages/OrderDetailPage"));
const ProductDetailPage = lazy(() => import("./pages/ProductDetailPage"));
const OrderFlowPage = lazy(() => import("./pages/OrderFlowPage"));
const PlaceOrderPage = lazy(() => import("./pages/PlaceOrderPage"));
const ProviderProfilePage = lazy(() => import("./pages/ProviderProfilePage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));
const TopUpStatusPage = lazy(() => import("./pages/TopUpStatusPage"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const TermsPage = lazy(() => import("./pages/TermsPage"));
const LandingPage = lazy(() => import("./pages/LandingPage"));
const ImeiCheckPage = lazy(() => import("./pages/ImeiCheckPage"));
const ImeiMarketplacePage = lazy(() => import("./pages/ImeiMarketplacePage"));
const ImeiOrdersPage = lazy(() => import("./pages/ImeiOrdersPage"));
const ImeiUnlockPage = lazy(() => import("./pages/services/ImeiUnlockPage"));
const VpnKeysPage = lazy(() => import("./pages/services/VpnKeysPage"));
const CapcutProPage = lazy(() => import("./pages/services/CapcutProPage"));
const InstallPage = lazy(() => import("./pages/InstallPage"));
const BlogListPage = lazy(() => import("./pages/BlogListPage"));
const BlogPostPage = lazy(() => import("./pages/BlogPostPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AdminOverview = lazy(() => import("./pages/admin/AdminOverview"));
const AdminProducts = lazy(() => import("./pages/admin/AdminProducts"));
const AdminCredentials = lazy(() => import("./pages/admin/AdminCredentials"));
const AdminTopups = lazy(() => import("./pages/admin/AdminTopups"));
const AdminResellers = lazy(() => import("./pages/admin/AdminResellers"));
const AdminOrders = lazy(() => import("./pages/admin/AdminOrders"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminProviders = lazy(() => import("./pages/admin/AdminProviders"));
const AdminBlog = lazy(() => import("./pages/admin/AdminBlog"));
const AdminProfitDashboard = lazy(() => import("./pages/admin/AdminProfitDashboard"));
const AdminMonitoring = lazy(() => import("./pages/admin/AdminMonitoring"));

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

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
    <Suspense fallback={<PageLoader />}>
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
    <ErrorBoundary>
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
                  <ErrorBoundary>
                    <AppRoutes />
                  </ErrorBoundary>
                </CurrencyProvider>
              </AuthProvider>
            </BrowserRouter>
          </LangProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
