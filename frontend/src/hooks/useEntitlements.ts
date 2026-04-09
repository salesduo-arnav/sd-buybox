import { useEntitlements as useEntitlementsContext } from '@/contexts/entitlements';
import type { FeatureKey, LimitKey, LimitView } from '@/types/Entitlements';

const EMPTY_LIMIT: LimitView = { used: 0, limit: 0, atCap: true };

// Boolean feature check. Returns false until the snapshot loads.
export function useFeature(feature: FeatureKey): boolean {
  const { snapshot } = useEntitlementsContext();
  return snapshot?.features[feature] ?? false;
}

// Limit view for a derived limit. Returns a safe-default empty view
// until the snapshot loads.
export function useLimit(key: LimitKey): LimitView {
  const { snapshot } = useEntitlementsContext();
  return snapshot?.limits[key] ?? EMPTY_LIMIT;
}

// True when the org has no active entitlements at all — used by
// ProtectedRoute to render the LockedShell paywall.
export function useIsLocked(): boolean {
  const { snapshot, isLoading } = useEntitlementsContext();
  if (isLoading) return false;
  return snapshot === null || !snapshot.has_any_entitlement;
}
