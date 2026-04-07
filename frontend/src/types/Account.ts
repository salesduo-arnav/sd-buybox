export interface IntegrationAccount {
  id: string;
  organization_id: string;
  platform: "amazon" | "walmart";
  account_type: "sc" | "vc";
  marketplace_region: string;
  marketplace_id: string | null;
  account_name: string;
  seller_id: string | null;
  selling_partner_id: string | null;
  vendor_code: string | null;
  status: "connected" | "disconnected" | "error" | "connecting";
}
