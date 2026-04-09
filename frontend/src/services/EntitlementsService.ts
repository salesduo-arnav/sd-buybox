import api from '@/lib/Api';
import type { EntitlementSnapshot } from '@/types/Entitlements';

export const EntitlementsService = {
  getMe: () => api.get<EntitlementSnapshot>('/entitlements/me'),
  refresh: () => api.post<{ invalidated: boolean }>('/entitlements/refresh'),
};
