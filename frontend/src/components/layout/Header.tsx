import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import { LanguageSwitcher } from "./LanguageSwitcher";

const routeNames: Record<string, string> = {
  overview: "nav.overview",
  products: "nav.products",
  alerts: "nav.alerts",
  settings: "nav.settings",
};

export function Header() {
  const { t } = useTranslation();
  const location = useLocation();

  const segments = location.pathname.split("/").filter(Boolean);
  const lastSegment = segments[segments.length - 1] || "overview";
  const breadcrumbLabel = routeNames[lastSegment]
    ? t(routeNames[lastSegment])
    : lastSegment.charAt(0).toUpperCase() + lastSegment.slice(1);

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbPage>{breadcrumbLabel}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="ml-auto">
        <LanguageSwitcher />
      </div>
    </header>
  );
}
