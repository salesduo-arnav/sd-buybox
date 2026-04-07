import api from "@/lib/Api";
import { IntegrationAccount } from "@/types/Account";

/**
 * Minimal settings service for the sd-buybox foundation. Only the
 * `listAccounts` method is implemented today — used by AccountContext
 * to populate the account switcher. Add more methods (preferences,
 * notifications, etc.) as feature pages are built.
 */
export const SettingsService = {
  listAccounts: () => api.get<IntegrationAccount[]>("/settings/accounts"),
};
