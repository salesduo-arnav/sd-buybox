/**
 * Integration account shape as returned by sd-core-platform's
 * `/internal/integrations/accounts?org_id=...` endpoint, proxied through
 * buybox's `/api/integrations/accounts`.
 *
 * Fields are typed loosely on purpose — core-platform may add columns,
 * and we only care about the ones the buybox UI actually reads.
 */
export interface IntegrationAccount {
  id: string;
  organization_id: string;
  account_name: string;
  marketplace?: string;
  region?: string;
  integration_type: string;
  status: string;
  connected_at?: string;
}
