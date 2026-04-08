import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  Eye,
  AlertTriangle,
  TrendingDown,
  DollarSign,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { DashboardPreview } from "@/components/landing/DashboardPreview";
import { FeatureCard } from "@/components/landing/FeatureCard";
import { HowItWorksStep } from "@/components/landing/HowItWorksStep";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { FadeInSection } from "@/components/landing/FadeInSection";

const features = [
  {
    icon: Eye,
    titleKey: "landing.features.visibility.title",
    descriptionKey: "landing.features.visibility.description",
  },
  {
    icon: AlertTriangle,
    titleKey: "landing.features.rootCause.title",
    descriptionKey: "landing.features.rootCause.description",
  },
  {
    icon: TrendingDown,
    titleKey: "landing.features.cheaperSeller.title",
    descriptionKey: "landing.features.cheaperSeller.description",
  },
  {
    icon: DollarSign,
    titleKey: "landing.features.missedSales.title",
    descriptionKey: "landing.features.missedSales.description",
  },
] as const;

const steps = [
  { number: 1, titleKey: "landing.howItWorks.step1.title", descriptionKey: "landing.howItWorks.step1.description" },
  { number: 2, titleKey: "landing.howItWorks.step2.title", descriptionKey: "landing.howItWorks.step2.description" },
  { number: 3, titleKey: "landing.howItWorks.step3.title", descriptionKey: "landing.howItWorks.step3.description" },
] as const;

export default function Landing() {
  const { t } = useTranslation();

  const scrollToId = (id: string) => (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="h-full overflow-y-auto bg-background">
      {/* Top nav */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/70 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
        <div className="flex w-full items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-12">
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/70 shadow-md shadow-primary/30 ring-1 ring-primary/30">
              <span className="text-sm font-bold text-primary-foreground">B</span>
            </div>
            <span className="truncate text-base font-semibold tracking-tight text-foreground">
              {t("app.name")}
            </span>
          </div>

          <nav className="hidden flex-1 items-center justify-center gap-6 md:flex lg:gap-10">
            <a
              href="#how-it-works"
              onClick={scrollToId("how-it-works")}
              className="relative whitespace-nowrap text-sm font-medium text-muted-foreground transition-colors hover:text-foreground after:absolute after:inset-x-0 after:-bottom-1.5 after:h-0.5 after:origin-center after:scale-x-0 after:rounded-full after:bg-primary after:transition-transform hover:after:scale-x-100"
            >
              {t("landing.nav.howItWorks")}
            </a>
            <a
              href="#features"
              onClick={scrollToId("features")}
              className="relative whitespace-nowrap text-sm font-medium text-muted-foreground transition-colors hover:text-foreground after:absolute after:inset-x-0 after:-bottom-1.5 after:h-0.5 after:origin-center after:scale-x-0 after:rounded-full after:bg-primary after:transition-transform hover:after:scale-x-100"
            >
              {t("landing.nav.features")}
            </a>
          </nav>

          <div className="flex flex-1 items-center justify-end gap-2">
            <LanguageSwitcher />
            <Button
              asChild
              size="sm"
              className="h-9 rounded-full px-4 shadow-sm shadow-primary/20 sm:px-5"
            >
              <Link to="/overview">{t("landing.nav.signIn")}</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary/[0.08] via-background to-background">
        {/* Soft radial halo */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.25),transparent_60%)]"
        />
        {/* Grid pattern background */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,hsl(var(--foreground)/0.04)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--foreground)/0.04)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]"
        />
        {/* Orbital blurs */}
        <div
          aria-hidden
          className="pointer-events-none absolute -left-32 top-40 -z-10 h-80 w-80 rounded-full bg-primary/15 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-32 top-20 -z-10 h-80 w-80 rounded-full bg-primary/20 blur-3xl"
        />

        <div className="mx-auto max-w-6xl px-4 pb-16 pt-16 text-center sm:px-6 sm:pb-20 sm:pt-20 md:pt-28">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-primary/20 bg-background/80 px-4 py-1.5 text-xs font-medium text-foreground/80 shadow-sm backdrop-blur">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary"></span>
            </span>
            <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            <span>{t("landing.hero.badge")}</span>
          </div>

          <h1 className="mx-auto mt-6 max-w-4xl text-balance text-4xl font-bold leading-[1.05] tracking-tight text-foreground sm:mt-8 sm:text-5xl md:text-6xl lg:text-7xl">
            {t("landing.hero.title")}
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-balance text-base text-muted-foreground sm:mt-6 sm:text-lg md:text-xl">
            {t("landing.hero.subtitle")}
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:mt-10 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="group h-12 w-full rounded-full px-8 text-base shadow-lg shadow-primary/30 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-primary/40 sm:w-auto"
            >
              <Link to="/overview" data-testid="landing-cta-primary">
                {t("landing.hero.cta")}
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="h-12 w-full rounded-full border-border/80 px-8 text-base backdrop-blur hover:bg-background sm:w-auto"
            >
              <a href="#how-it-works" onClick={scrollToId("how-it-works")}>
                {t("landing.hero.learnMore")}
              </a>
            </Button>
          </div>

          <p className="mt-6 text-xs text-muted-foreground">{t("landing.hero.tagline")}</p>
        </div>

        <div className="pb-24">
          <DashboardPreview />
        </div>
      </section>

      {/* Features */}
      <section
        id="features"
        className="relative overflow-hidden border-t border-border/40 bg-gradient-to-b from-primary/[0.04] via-background to-primary/[0.06] py-24"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-0 -z-10 h-64 w-[600px] -translate-x-1/2 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.12),transparent_70%)]"
        />
        <div className="mx-auto max-w-6xl px-6">
          <FadeInSection>
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                {t("landing.features.title")}
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                {t("landing.features.subtitle")}
              </p>
            </div>
          </FadeInSection>

          <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, idx) => (
              <FadeInSection key={feature.titleKey} delayMs={idx * 80}>
                <FeatureCard
                  icon={feature.icon}
                  title={t(feature.titleKey)}
                  description={t(feature.descriptionKey)}
                />
              </FadeInSection>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section
        id="how-it-works"
        className="relative overflow-hidden border-t border-border/40 bg-gradient-to-b from-background via-primary/[0.03] to-background py-24"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 top-1/2 -z-10 h-72 w-72 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -left-20 top-1/2 -z-10 h-72 w-72 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl"
        />
        <div className="mx-auto max-w-6xl px-6">
          <FadeInSection>
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                {t("landing.howItWorks.title")}
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                {t("landing.howItWorks.subtitle")}
              </p>
            </div>
          </FadeInSection>

          <div className="relative mt-16">
            <div
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-8 hidden h-0 w-2/3 -translate-x-1/2 border-t border-dashed border-border md:block"
            />
            <div className="relative grid grid-cols-1 gap-12 md:grid-cols-3 md:gap-8">
              {steps.map((step, idx) => (
                <FadeInSection key={step.number} delayMs={idx * 100}>
                  <HowItWorksStep
                    number={step.number}
                    title={t(step.titleKey)}
                    description={t(step.descriptionKey)}
                  />
                </FadeInSection>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative overflow-hidden py-24">
        {/* Ambient background accents so the CTA card doesn't feel isolated */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.08),transparent_70%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-border to-transparent"
        />
        <div className="mx-auto max-w-5xl px-6">
          <FadeInSection>
            <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-background via-primary/[0.06] to-primary/[0.08] px-6 py-12 text-center shadow-xl shadow-primary/10 sm:px-8 sm:py-16 md:px-16">
              {/* Soft radial highlight — mirrors the hero section */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.18),transparent_65%)]"
              />
              {/* Grid pattern — same as hero */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--foreground)/0.05)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--foreground)/0.05)_1px,transparent_1px)] bg-[size:44px_44px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_80%)]"
              />
              {/* Glowing orbs */}
              <div
                aria-hidden
                className="pointer-events-none absolute -left-24 -top-24 h-64 w-64 rounded-full bg-primary/20 blur-3xl"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute -bottom-24 -right-16 h-72 w-72 rounded-full bg-primary/25 blur-3xl"
              />
              {/* Decorative concentric rings — stronger so they read clearly */}
              <div
                aria-hidden
                className="pointer-events-none absolute -right-32 -top-32 h-80 w-80 rounded-full border-2 border-primary/25"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full border-2 border-primary/30"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full border-2 border-primary/35"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute -bottom-28 -left-28 h-72 w-72 rounded-full border-2 border-primary/25"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute -bottom-16 -left-16 h-48 w-48 rounded-full border-2 border-primary/30"
              />
              {/* Floating sparkle accents — bumped up so they're visible */}
              <Sparkles
                aria-hidden
                className="pointer-events-none absolute left-12 top-12 h-6 w-6 text-primary"
              />
              <Sparkles
                aria-hidden
                className="pointer-events-none absolute bottom-16 right-20 h-5 w-5 text-primary/80"
              />
              <Sparkles
                aria-hidden
                className="pointer-events-none absolute right-28 top-20 h-4 w-4 text-primary/70"
              />
              <Sparkles
                aria-hidden
                className="pointer-events-none absolute bottom-24 left-20 h-4 w-4 text-primary/60"
              />

              <div className="relative">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 ring-1 ring-primary/30 shadow-sm shadow-primary/10 backdrop-blur-sm">
                  <CheckCircle2
                    className="h-9 w-9 text-primary"
                    aria-hidden="true"
                  />
                </div>
                <h2 className="mt-6 text-balance text-2xl font-bold tracking-tight text-foreground sm:text-3xl md:text-4xl">
                  {t("landing.finalCta.title")}
                </h2>
                <p className="mx-auto mt-4 max-w-xl text-balance text-sm text-muted-foreground sm:text-base md:text-lg">
                  {t("landing.finalCta.subtitle")}
                </p>
                <Button
                  asChild
                  size="lg"
                  className="group mt-8 h-12 w-full rounded-full bg-primary px-8 text-base font-semibold text-primary-foreground shadow-xl shadow-primary/30 transition-all hover:-translate-y-0.5 hover:bg-primary/90 hover:shadow-2xl hover:shadow-primary/40 sm:w-auto"
                >
                  <Link to="/overview" data-testid="landing-cta-secondary">
                    {t("landing.finalCta.cta")}
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                    {t("landing.finalCta.trustNoCard")}
                  </span>
                  <span className="hidden h-1 w-1 rounded-full bg-muted-foreground/40 sm:inline-block" />
                  <span className="inline-flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                    {t("landing.finalCta.trustSetup")}
                  </span>
                </div>
              </div>
            </div>
          </FadeInSection>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
