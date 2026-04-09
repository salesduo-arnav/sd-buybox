import { Sparkles, Eye, BarChart3, Bell, Zap, Check } from 'lucide-react';
import { UpgradeButton } from './UpgradeButton';

const HIGHLIGHTS = [
  { icon: Eye, label: 'Real-time Buy Box visibility tracking' },
  { icon: BarChart3, label: 'Loss-reason analytics & trends' },
  { icon: Bell, label: 'Email + Slack alerts on drops' },
  { icon: Zap, label: 'Unlimited ASINs and accounts' },
] as const;

// Full-page paywall rendered when the org has no active buybox
// subscription. Premium hero card with feature highlights and a single
// gradient CTA — designed to convert, not just inform.
export function LockedShell() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-6">
      {/* Ambient background — soft warm gradient orbs */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute -top-40 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-[400px] w-[400px] translate-x-1/4 translate-y-1/4 rounded-full bg-amber-200/20 blur-3xl" />
        <div className="absolute left-0 top-1/2 h-[300px] w-[300px] -translate-x-1/4 rounded-full bg-blue-200/15 blur-3xl" />
      </div>

      {/* Hero card */}
      <div className="relative z-10 w-full max-w-xl">
        <div className="overflow-hidden rounded-3xl border border-border/60 bg-card/80 shadow-2xl shadow-primary/5 backdrop-blur-xl">
          {/* Top accent strip */}
          <div className="h-1 bg-gradient-to-r from-primary/60 via-primary to-amber-400" />

          <div className="p-8 md:p-10">
            {/* Premium pill + headline */}
            <div className="flex flex-col items-center text-center">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-100 to-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-amber-900 ring-1 ring-amber-300/60 shadow-sm">
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                Buybox Premium
              </span>

              <h1 className="mt-5 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                Unlock the full power of Buybox
              </h1>
              <p className="mt-3 max-w-md text-base text-muted-foreground">
                Your organisation does not have an active subscription. Pick a plan to start
                tracking your Buy Box visibility, losses, and alerts.
              </p>
            </div>

            {/* Highlights */}
            <ul className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {HIGHLIGHTS.map(({ icon: Icon, label }) => (
                <li
                  key={label}
                  className="group flex items-start gap-3 rounded-xl border border-border/40 bg-background/40 p-3 transition-all hover:border-primary/30 hover:bg-background/80"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary/15 via-primary/10 to-primary/5 ring-1 ring-primary/20">
                    <Icon className="h-4 w-4 text-primary" aria-hidden />
                  </span>
                  <span className="pt-1 text-sm font-medium text-foreground">{label}</span>
                </li>
              ))}
            </ul>

            {/* CTA */}
            <div className="mt-8 flex flex-col items-center gap-3">
              <UpgradeButton size="lg" label="Choose your plan" className="w-full sm:w-auto px-8" />
              <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <Check className="h-3.5 w-3.5 text-emerald-500" aria-hidden />
                Cancel anytime · 14-day money-back guarantee
              </p>
            </div>
          </div>
        </div>

        {/* Footnote */}
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Need help choosing? <span className="text-foreground font-medium">Contact your account manager.</span>
        </p>
      </div>
    </div>
  );
}
