import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  TrendingDown,
  Bell,
  LineChart,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: TrendingDown,
    titleKey: "landing.features.visibility.title",
    descriptionKey: "landing.features.visibility.description",
  },
  {
    icon: LineChart,
    titleKey: "landing.features.revenue.title",
    descriptionKey: "landing.features.revenue.description",
  },
  {
    icon: ShieldCheck,
    titleKey: "landing.features.rootCause.title",
    descriptionKey: "landing.features.rootCause.description",
  },
  {
    icon: Bell,
    titleKey: "landing.features.alerts.title",
    descriptionKey: "landing.features.alerts.description",
  },
];

export default function Landing() {
  const { t } = useTranslation();

  return (
    <div className="h-full overflow-y-auto bg-background">
      {/* Top nav */}
      <header className="border-b border-border/40 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-orange-400 to-orange-600">
              <span className="text-sm font-bold text-white">B</span>
            </div>
            <span className="font-semibold tracking-tight">{t("app.name")}</span>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link to="/overview">{t("landing.nav.signIn")}</Link>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Decorative background — warm SalesDuo brand glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,hsl(32_100%_50%/0.15),transparent_60%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[600px] bg-[linear-gradient(to_bottom,hsl(32_100%_97%),transparent)]"
        />

        <div className="mx-auto max-w-6xl px-6 pb-24 pt-20 text-center md:pt-28">
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-border bg-background/80 px-4 py-1.5 text-xs font-medium text-muted-foreground shadow-sm">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span>{t("landing.hero.badge")}</span>
          </div>

          <h1 className="mx-auto mt-6 max-w-4xl text-balance text-5xl font-bold leading-[1.1] tracking-tight text-foreground md:text-6xl">
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
              <a href="#features">{t("landing.hero.learnMore")}</a>
            </Button>
          </div>

          <p className="mt-6 text-xs text-muted-foreground">
            {t("landing.hero.tagline")}
          </p>
        </div>

        {/* Decorative metric strip */}
        <div className="mx-auto mb-20 max-w-5xl px-6">
          <div className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-border bg-border md:grid-cols-3">
            {[
              { value: "24/7", labelKey: "landing.stats.monitoring" },
              { value: "<1h", labelKey: "landing.stats.alertSpeed" },
              { value: "100%", labelKey: "landing.stats.coverage" },
            ].map((stat) => (
              <div
                key={stat.value}
                className="flex flex-col items-center bg-background px-6 py-8"
              >
                <div className="text-3xl font-bold text-foreground md:text-4xl">
                  {stat.value}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {t(stat.labelKey)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-border/40 bg-muted/30 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
              {t("landing.features.title")}
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              {t("landing.features.subtitle")}
            </p>
          </div>

          <div className="mt-16 grid gap-6 md:grid-cols-2">
            {features.map((feature) => (
              <Card
                key={feature.titleKey}
                className="border-border/60 transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
              >
                <CardContent className="p-8">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-foreground">
                    {t(feature.titleKey)}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {t(feature.descriptionKey)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24">
        <div className="mx-auto max-w-4xl px-6">
          <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-orange-500 to-orange-700 px-8 py-16 text-center shadow-2xl shadow-primary/20 md:px-16">
            <div
              aria-hidden
              className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.18),transparent_50%)]"
            />
            <div className="relative">
              <h2 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
                {t("landing.finalCta.title")}
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-orange-50 md:text-lg">
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
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 text-sm text-muted-foreground md:flex-row">
          <p>{t("landing.footer.copyright")}</p>
          <p>{t("landing.footer.built")}</p>
        </div>
      </footer>
    </div>
  );
}
