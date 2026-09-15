import { Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { PageLoader } from "@/components/PageLoader";
import { lazyWithRetry } from "@/lib/lazy-with-retry";

const Index = lazyWithRetry(() => import("./pages/Index"));
const Auth = lazyWithRetry(() => import("./pages/Auth"));
const Dashboard = lazyWithRetry(() => import("./pages/Dashboard"));
const Subscription = lazyWithRetry(() => import("./pages/Subscription"));
const SubscriptionHistory = lazyWithRetry(() => import("./pages/SubscriptionHistory"));
const Profile = lazyWithRetry(() => import("./pages/Profile"));
const AdminDataSources = lazyWithRetry(() => import("./pages/AdminDataSources"));
const AdminPlans = lazyWithRetry(() => import("./pages/AdminPlans"));
const AdminPublicSources = lazyWithRetry(() => import("./pages/AdminPublicSources"));
const AdminUsers = lazyWithRetry(() => import("./pages/AdminUsers"));
const TermsOfUse = lazyWithRetry(() => import("./pages/legal/TermsOfUse"));
const PrivacyPolicy = lazyWithRetry(() => import("./pages/legal/PrivacyPolicy"));
const CookiePolicy = lazyWithRetry(() => import("./pages/legal/CookiePolicy"));
const RefundPolicy = lazyWithRetry(() => import("./pages/legal/RefundPolicy"));
const DataLicense = lazyWithRetry(() => import("./pages/legal/DataLicense"));
const NotFound = lazyWithRetry(() => import("./pages/NotFound"));


const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/subscription" element={<Subscription />} />
              <Route path="/subscription/history" element={<SubscriptionHistory />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/admin/data-sources" element={<AdminDataSources />} />
              <Route path="/admin/plans" element={<AdminPlans />} />
              <Route path="/admin/public-sources" element={<AdminPublicSources />} />
              <Route path="/admin/users" element={<AdminUsers />} />
              <Route path="/termos-de-uso" element={<TermsOfUse />} />
              <Route path="/politica-de-privacidade" element={<PrivacyPolicy />} />
              <Route path="/politica-de-cookies" element={<CookiePolicy />} />
              <Route path="/politica-de-reembolso" element={<RefundPolicy />} />
              <Route path="/licenca-de-dados" element={<DataLicense />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
