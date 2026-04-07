import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import api from "@/lib/Api";

interface Organization {
  id: string;
  name: string;
  slug?: string;
}

interface Membership {
  organization: Organization;
  role: { id: number; name: string; slug?: string };
}

interface User {
  id: string;
  email: string;
  full_name: string;
  organization_id: string;
  organization_name: string;
  role: string;
  memberships?: Membership[];
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  activeOrganization: Organization | null;
  organizations: Organization[];
  switchOrganization: (orgId: string) => void;
  refreshUser: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  activeOrganization: null,
  organizations: [],
  switchOrganization: () => {},
  refreshUser: async () => {},
  logout: () => {},
});

function resolveActiveOrg(memberships: Membership[]): Organization | null {
  if (!memberships || memberships.length === 0) return null;
  const savedOrgId = localStorage.getItem("activeOrganizationId");
  if (savedOrgId) {
    const match = memberships.find((m) => m.organization.id === savedOrgId);
    if (match) return match.organization;
  }
  return memberships[0].organization;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeOrganization, setActiveOrganization] = useState<Organization | null>(null);

  const organizations = user?.memberships?.map((m) => m.organization) || [];

  const refreshUser = useCallback(async () => {
    try {
      const { data } = await api.get("/auth/me");
      setUser(data);
      const memberships: Membership[] = data.memberships || [];
      const org = resolveActiveOrg(memberships);
      setActiveOrganization(org);
      if (org) {
        localStorage.setItem("activeOrganizationId", org.id);
      }
    } catch {
      setUser(null);
      setActiveOrganization(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const switchOrganization = useCallback(
    (orgId: string) => {
      const memberships = user?.memberships || [];
      const match = memberships.find((m) => m.organization.id === orgId);
      if (match) {
        setActiveOrganization(match.organization);
        localStorage.setItem("activeOrganizationId", orgId);
        // Clear active account — will be re-resolved by AccountContext
        localStorage.removeItem("activeIntegrationAccountId");
      }
    },
    [user],
  );

  const logout = useCallback(async () => {
    setUser(null);
    setActiveOrganization(null);
    localStorage.removeItem("activeIntegrationAccountId");
    localStorage.removeItem("activeOrganizationId");
    try {
      await api.post("/auth/logout");
    } catch {
      // Best effort
    }
    const corePlatformUrl =
      import.meta.env.VITE_CORE_PLATFORM_URL || "http://localhost:3000";
    window.location.href = `${corePlatformUrl}/login?redirect=${encodeURIComponent(window.location.origin)}&app=buybox`;
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

export function useAuth() {
  return useContext(AuthContext);
}
