import { useAccount } from "@/contexts/account";

export function useActiveAccount() {
  const { activeAccount } = useAccount();
  return activeAccount;
}
