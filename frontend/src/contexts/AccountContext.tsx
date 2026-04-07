import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { IntegrationAccount } from "@/types/Account";
import { SettingsService } from "@/services/SettingsService";
import { useAuth } from "./AuthContext";

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
      const { data } = await SettingsService.listAccounts();
      setAccounts(data);

      const savedId = localStorage.getItem("activeIntegrationAccountId");
      const match = data.find((a: IntegrationAccount) => a.id === savedId);

      if (match) {
        setActiveAccount(match);
      } else if (data.length > 0) {
        setActiveAccount(data[0]);
        localStorage.setItem("activeIntegrationAccountId", data[0].id);
      } else {
        setActiveAccount(null);
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
      if (account) {
        setActiveAccount(account);
        localStorage.setItem("activeIntegrationAccountId", accountId);
      }
    },
    [accounts]
  );

  // Re-fetch accounts when authenticated or when org changes
  useEffect(() => {
    if (isAuthenticated && activeOrganization) {
      refreshAccounts();
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
