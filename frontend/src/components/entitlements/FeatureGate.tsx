import React from 'react';
import { Lock, Sparkles } from 'lucide-react';
import { useFeature } from '@/hooks/useEntitlements';
import type { FeatureKey } from '@/types/Entitlements';
import { cn } from '@/lib/utils';

interface FeatureGateProps {
  feature: FeatureKey;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  className?: string;
}

// Renders children when the feature is enabled. Otherwise renders a
// dimmed version with a "Premium" pill in the corner, or a custom fallback.
export function FeatureGate({ feature, children, fallback, className }: FeatureGateProps) {
  const enabled = useFeature(feature);
  if (enabled) return <>{children}</>;
  if (fallback !== undefined) return <>{fallback}</>;

  return (
    <div className={cn('relative isolate', className)}>
      <div className="pointer-events-none select-none opacity-50 blur-[0.5px]">{children}</div>

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-lg bg-gradient-to-br from-primary/5 via-transparent to-transparent ring-1 ring-inset ring-primary/15"
      />

      <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-100 to-amber-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-900 ring-1 ring-amber-300/60 shadow-sm">
        <Sparkles className="h-3 w-3" aria-hidden />
        Premium
      </span>

      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-background/90 ring-1 ring-border shadow-md backdrop-blur-sm">
          <Lock className="h-4 w-4 text-muted-foreground" aria-hidden />
        </span>
      </div>
    </div>
  );
}
