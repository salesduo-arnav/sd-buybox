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
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/60 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/80">
              <span className="text-sm font-bold text-primary-foreground">B</span>
            </div>
            <span className="font-semibold tracking-tight text-foreground">{t("app.name")}</span>
          </div>

          <nav className="hidden items-center gap-6 md:flex">
            <a
              href="#how-it-works"
              onClick={scrollToId("how-it-works")}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {t("landing.nav.howItWorks")}
            </a>
            <a
              href="#features"
              onClick={scrollToId("features")}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {t("landing.nav.features")}
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Button asChild variant="ghost" size="sm">
              <Link to="/overview">{t("landing.nav.signIn")}</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary/[0.06] via-background to-background">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.22),transparent_60%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -left-20 top-40 -z-10 h-72 w-72 rounded-full bg-primary/10 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-20 top-20 -z-10 h-72 w-72 rounded-full bg-primary/15 blur-3xl"
        />

        <div className="mx-auto max-w-6xl px-6 pb-16 pt-20 text-center md:pt-28">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-border bg-background/80 px-4 py-1.5 text-xs font-medium text-muted-foreground shadow-sm">
            <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            <span>{t("landing.hero.badge")}</span>
          </div>

          <h1 className="mx-auto mt-6 max-w-4xl text-balance text-4xl font-bold leading-[1.1] tracking-tight text-foreground md:text-5xl lg:text-6xl">
            {t("landing.hero.title")}
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-balance text-lg text-muted-foreground md:text-xl">
            {t("landing.hero.subtitle")}
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="h-12 px-8 text-base shadow-lg shadow-primary/20">
              <Link to="/overview" data-testid="landing-cta-primary">
                {t("landing.hero.cta")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-12 px-8 text-base">
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
      <section className="py-24">
        <div className="mx-auto max-w-4xl px-6">
          <FadeInSection>
            <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary via-primary to-primary/80 px-8 py-16 text-center shadow-2xl shadow-primary/20 md:px-16">
              <div
                aria-hidden
                className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary-foreground)/0.18),transparent_50%)]"
              />
              <div className="relative">
                <CheckCircle2
                  className="mx-auto h-12 w-12 text-primary-foreground"
                  aria-hidden="true"
                />
                <h2 className="mt-4 text-3xl font-bold tracking-tight text-primary-foreground md:text-4xl">
                  {t("landing.finalCta.title")}
                </h2>
                <p className="mx-auto mt-4 max-w-xl text-primary-foreground/90 md:text-lg">
                  {t("landing.finalCta.subtitle")}
                </p>
                <Button
                  asChild
                  size="lg"
                  variant="secondary"
                  className="mt-8 h-12 px-8 text-base shadow-lg"
                >
                  <Link to="/overview" data-testid="landing-cta-secondary">
                    {t("landing.finalCta.cta")}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </FadeInSection>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
