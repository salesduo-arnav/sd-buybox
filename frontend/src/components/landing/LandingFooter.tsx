import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";

export function LandingFooter() {
  const { t } = useTranslation();

  // TODO: wire About / Contact / Privacy hrefs when marketing pages exist
  const placeholderHref = "#";

  return (
    <footer className="border-t border-border/40 bg-background py-12">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          {/* Col 1: brand */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/80">
                <span className="text-sm font-bold text-primary-foreground">B</span>
              </div>
              <span className="font-semibold tracking-tight text-foreground">
                {t("app.name")}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{t("landing.footer.description")}</p>
          </div>

          {/* Col 2: product links */}
          <div>
            <h4 className="text-sm font-semibold text-foreground">
              {t("landing.footer.product")}
            </h4>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>
                <a href="#features" className="transition-colors hover:text-primary">
                  {t("landing.footer.links.features")}
                </a>
              </li>
              <li>
                <a href="#how-it-works" className="transition-colors hover:text-primary">
                  {t("landing.footer.links.howItWorks")}
                </a>
              </li>
            </ul>
          </div>

          {/* Col 3: company links */}
          <div>
            <h4 className="text-sm font-semibold text-foreground">
              {t("landing.footer.company")}
            </h4>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>
                <a href={placeholderHref} className="transition-colors hover:text-primary">
                  {t("landing.footer.links.about")}
                </a>
              </li>
              <li>
                <a href={placeholderHref} className="transition-colors hover:text-primary">
                  {t("landing.footer.links.contact")}
                </a>
              </li>
              <li>
                <a href={placeholderHref} className="transition-colors hover:text-primary">
                  {t("landing.footer.links.privacy")}
                </a>
              </li>
            </ul>
          </div>

          {/* Col 4: language */}
          <div>
            <h4 className="text-sm font-semibold text-foreground">
              {t("landing.footer.language")}
            </h4>
            <div className="mt-3">
              <LanguageSwitcher />
            </div>
          </div>
        </div>

        {/* Bottom strip */}
        <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-border/40 pt-6 text-sm text-muted-foreground md:flex-row">
          <p>{t("landing.footer.copyright")}</p>
          <p>{t("landing.footer.built")}</p>
        </div>
      </div>
    </footer>
  );
}
