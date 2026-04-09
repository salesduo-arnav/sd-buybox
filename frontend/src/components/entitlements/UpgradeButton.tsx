import { ArrowUpRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth';
import { upgradeUrl } from '@/lib/upgradeUrl';
import { cn } from '@/lib/utils';

interface UpgradeButtonProps {
  label?: string;
  size?: 'default' | 'sm' | 'lg';
  variant?: 'default' | 'outline' | 'ghost';
  showIcon?: boolean;
  className?: string;
}

// Primary CTA that redirects to the core-platform billing flow.
// `variant="default"` renders a gradient pill — the rest fall back to the
// standard shadcn variants for inline / secondary placements.
export function UpgradeButton({
  label = 'Upgrade plan',
  size = 'default',
  variant = 'default',
  showIcon = true,
  className,
}: UpgradeButtonProps) {
  const { activeOrganization } = useAuth();
  const href = upgradeUrl(activeOrganization?.id ?? null);

  if (variant === 'default') {
    return (
      <Button
        asChild
        size={size}
        className={cn(
          'group relative overflow-hidden border-0 bg-gradient-to-r from-primary via-primary to-primary/90',
          'text-primary-foreground font-medium shadow-lg shadow-primary/25',
          'transition-all hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5',
          className
        )}
      >
        <a href={href} className="inline-flex items-center gap-2">
          {showIcon && (
            <Sparkles className="h-4 w-4 transition-transform group-hover:rotate-12" aria-hidden />
          )}
          <span>{label}</span>
          <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />
        </a>
      </Button>
    );
  }

  return (
    <Button asChild size={size} variant={variant} className={className}>
      <a href={href} className="inline-flex items-center gap-2">
        {showIcon && <Sparkles className="h-4 w-4" aria-hidden />}
        {label}
      </a>
    </Button>
  );
}
