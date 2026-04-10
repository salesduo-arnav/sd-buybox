/**
 * Namespaced localStorage keys.
 *
 * All buybox-owned localStorage entries are prefixed with `buybox:` so they
 * never collide with core-platform's keys if we ever end up on a shared
 * origin (e.g. running buybox and app under the same domain).
 *
 * Import `LS` from this file instead of hard-coding string keys at call sites.
 */
export const LS = {
    orgId: 'buybox:activeOrganizationId',
    accountId: 'buybox:activeIntegrationAccountId',
    integrationEnabled: 'buybox:integrationEnabled',
} as const;
