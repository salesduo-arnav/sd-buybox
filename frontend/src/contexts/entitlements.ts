import { createContext, useContext } from 'react';
import type { EntitlementSnapshot } from '@/types/Entitlements';

export interface EntitlementsContextType {
  snapshot: EntitlementSnapshot | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
}

export const EntitlementsContext = createContext<EntitlementsContextType>({
  snapshot: null,
  isLoading: true,
  refresh: async () => {},
});

export function useEntitlements(): EntitlementsContextType {
  return useContext(EntitlementsContext);
}
