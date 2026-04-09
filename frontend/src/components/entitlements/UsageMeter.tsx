import { Infinity as InfinityIcon, TrendingUp } from 'lucide-react';
import { useLimit } from '@/hooks/useEntitlements';
import type { LimitKey } from '@/types/Entitlements';
import { cn } from '@/lib/utils';
import { UpgradeButton } from './UpgradeButton';

interface UsageMeterProps {
  limitKey: LimitKey;
  label: string;
  className?: string;
}

// Returns the tailwind classes used to colour the bar fill at a given
// percentage. Green-leaning at low usage, amber in the warning band, red
// when the user has effectively run out of room.
function toneFor(percent: number): { fill: string; text: string } {
  if (percent >= 90) return { fill: 'from-red-500 to-red-600', text: 'text-red-600' };
  if (percent >= 75) return { fill: 'from-amber-400 to-amber-500', text: 'text-amber-600' };
  return { fill: 'from-primary/80 to-primary', text: 'text-foreground' };
}

// Premium-styled progress card for one derived limit. Shows an inline
// upgrade CTA when the cap is reached.
export function UsageMeter({ limitKey, label, className }: UsageMeterProps) {
  const { used, limit, atCap } = useLimit(limitKey);

  // Unlimited tier — render a clean stat card without a progress bar.
  if (limit === null) {
    return (
      <div
        className={cn(
          'group relative overflow-hidden rounded-xl border border-border/60 bg-card p-4',
          'transition-all hover:border-primary/40 hover:shadow-md hover:shadow-primary/5',
          className
        )}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-semibold text-foreground tabular-nums">{used}</p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200">
            <InfinityIcon className="h-3.5 w-3.5" aria-hidden />
            Unlimited
          </span>
        </div>
      </div>
    );
  }

  const percent = limit === 0 ? 100 : Math.min(100, Math.round((used / limit) * 100));
  const tone = toneFor(percent);

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl border border-border/60 bg-card p-4',
        'transition-all hover:border-primary/40 hover:shadow-md hover:shadow-primary/5',
        atCap && 'border-red-200 bg-red-50/30',
        className
      )}
    >
      <div className="flex items-baseline justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className={cn('text-sm font-semibold tabular-nums', tone.text)}>
          <span className="text-base">{used}</span>
          <span className="text-muted-foreground"> / {limit}</span>
        </p>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={cn('h-full rounded-full bg-gradient-to-r transition-[width] duration-500 ease-out', tone.fill)}
          style={{ width: `${percent}%` }}
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>

      {atCap ? (
        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600">
            <TrendingUp className="h-3.5 w-3.5" aria-hidden />
            Limit reached
          </span>
          <UpgradeButton size="sm" label="Upgrade" />
        </div>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">{percent}% of plan used</p>
      )}
    </div>
  );
}
