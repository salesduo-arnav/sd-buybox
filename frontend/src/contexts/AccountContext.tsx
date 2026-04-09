import React, { useState, useEffect, useCallback } from "react";
import { IntegrationAccount } from "@/types/Account";
import { IntegrationsService } from "@/services/IntegrationsService";
import { LS } from "@/lib/localStorageKeys";
import { useAuth } from "./auth";
import { AccountContext } from "./account";

// AccountContext
//
// Tracks the user's connected integration accounts (as known by sd-core-platform)
// and the "active" account for scoping buybox feature pages. Derived from
// AuthContext — we refetch whenever the active org changes.

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, activeOrganization } = useAuth();
  const activeOrganizationId = activeOrganization?.id;

  const [accounts, setAccounts] = useState<IntegrationAccount[]>([]);
  const [activeAccount, setActiveAccount] = useState<IntegrationAccount | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshAccounts = useCallback(async () => {
    try {
      const { data } = await IntegrationsService.listAccounts();
      setAccounts(data);

      const savedAccountId = localStorage.getItem(LS.accountId);
      const matchedAccount = data.find((account) => account.id === savedAccountId);

      if (matchedAccount) {
        setActiveAccount(matchedAccount);
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
      const matchedAccount = accounts.find((account) => account.id === accountId);
      if (!matchedAccount) return;
      setActiveAccount(matchedAccount);
      localStorage.setItem(LS.accountId, accountId);
    },
    [accounts]
  );

  // Refetch when authentication or active organization changes. We depend on
  // `activeOrganizationId` (a primitive) rather than the whole object so the
  // effect only fires when the id actually changes.
  useEffect(() => {
    if (isAuthenticated && activeOrganizationId) {
      refreshAccounts();
    } else {
      setAccounts([]);
      setActiveAccount(null);
      setIsLoading(false);
    }
  }, [isAuthenticated, activeOrganizationId, refreshAccounts]);

  return (
    <AccountContext.Provider
      value={{ accounts, activeAccount, isLoading, switchAccount, refreshAccounts }}
    >
      {children}
    </AccountContext.Provider>
  );
}
