import { useEffect } from "react";
import { Toaster as Sonner } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Outlet, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AuthProvider } from "@/contexts/AuthContext";
import { AccountProvider } from "@/contexts/AccountContext";
import { EntitlementsProvider } from "@/contexts/EntitlementsContext";
import { useAuth } from "@/contexts/auth";
import { useEntitlements } from "@/contexts/entitlements";
import { useIsLocked } from "@/hooks/useEntitlements";
import { redirectToLogin } from "@/lib/authRedirect";
import Layout from "@/components/layout/Layout";
import Landing from "@/pages/Landing";
import IntegrationGuard from "@/components/IntegrationGuard";
import AdminRoute from "@/components/AdminRoute";
import AdminConfigs from "@/pages/admin/AdminConfigs";
import { LockedShell } from "@/components/entitlements";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  const { isLoading: entitlementsLoading } = useEntitlements();
  const isLocked = useIsLocked();
  const location = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      redirectToLogin(window.location.origin + location.pathname + location.search);
    }
  }, [isLoading, isAuthenticated, location.pathname, location.search]);

  if (isLoading || (isAuthenticated && entitlementsLoading)) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">Redirecting to login...</p>
      </div>
    );
  }

  if (isLocked) return <LockedShell />;

  return <Outlet />;
}

// Placeholder page used by all four foundation routes. Real Buy Box
// feature pages (Overview KPIs, Products table, Alerts feed, Settings
// form) will replace these as they are built.
function PlaceholderPage({ titleKey, descriptionKey }: { titleKey: string; descriptionKey: string }) {
  const { t } = useTranslation();
  return (
    <div>
      <h1 className="text-3xl font-bold text-foreground">{t(titleKey)}</h1>
      <p className="mt-2 text-muted-foreground">{t(descriptionKey)}</p>
      <div className="mt-8 rounded-lg border border-dashed border-border p-12 text-center">
        <p className="text-sm text-muted-foreground">Coming soon</p>
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <div className="flex h-full items-center justify-center">
      <p className="text-muted-foreground">Page not found</p>
    </div>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<IntegrationGuard />}>
          <Route element={<Layout><Outlet /></Layout>}>
            <Route
              path="/overview"
              element={
                <PlaceholderPage
                  titleKey="buybox.overview.title"
                  descriptionKey="buybox.overview.description"
                />
              }
            />
            <Route
              path="/products"
              element={
                <PlaceholderPage
                  titleKey="buybox.products.title"
                  descriptionKey="buybox.products.description"
                />
              }
            />
            <Route
              path="/alerts"
              element={
                <PlaceholderPage
                  titleKey="buybox.alerts.title"
                  descriptionKey="buybox.alerts.description"
                />
              }
            />
            <Route
              path="/settings"
              element={
                <PlaceholderPage
                  titleKey="buybox.settings.title"
                  descriptionKey="buybox.settings.description"
                />
              }
            />
          </Route>
        </Route>
        {/* Admin routes — outside IntegrationGuard (admins don't need an integration) */}
        <Route element={<AdminRoute />}>
          <Route element={<Layout><Outlet /></Layout>}>
            <Route path="/admin/configs" element={<AdminConfigs />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <EntitlementsProvider>
        <AccountProvider>
          <TooltipProvider>
            <Sonner />
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </TooltipProvider>
        </AccountProvider>
      </EntitlementsProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
