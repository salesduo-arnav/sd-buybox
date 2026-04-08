import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { IntegrationAccount } from "@/types/Account";
import { IntegrationsService } from "@/services/IntegrationsService";
import { LS } from "@/lib/localStorageKeys";
import { useAuth } from "./AuthContext";

/**
 * AccountContext
 *
 * Tracks the user's connected integration accounts (as known by sd-core-platform)
 * and the "active" account for scoping buybox feature pages. Derived from
 * AuthContext — we refetch whenever the active org changes.
 */

interface AccountContextType {
  accounts: IntegrationAccount[];
  activeAccount: IntegrationAccount | null;
  isLoading: boolean;
  switchAccount: (accountId: string) => void;
  refreshAccounts: () => Promise<void>;
}

const AccountContext = createContext<AccountContextType>({
  accounts: [],
  activeAccount: null,
  isLoading: true,
  switchAccount: () => {},
  refreshAccounts: async () => {},
});

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, activeOrganization } = useAuth();
  const [accounts, setAccounts] = useState<IntegrationAccount[]>([]);
  const [activeAccount, setActiveAccount] = useState<IntegrationAccount | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshAccounts = useCallback(async () => {
    try {
      const { data } = await IntegrationsService.listAccounts();
      setAccounts(data);

      const savedId = localStorage.getItem(LS.accountId);
      const match = data.find((a) => a.id === savedId);

      if (match) {
        setActiveAccount(match);
      } else if (data.length > 0) {
        setActiveAccount(data[0]);
        localStorage.setItem(LS.accountId, data[0].id);
      } else {
        setActiveAccount(null);
        localStorage.removeItem(LS.accountId);
      }
    } catch {
      setAccounts([]);
      setActiveAccount(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const switchAccount = useCallback(
    (accountId: string) => {
      const account = accounts.find((a) => a.id === accountId);
      if (!account) return;
      setActiveAccount(account);
      localStorage.setItem(LS.accountId, accountId);
    },
    [accounts]
  );

  // Refetch when authentication or active organization changes.
  useEffect(() => {
    if (isAuthenticated && activeOrganization) {
      refreshAccounts();
    } else {
      setAccounts([]);
      setActiveAccount(null);
      setIsLoading(false);
    }
  }, [isAuthenticated, activeOrganization?.id, refreshAccounts]);

  return (
    <AccountContext.Provider
      value={{ accounts, activeAccount, isLoading, switchAccount, refreshAccounts }}
    >
      {children}
    </AccountContext.Provider>
  );
}

export function useAccount() {
  return useContext(AccountContext);
}
