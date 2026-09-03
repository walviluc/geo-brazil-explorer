import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { PageLoader } from "@/components/PageLoader";

const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Subscription = lazy(() => import("./pages/Subscription"));
const SubscriptionHistory = lazy(() => import("./pages/SubscriptionHistory"));
const Profile = lazy(() => import("./pages/Profile"));
const AdminDataSources = lazy(() => import("./pages/AdminDataSources"));
const AdminPlans = lazy(() => import("./pages/AdminPlans"));
const AdminPublicSources = lazy(() => import("./pages/AdminPublicSources"));
const AdminUsers = lazy(() => import("./pages/AdminUsers"));
const TermsOfUse = lazy(() => import("./pages/legal/TermsOfUse"));
const PrivacyPolicy = lazy(() => import("./pages/legal/PrivacyPolicy"));
const CookiePolicy = lazy(() => import("./pages/legal/CookiePolicy"));
const RefundPolicy = lazy(() => import("./pages/legal/RefundPolicy"));
const DataLicense = lazy(() => import("./pages/legal/DataLicense"));
const NotFound = lazy(() => import("./pages/NotFound"));

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
