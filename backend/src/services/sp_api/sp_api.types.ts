export interface ParsedOffer {
    sellerId: string;
    isBuyBoxWinner: boolean;
    isFeaturedMerchant: boolean;
    isFulfilledByAmazon: boolean;
    listingPrice: number | null;
    shipping: number | null;
    currency: string | null;
    condition: string | null;
}

export interface OffersResult {
    asin: string;
    marketplaceId: string;
    offers: ParsedOffer[];
}

export interface ListingRow {
    asin: string;
    sku: string | null;
    title: string | null;
    price: number | null;
    quantity: number | null;
}

export type ReportProcessingStatus = 'DONE' | 'CANCELLED' | 'FATAL' | string;
