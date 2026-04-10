import {
  LayoutDashboard,
  Package,
  Bell,
  Settings,
  Shield,
  LogOut,
  User,
  ChevronsUpDown,
  Check,
  Plus,
  Store,
  Loader2,
  Globe,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getInitials } from "@/lib/utils";
import { useAuth } from "@/contexts/auth";
import { useAccount } from "@/contexts/account";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";

const CORE_PLATFORM_URL =
  import.meta.env.VITE_CORE_PLATFORM_URL || "http://app.lvh.me";

const languages = [
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "es", label: "Español", flag: "🇪🇸" },
];

export function AppSidebar() {
  const { t, i18n } = useTranslation();
  const {
    user,
    isAdmin,
    logout,
    activeOrganization,
    organizations,
    switchOrganization,
  } = useAuth();
  const {
    accounts,
    activeAccount,
    isLoading: isAccountsLoading,
    switchAccount,
  } = useAccount();
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    {
      label: t("nav.overview"),
      icon: LayoutDashboard,
      path: "/overview",
    },
    {
      label: t("nav.products"),
      icon: Package,
      path: "/products",
    },
    {
      label: t("nav.alerts"),
      icon: Bell,
      path: "/alerts",
    },
    {
      label: t("nav.settings"),
      icon: Settings,
      path: "/settings",
    },
  ];

  const isActive = (path: string) => location.pathname === path;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      const items = Array.from(
        document.querySelectorAll<HTMLElement>('[data-sidebar="menu-button"]')
      );
      const activeElement = document.activeElement as HTMLElement;
      const currentIndex = items.indexOf(activeElement);

      if (currentIndex !== -1) {
        e.preventDefault();
        const nextIndex =
          e.key === "ArrowDown"
            ? (currentIndex + 1) % items.length
            : (currentIndex - 1 + items.length) % items.length;
        items[nextIndex]?.focus();
      }
    }
  };

  return (
    <Sidebar className="border-r border-border/50 bg-sidebar-background">
      <SidebarHeader className="border-b border-border/50 p-4 space-y-3">
        {/* Tool Name + Organization Switcher */}
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest px-2 mb-2">
            {t("app.name")}
          </p>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="group flex items-center gap-3 w-full p-2 rounded-lg hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-200 outline-none ring-sidebar-ring focus-visible:ring-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 border border-primary/20 shadow-sm transition-transform group-hover:scale-105">
                  {activeOrganization?.slug ? (
                    <img
                      src={`https://avatar.vercel.sh/${activeOrganization.slug}.svg?text=${activeOrganization.name.slice(0, 2).toUpperCase()}`}
                      className="h-6 w-6 rounded-sm"
                      alt={activeOrganization.name}
                    />
                  ) : (
                    <img
                      src="/logo-dark.webp"
                      className="h-6 w-6"
                      alt="SalesDuo"
                    />
                  )}
                </div>
                <div className="flex-1 text-left truncate">
                  <span className="block text-sm font-semibold truncate tracking-tight">
                    {activeOrganization?.name || t("nav.selectOrganization", "Select Organization")}
                  </span>
                  <span className="block text-xs text-muted-foreground truncate font-medium">
                    {t("nav.organizations", {
                      count: organizations.length,
                      defaultValue: `${organizations.length} Organizations`,
                    })}
                  </span>
                </div>
                <ChevronsUpDown className="ml-auto h-4 w-4 text-muted-foreground/50 group-hover:text-foreground transition-colors" />
              </button>
            </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-64 shadow-xl border-border/50"
            align="start"
            sideOffset={8}
          >
            <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2">
              {t("nav.teams", "Teams")}
            </DropdownMenuLabel>
            {organizations.map((org) => (
              <DropdownMenuItem
                key={org.id}
                onClick={() => switchOrganization(org.id)}
                className="gap-3 p-2.5 cursor-pointer focus:bg-accent focus:text-accent-foreground"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-md border bg-background shadow-sm">
                  <img
                    src={`https://avatar.vercel.sh/${org.slug || org.id}.svg?text=${org.name.slice(0, 2).toUpperCase()}`}
                    className="h-5 w-5 rounded-sm"
                    alt={org.name}
                  />
                </div>
                <div className="flex-1 truncate font-medium">{org.name}</div>
                {activeOrganization?.id === org.id && (
                  <Check className="ml-auto h-4 w-4 text-primary" />
                )}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator className="bg-border/50" />
            <DropdownMenuItem asChild>
              <a
                href={`${CORE_PLATFORM_URL}/create-organisation`}
                className="gap-3 p-2.5 cursor-pointer text-muted-foreground hover:text-foreground focus:text-foreground"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-md border border-dashed bg-transparent shadow-none">
                  <Plus className="h-4 w-4" />
                </div>
                <div className="font-medium">
                  {t("nav.addOrganization", "Add Organization")}
                </div>
              </a>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        </div>

        {/* Integration Account Switcher */}
        <div className="px-1">
          <label className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest px-1.5 mb-1.5 block">
            {t("nav.account", "Account")}
          </label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                data-testid="account-switcher-trigger"
                className="flex items-center gap-2.5 w-full rounded-md border border-border/60 bg-background/50 px-3 py-2 text-left hover:bg-sidebar-accent hover:border-border transition-colors outline-none ring-sidebar-ring focus-visible:ring-2"
              >
                {isAccountsLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />
                ) : (
                  <Store className="h-4 w-4 text-blue-500 shrink-0" />
                )}
                <span className="flex-1 text-sm font-medium truncate">
                  {activeAccount?.account_name || t("nav.selectAccount", "Select Account")}
                </span>
                {activeAccount?.region && (
                  <span className="text-[11px] text-muted-foreground/70 font-medium shrink-0">
                    {activeAccount.region.toUpperCase()}
                  </span>
                )}
                <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-64 shadow-xl border-border/50"
              align="start"
              sideOffset={8}
            >
              <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2">
                {t("nav.integrationAccounts", "Integration Accounts")}
              </DropdownMenuLabel>
              {isAccountsLoading ? (
                <div className="flex items-center justify-center py-4 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  <span className="text-sm">{t("common.loading", "Loading...")}</span>
                </div>
              ) : accounts.length === 0 ? (
                <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                  {t("nav.noAccounts", "No integration accounts found")}
                </div>
              ) : (
                accounts.map((account) => (
                  <DropdownMenuItem
                    key={account.id}
                    onClick={() => switchAccount(account.id)}
                    className="gap-3 p-2.5 cursor-pointer focus:bg-accent focus:text-accent-foreground"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-md border bg-background shadow-sm">
                      <Store className="h-4 w-4 text-blue-500" />
                    </div>
                    <div className="flex-1 truncate">
                      <div className="font-medium truncate">
                        {account.account_name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {account.region?.toUpperCase()}
                      </div>
                    </div>
                    {activeAccount?.id === account.id && (
                      <Check className="ml-auto h-4 w-4 text-primary" />
                    )}
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </SidebarHeader>

      <SidebarContent className="p-2" onKeyDown={handleKeyDown}>
        <SidebarGroup>
          <SidebarGroupLabel className="px-3 text-xs font-semibold text-muted-foreground/70 uppercase tracking-widest mb-1">
            {t("nav.navigation", "Navigation")}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    isActive={isActive(item.path)}
                    onClick={() => navigate(item.path)}
                    tooltip={item.label}
                    className="gap-3 px-3 py-2 transition-all"
                    data-testid={`nav-${item.path.replace("/", "")}`}
                  >
                    <item.icon className="h-4 w-4 opacity-70" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && (
          <>
            <SidebarSeparator className="mx-2 my-2 bg-border/50" />
            <SidebarGroup>
              <SidebarGroupLabel className="px-3 text-xs font-semibold text-muted-foreground/70 uppercase tracking-widest mb-1">
                {t("nav.administration", "Administration")}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={location.pathname.startsWith("/admin")}
                      onClick={() => navigate("/admin/configs")}
                      tooltip={t("nav.systemConfigs", "System Configs")}
                      className="gap-3 px-3 py-2 transition-all"
                      data-testid="nav-admin-configs"
                    >
                      <Shield className="h-4 w-4 opacity-70" />
                      <span>{t("nav.systemConfigs", "System Configs")}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-border/50 p-4 bg-sidebar-footer">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              data-testid="user-menu-trigger"
              className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-200 outline-none ring-sidebar-ring focus-visible:ring-2"
            >
              <Avatar className="h-9 w-9 rounded-lg border shadow-sm">
                <AvatarFallback className="rounded-lg bg-orange-100 text-orange-600 font-semibold text-sm">
                  {user?.full_name ? getInitials(user.full_name) : "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 truncate">
                <p className="text-sm font-semibold truncate">
                  {user?.full_name || "User"}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user?.email}
                </p>
              </div>
              <ChevronsUpDown className="ml-auto h-4 w-4 text-muted-foreground/50 group-hover:text-foreground transition-colors" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="w-60 shadow-xl border-border/50"
            sideOffset={12}
          >
            <div className="flex items-center gap-2 px-2 py-2 border-b border-border/50 mb-1">
              <Avatar className="h-8 w-8 rounded-md">
                <AvatarFallback className="rounded-md bg-muted text-xs">
                  {user?.full_name ? getInitials(user.full_name) : "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-medium truncate">{user?.full_name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {user?.email}
                </p>
              </div>
            </div>
            <DropdownMenuItem asChild className="cursor-pointer">
              <a
                href={`${CORE_PLATFORM_URL}/profile`}
                className="flex items-center gap-2 p-2.5"
              >
                <User className="h-4 w-4 text-muted-foreground" />
                {t("nav.profile", "Profile")}
              </a>
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="gap-2 p-2.5 cursor-pointer">
                <Globe className="h-4 w-4 text-muted-foreground" />
                {t("language.switchLanguage", "Language")}
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent className="w-48 shadow-xl border-border/50 overflow-y-auto">
                  {languages.map((lang) => (
                    <DropdownMenuItem
                      key={lang.code}
                      onClick={() => {
                        i18n.changeLanguage(lang.code);
                        localStorage.setItem("language", lang.code);
                      }}
                      className="gap-3 p-1 cursor-pointer"
                    >
                      <span className="text-base">{lang.flag}</span>
                      <span className="flex-1 font-normal">{lang.label}</span>
                      {i18n.language === lang.code && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
            <DropdownMenuSeparator className="bg-border/50" />
            <DropdownMenuItem
              onClick={logout}
              className="text-destructive focus:text-destructive focus:bg-destructive/10 p-2.5 cursor-pointer"
            >
              <LogOut className="h-4 w-4 mr-2" />
              {t("auth.signOut", "Sign out")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
