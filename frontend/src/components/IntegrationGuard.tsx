import { useEffect, useRef, useState } from "react";
import { Outlet, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import axios from "axios";
import api from "@/lib/Api";
import { useAuth } from "@/contexts/auth";
import { LS } from "@/lib/localStorageKeys";

const CORE_PLATFORM_URL =
  import.meta.env.VITE_CORE_PLATFORM_URL || "http://app.lvh.me";
const APP_SLUG = "buybox";

/**
 * IntegrationGuard
 *
 * Sits between ProtectedRoute and the app layout in the route tree. On every
 * org change (including the initial load and sidebar org-switcher clicks), it
 * checks whether the active org has all integrations the buybox tool requires.
 *
 * - If requirements are met: renders child routes via <Outlet />.
 * - If not: redirects to core-platform's /integration-onboarding page.
 * - On return from onboarding with ?integration_success=true: fast-paths through.
 */
export default function IntegrationGuard() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { activeOrganization, isLoading, switchOrganization } = useAuth();
  const [isChecking, setIsChecking] = useState(true);
  const [isEnabled, setIsEnabled] = useState(false);

  // Prevent duplicate org sync from URL
  const orgIdSyncedRef = useRef(false);

  // Sync orgId from URL on mount (used when returning from core-platform)
  useEffect(() => {
    if (orgIdSyncedRef.current) return;
    const urlOrgId = searchParams.get("orgId");
    if (urlOrgId) {
      orgIdSyncedRef.current = true;
      localStorage.setItem(LS.orgId, urlOrgId);
      switchOrganization(urlOrgId);
      setSearchParams(
        (params) => {
          params.delete("orgId");
          return params;
        },
        { replace: true }
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Check integrations after auth + org resolution
  useEffect(() => {
    if (isLoading) return;

    const orgId = activeOrganization?.id;

    // No org selected — redirect to core-platform to choose one
    if (!orgId) {
      const returnUrl = `${window.location.origin}${window.location.pathname}`;
      window.location.href = `${CORE_PLATFORM_URL}/choose-organisation?app=${APP_SLUG}&redirect=${encodeURIComponent(returnUrl)}`;
      return;
    }

    setIsChecking(true);
    setIsEnabled(false);

    const abortController = new AbortController();
    let didAbort = false;

    const checkIntegration = async () => {
      // Fast-path: returning from successful integration onboarding
      if (searchParams.get("integration_success") === "true") {
        localStorage.setItem(LS.integrationEnabled, "true");
        setIsEnabled(true);
        setIsChecking(false);
        setSearchParams(
          (params) => {
            params.delete("integration_success");
            return params;
          },
          { replace: true }
        );
        return;
      }

      try {
        // Fetch tool requirements and connected accounts in parallel.
        // api interceptor unwraps the {status, data} envelope, so
        // response.data is the inner payload directly.
        const [toolRes, accountsRes] = await Promise.all([
          api
            .get(`/tools/by-slug/${APP_SLUG}`, {
              signal: abortController.signal,
            })
            .catch((err) => {
              if (axios.isCancel(err)) throw err;
              return null; // tool not found — treat as no requirements
            }),
          api.get("/integrations/accounts", {
            signal: abortController.signal,
          }),
        ]);

        if (didAbort) return;

        const requiredIntegrations: string[] =
          toolRes?.data?.required_integrations || [];

        // No integrations required — allow through
        if (requiredIntegrations.length === 0) {
          localStorage.setItem(LS.integrationEnabled, "true");
          setIsEnabled(true);
          setIsChecking(false);
          return;
        }

        const accounts = (accountsRes.data || []) as {
          status: string;
          integration_type: string;
        }[];
        const connectedTypes = new Set(
          accounts
            .filter((a) => a.status === "connected")
            .map((a) => a.integration_type)
        );

        // sp_api is satisfied by either sp_api_sc OR sp_api_vc
        const hasSpApi =
          connectedTypes.has("sp_api_sc") || connectedTypes.has("sp_api_vc");
        const allMet = requiredIntegrations.every((req) => {
          if (req === "sp_api") return hasSpApi;
          return connectedTypes.has(req);
        });

        if (allMet) {
          localStorage.setItem(LS.integrationEnabled, "true");
          setIsEnabled(true);
          setIsChecking(false);
          return;
        }
      } catch (error) {
        if (axios.isCancel(error)) return;
        console.error("Failed to check integrations:", error);
        // Fall through to redirect on unexpected errors
      }

      if (didAbort) return;

      // Requirements not met — redirect to integration onboarding
      localStorage.removeItem(LS.integrationEnabled);
      const returnUrl = `${window.location.origin}${window.location.pathname}`;
      window.location.href = `${CORE_PLATFORM_URL}/integration-onboarding?app=${APP_SLUG}&redirect=${encodeURIComponent(returnUrl)}&orgId=${orgId}`;
    };

    checkIntegration();

    return () => {
      didAbort = true;
      abortController.abort();
    };
    // Re-run whenever the active org changes or auth finishes loading
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOrganization?.id, isLoading]);

  if (isChecking || !isEnabled) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">
          Checking integrations...
        </span>
      </div>
    );
  }

  return <Outlet />;
}
