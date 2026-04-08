import { useTranslation } from "react-i18next";
import { useFadeInOnScroll } from "./useFadeInOnScroll";
import { useCountUp } from "./useCountUp";
import { cn } from "@/lib/utils";

interface StatTileProps {
  value: string;
  label: string;
}

function StatTile({ value, label }: StatTileProps) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/40 p-4">
      <div className="text-2xl font-bold text-primary md:text-3xl" aria-live="polite">
        {value}
      </div>
      <div className="mt-1 text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function MiniChart() {
  // Decorative downward trend, fixed coordinates. Uses theme variables only.
  // ViewBox is 400x140; the chart spans the full available width.
  const points = "0,30 40,45 80,38 120,60 160,55 200,75 240,72 280,95 320,90 360,115 400,110";
  return (
    <svg
      viewBox="0 0 400 140"
      className="mt-6 h-32 w-full md:h-36"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="landing-chart-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.25" />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* dotted grid */}
      {[28, 56, 84, 112].map((y) => (
        <line
          key={y}
          x1="0"
          x2="400"
          y1={y}
          y2={y}
          stroke="hsl(var(--border))"
          strokeWidth="1"
          strokeDasharray="2 6"
        />
      ))}
      {/* area fill */}
      <polygon points={`0,140 ${points} 400,140`} fill="url(#landing-chart-fill)" />
      {/* line */}
      <polyline
        points={points}
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function DashboardPreview() {
  const { t } = useTranslation();
  const { ref, isVisible } = useFadeInOnScroll<HTMLDivElement>();

  const salesMissed = useCountUp(8565, 1200, isVisible);
  const productsAffected = useCountUp(6, 800, isVisible);
  const visibility = useCountUp(48, 1000, isVisible);
  const lastUpdated = useCountUp(2, 600, isVisible);

  const fmtCurrency = `$${Math.round(salesMissed).toLocaleString("en-US")}`;
  const fmtProducts = String(Math.round(productsAffected));
  const fmtVisibility = `${Math.round(visibility)}%`;
  const fmtUpdated = `${Math.round(lastUpdated)}h`;

  return (
    <div
      ref={ref}
      className={cn(
        "mx-auto -mt-8 max-w-5xl px-6 transition-all duration-700 ease-out md:-mt-12",
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
      )}
    >
      <div
        className="rounded-3xl border border-border/60 bg-card p-6 shadow-2xl shadow-primary/10 transition-transform duration-300 hover:scale-[1.01] md:p-8"
        data-testid="landing-dashboard-preview"
      >
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatTile value={fmtCurrency} label={t("landing.preview.salesMissed")} />
          <StatTile value={fmtProducts} label={t("landing.preview.productsAffected")} />
          <StatTile value={fmtVisibility} label={t("landing.preview.visibility")} />
          <StatTile value={fmtUpdated} label={t("landing.preview.lastUpdated")} />
        </div>
        <MiniChart />
      </div>
    </div>
  );
}
