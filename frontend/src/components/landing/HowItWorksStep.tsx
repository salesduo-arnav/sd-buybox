interface HowItWorksStepProps {
  number: number;
  title: string;
  description: string;
}

export function HowItWorksStep({ number, title, description }: HowItWorksStepProps) {
  return (
    <div className="relative flex flex-col items-center text-center">
      {/* Soft halo behind the number badge */}
      <div
        aria-hidden
        className="absolute left-1/2 top-0 -z-0 h-20 w-20 -translate-x-1/2 rounded-full bg-primary/20 blur-2xl"
      />
      <div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary via-primary to-primary/70 text-2xl font-bold text-primary-foreground shadow-xl shadow-primary/30 ring-4 ring-background">
        {number}
      </div>
      <h3 className="mt-5 text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-2 max-w-xs text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
