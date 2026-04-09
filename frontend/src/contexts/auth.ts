import { createContext, useContext } from "react";
import type { AuthUser, Organization } from "@/types/Auth";

// Auth context + hook live in their own file (not AuthContext.tsx) so that
// the .tsx provider file only exports a component. This keeps React Fast
// Refresh working in dev.

export interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  activeOrganization: Organization | null;
  organizations: Organization[];
  switchOrganization: (orgId: string) => void;
  refreshUser: () => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  activeOrganization: null,
  organizations: [],
  switchOrganization: () => {},
  refreshUser: async () => {},
  logout: async () => {},
});

export function useAuth(): AuthContextType {
  return useContext(AuthContext);
}
