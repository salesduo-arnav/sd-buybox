import React, { useState, useEffect, useCallback } from "react";
import api from "@/lib/Api";
import { LS } from "@/lib/localStorageKeys";
import { redirectToLogoutLanding } from "@/lib/authRedirect";
import type { AuthUser, Membership, Organization } from "@/types/Auth";
import { AuthContext } from "./auth";

// AuthContext
//
// Owns the "who am I?" state for buybox. All identity flows through here:
//   - On mount, calls `/api/auth/me` to fetch the current session.
//   - Resolves an active organization (from localStorage if valid, else first membership).
//   - Exposes org switching, logout, and a refresh hook.
//
// Buybox owns ZERO auth state of its own. Login happens entirely on
// sd-core-platform — unauthenticated users are redirected there by
// ProtectedRoute / the Api interceptor.

// Pick the org to make active after a fresh /auth/me load:
//   1. If localStorage has a saved org id AND the user still has that membership, use it.
//   2. Otherwise fall back to the first membership.
//   3. If the user has no memberships, return null (new user onboarding case).
function resolveActiveOrg(memberships: Membership[]): Organization | null {
  if (!memberships || memberships.length === 0) return null;
  const savedOrgId = localStorage.getItem(LS.orgId);
  if (savedOrgId) {
    const matchedMembership = memberships.find((m) => m.organization.id === savedOrgId);
    if (matchedMembership) return matchedMembership.organization;
  }
  return memberships[0].organization;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeOrganization, setActiveOrganization] = useState<Organization | null>(null);

  const organizations = user?.memberships?.map((m) => m.organization) ?? [];

  const refreshUser = useCallback(async () => {
    try {
      const { data } = await api.get<AuthUser>("/auth/me");
      setUser(data);
      const activeOrg = resolveActiveOrg(data.memberships ?? []);
      setActiveOrganization(activeOrg);
      if (activeOrg) {
        localStorage.setItem(LS.orgId, activeOrg.id);
      } else {
        localStorage.removeItem(LS.orgId);
      }
    } catch {
      // 401 is handled by the Api interceptor (except for /auth/me itself,
      // which is whitelisted). Any error here means "not logged in" — just
      // clear local state; ProtectedRoute will trigger the login redirect.
      setUser(null);
      setActiveOrganization(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const switchOrganization = useCallback(
    (orgId: string) => {
      const matchedMembership = user?.memberships?.find((m) => m.organization.id === orgId);
      if (!matchedMembership) return;
      setActiveOrganization(matchedMembership.organization);
      localStorage.setItem(LS.orgId, orgId);
      // Clear active account — AccountContext will re-resolve it for the new org.
      localStorage.removeItem(LS.accountId);
    },
    [user]
  );

  const logout = useCallback(async () => {
    setUser(null);
    setActiveOrganization(null);
    localStorage.removeItem(LS.orgId);
    localStorage.removeItem(LS.accountId);
    try {
      await api.post("/auth/logout");
    } catch {
      // Best effort — logout must not block on upstream failures.
    }
    redirectToLogoutLanding();
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        activeOrganization,
        organizations,
        switchOrganization,
        refreshUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
