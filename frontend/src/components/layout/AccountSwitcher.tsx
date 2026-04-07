import { ChevronsUpDown, Check } from "lucide-react";
import { useAccount } from "@/contexts/AccountContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AccountSwitcher() {
  const { accounts, activeAccount, switchAccount } = useAccount();

  if (accounts.length === 0) {
    return (
      <div className="px-2 py-1.5 text-xs text-sidebar-foreground/50">
        No accounts connected
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          data-testid="account-switcher-trigger"
          className="flex items-center gap-2 w-full rounded-md px-2 py-1.5 text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
        >
          <div className="flex-1 text-left truncate">
            <p className="font-medium text-sidebar-primary truncate text-xs">
              {activeAccount?.account_name || "Select account"}
            </p>
            {activeAccount && (
              <p className="text-[10px] text-sidebar-foreground/60">
                {activeAccount.account_type.toUpperCase()} &middot;{" "}
                {activeAccount.marketplace_region} &middot;{" "}
                {activeAccount.platform}
              </p>
            )}
          </div>
          <ChevronsUpDown className="h-3 w-3 shrink-0 text-sidebar-foreground/50" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        {accounts.map((account) => (
          <DropdownMenuItem
            key={account.id}
            onClick={() => switchAccount(account.id)}
          >
            <div className="flex-1">
              <p className="text-sm font-medium">{account.account_name}</p>
              <p className="text-xs text-muted-foreground">
                {account.account_type.toUpperCase()} &middot;{" "}
                {account.marketplace_region} &middot; {account.platform}
              </p>
            </div>
            {activeAccount?.id === account.id && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
