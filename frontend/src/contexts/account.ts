import { createContext, useContext } from "react";
import type { IntegrationAccount } from "@/types/Account";

// Account context + hook live in their own file (not AccountContext.tsx) so
// that the .tsx provider file only exports a component. Keeps React Fast
// Refresh working in dev.

export interface AccountContextType {
  accounts: IntegrationAccount[];
  activeAccount: IntegrationAccount | null;
  isLoading: boolean;
  switchAccount: (accountId: string) => void;
  refreshAccounts: () => Promise<void>;
}

export const AccountContext = createContext<AccountContextType>({
  accounts: [],
  activeAccount: null,
  isLoading: true,
  switchAccount: () => {},
  refreshAccounts: async () => {},
});

export function useAccount(): AccountContextType {
  return useContext(AccountContext);
}
