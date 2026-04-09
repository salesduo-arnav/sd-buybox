import {
  LayoutDashboard,
  Package,
  Bell,
  Settings,
  LogOut,
  ChevronDown,
  ChevronsUpDown,
  Check,
  Building2,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/auth";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AccountSwitcher } from "./AccountSwitcher";

export function AppSidebar() {
  const { t } = useTranslation();
  const { user, logout, activeOrganization, organizations, switchOrganization } = useAuth();
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

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">B</span>
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-sidebar-primary text-sm">
              {t("app.name")}
            </span>
            <span className="text-xs text-sidebar-foreground/60">
              {t("app.tagline")}
            </span>
          </div>
        </div>

        {/* Organization Switcher */}
        {organizations.length > 1 ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors mb-1">
                <Building2 className="h-4 w-4 shrink-0 text-sidebar-foreground/60" />
                <span className="flex-1 text-left truncate text-xs font-medium text-sidebar-primary">
                  {activeOrganization?.name || "Select organization"}
                </span>
                <ChevronsUpDown className="h-3 w-3 shrink-0 text-sidebar-foreground/50" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              {organizations.map((org) => (
                <DropdownMenuItem
                  key={org.id}
                  onClick={() => switchOrganization(org.id)}
                >
                  <Building2 className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span className="flex-1 text-sm">{org.name}</span>
                  {activeOrganization?.id === org.id && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : activeOrganization ? (
          <div className="flex items-center gap-2 px-2 py-1.5 mb-1">
            <Building2 className="h-4 w-4 shrink-0 text-sidebar-foreground/60" />
            <span className="text-xs font-medium text-sidebar-primary truncate">
              {activeOrganization.name}
            </span>
          </div>
        ) : null}

        {/* Integration Account Switcher */}
        <AccountSwitcher />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    isActive={location.pathname === item.path}
                    onClick={() => navigate(item.path)}
                    tooltip={item.label}
                    data-testid={`nav-${item.path.replace("/", "")}`}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton data-testid="user-menu-trigger">
                  <div className="w-6 h-6 rounded-full bg-sidebar-accent flex items-center justify-center text-xs font-medium text-sidebar-accent-foreground">
                    {user?.full_name?.charAt(0)?.toUpperCase() || "U"}
                  </div>
                  <span className="truncate">{user?.full_name || "User"}</span>
                  <ChevronDown className="ml-auto h-4 w-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{user?.full_name}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
                <DropdownMenuItem onClick={logout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
