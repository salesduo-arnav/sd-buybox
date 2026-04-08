import api from "@/lib/Api";
import { IntegrationAccount } from "@/types/Account";

/**
 * IntegrationsService
 *
 * Thin wrapper over buybox's `/api/integrations/*` endpoints, which in turn
 * proxy sd-core-platform's integration endpoints for the active organization.
 *
 * Buybox does NOT own integration accounts — core-platform is authoritative.
 * Anything that needs a list of accounts, credentials, or similar should go
 * through this service rather than touching the platform directly.
 */
export const IntegrationsService = {
  /** List connected integration accounts for the active organization. */
  listAccounts: () => api.get<IntegrationAccount[]>("/integrations/accounts"),
};
