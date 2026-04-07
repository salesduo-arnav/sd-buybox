/** Buy Box loss reasons surfaced by the backend buybox checker. */
export const LOSS_REASONS = [
  "cheaper_3p",
  "lower_external",
  "lower_own_vc",
  "price_suppressed",
  "out_of_stock",
  "unknown",
] as const;

export type LossReason = (typeof LOSS_REASONS)[number];

export const LOSS_REASON_LABELS: Record<LossReason, string> = {
  cheaper_3p: "Cheaper 3P Seller",
  lower_external: "Lower External Price",
  lower_own_vc: "Own Vendor Central",
  price_suppressed: "Price Suppressed",
  out_of_stock: "Out of Stock",
  unknown: "Unknown",
};

export const ALERT_SEVERITIES = ["info", "warning", "critical"] as const;
export type AlertSeverity = (typeof ALERT_SEVERITIES)[number];
