import { useAccount } from "@/contexts/AccountContext";

export function useActiveAccount() {
  const { activeAccount } = useAccount();
  return activeAccount;
}
