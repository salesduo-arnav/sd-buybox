import React, { useState, useEffect, useCallback } from 'react';
import { EntitlementsService } from '@/services/EntitlementsService';
import type { EntitlementSnapshot } from '@/types/Entitlements';
import { useAuth } from './auth';
import { EntitlementsContext } from './entitlements';

export function EntitlementsProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, activeOrganization } = useAuth();
  const orgId = activeOrganization?.id;

  const [snapshot, setSnapshot] = useState<EntitlementSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSnapshot = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data } = await EntitlementsService.getMe();
      setSnapshot(data);
    } catch {
      setSnapshot(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    try {
      await EntitlementsService.refresh();
    } catch {
      // Non-fatal.
    }
    await fetchSnapshot();
  }, [fetchSnapshot]);

  useEffect(() => {
    if (isAuthenticated && orgId) {
      fetchSnapshot();
    } else {
      setSnapshot(null);
      setIsLoading(false);
    }
  }, [isAuthenticated, orgId, fetchSnapshot]);

  return (
    <EntitlementsContext.Provider value={{ snapshot, isLoading, refresh }}>
      {children}
    </EntitlementsContext.Provider>
  );
}
