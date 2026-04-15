import {
    AMAZON_RETAIL_SELLER_ID,
    LOSS_REASONS,
    WINNER_TYPES,
    type LossReason,
    type WinnerType,
} from '../config/constants';
import type { ParsedOffer } from '../services/sp_api/sp_api.types';

const totalPrice = (offer: ParsedOffer): number =>
    (offer.listingPrice ?? 0) + (offer.shipping ?? 0);

// Amazon occasionally flags multiple offers as IsBuyBoxWinner during
// price ties; tie-break by cheapest landed price.
export function findBuyBoxWinner(offers: ParsedOffer[]): ParsedOffer | undefined {
    const winners = offers.filter((offer) => offer.isBuyBoxWinner);
    if (winners.length === 0) return undefined;
    if (winners.length === 1) return winners[0];
    return winners.reduce((best, current) =>
        totalPrice(current) < totalPrice(best) ? current : best
    );
}

export function findOwnOffer(offers: ParsedOffer[], sellerId: string | null): ParsedOffer | undefined {
    if (!sellerId) return undefined;
    return offers.find((offer) => offer.sellerId === sellerId);
}

export function findLowestThirdPartyOffer(
    offers: ParsedOffer[],
    ownSellerId: string | null
): ParsedOffer | undefined {
    const thirdParty = offers.filter(
        (offer) => offer.sellerId !== ownSellerId && offer.sellerId !== AMAZON_RETAIL_SELLER_ID
    );
    if (thirdParty.length === 0) return undefined;
    return thirdParty.reduce((best, current) =>
        totalPrice(current) < totalPrice(best) ? current : best
    );
}

export interface BuyBoxClassification {
    hasBuybox: boolean;
    isSuppressed: boolean;
    winnerType: WinnerType;
    lossReason: LossReason | null;
    winner: ParsedOffer | undefined;
}

export function classifyBuybox(params: {
    offers: ParsedOffer[];
    ownSellerId: string | null;
}): BuyBoxClassification {
    const { offers, ownSellerId } = params;
    const winner = findBuyBoxWinner(offers);

    // No winner = Amazon suppressed the buybox (usually a pricing violation).
    if (!winner) {
        return {
            hasBuybox: false,
            isSuppressed: true,
            winnerType: WINNER_TYPES.SUPPRESSED,
            lossReason: LOSS_REASONS.PRICE_SUPPRESSED,
            winner: undefined,
        };
    }

    if (ownSellerId && winner.sellerId === ownSellerId) {
        return {
            hasBuybox: true,
            isSuppressed: false,
            winnerType: WINNER_TYPES.OWN,
            lossReason: null,
            winner,
        };
    }

    // Lost to Amazon retail — usually not actionable for 3P sellers.
    if (winner.sellerId === AMAZON_RETAIL_SELLER_ID) {
        return {
            hasBuybox: false,
            isSuppressed: false,
            winnerType: WINNER_TYPES.AMAZON_VC,
            lossReason: LOSS_REASONS.LOWER_OWN_VC,
            winner,
        };
    }

    return {
        hasBuybox: false,
        isSuppressed: false,
        winnerType: WINNER_TYPES.THIRD_PARTY,
        lossReason: LOSS_REASONS.CHEAPER_3P,
        winner,
    };
}

// Falls back to listing price × 1 unit when we lack velocity data, so
// alerts still sort usefully by $-at-risk on first observation.
export function estimateMissedSales(params: {
    hasBuybox: boolean;
    estimatedDailyUnits: number | null;
    averageSellingPrice: number | null;
    buyboxPrice: number | null;
}): number {
    if (params.hasBuybox) return 0;
    const units = params.estimatedDailyUnits ?? 1;
    const price = params.averageSellingPrice ?? params.buyboxPrice ?? 0;
    const missed = units * price;
    return Number.isFinite(missed) ? Math.max(missed, 0) : 0;
}
