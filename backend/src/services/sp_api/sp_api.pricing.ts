import { spApiRequest } from './sp_api.client';
import type { OffersResult, ParsedOffer } from './sp_api.types';

interface AmazonMoney {
    Amount?: number;
    CurrencyCode?: string;
}

interface AmazonOffer {
    SellerId?: string;
    IsBuyBoxWinner?: boolean;
    IsFeaturedMerchant?: boolean;
    IsFulfilledByAmazon?: boolean;
    SubCondition?: string;
    ListingPrice?: AmazonMoney;
    Shipping?: AmazonMoney;
}

interface GetItemOffersResponse {
    payload?: {
        ASIN?: string;
        marketplaceID?: string;
        Offers?: AmazonOffer[];
    };
    errors?: Array<{ code?: string; message?: string }>;
}

function parseOffer(raw: AmazonOffer): ParsedOffer {
    return {
        sellerId: raw.SellerId ?? '',
        isBuyBoxWinner: Boolean(raw.IsBuyBoxWinner),
        isFeaturedMerchant: Boolean(raw.IsFeaturedMerchant),
        isFulfilledByAmazon: Boolean(raw.IsFulfilledByAmazon),
        listingPrice: raw.ListingPrice?.Amount ?? null,
        shipping: raw.Shipping?.Amount ?? null,
        currency: raw.ListingPrice?.CurrencyCode ?? null,
        condition: raw.SubCondition ?? null,
    };
}

// Amazon returns 200 with an `errors` array for ASIN-level issues
// (e.g. "no offers"). We swallow those — an empty Offers list is
// treated as "buybox suppressed" downstream by classifyBuybox.
export async function getItemOffers(params: {
    accountId: string;
    asin: string;
    marketplaceId: string;
}): Promise<OffersResult> {
    const response = await spApiRequest<GetItemOffersResponse>({
        accountId: params.accountId,
        method: 'GET',
        path: `/products/pricing/v0/items/${encodeURIComponent(params.asin)}/offers`,
        query: {
            MarketplaceId: params.marketplaceId,
            ItemCondition: 'New',
            CustomerType: 'Consumer',
        },
    });

    const offers = (response.payload?.Offers ?? []).map(parseOffer);
    return {
        asin: response.payload?.ASIN ?? params.asin,
        marketplaceId: response.payload?.marketplaceID ?? params.marketplaceId,
        offers,
    };
}
