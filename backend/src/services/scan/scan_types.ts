import type { ScanTrigger } from '../../config/constants';

export interface AccountScanPayload {
    scanId: string;
    accountId: string;
    organizationId: string;
    marketplace: string;
    triggeredBy: ScanTrigger;
}

export interface ProductCheckPayload {
    scanId: string;
    productId: string;
    accountId: string;
    organizationId: string;
    asin: string;
    marketplaceId: string;
}

export interface ScanCompletionPayload {
    scanId: string;
}
