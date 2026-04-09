// Single source of truth for the URL that bounces the browser to the
// core-platform billing flow. Every "Subscribe" / "Upgrade" button in
// the app should import from this file.

const APP_NAME = 'buybox';

function corePlatformUrl(): string {
  const configured = import.meta.env.VITE_CORE_PLATFORM_URL;
  if (!configured) {
    console.error('VITE_CORE_PLATFORM_URL is not set — upgrade links will fail.');
    return '';
  }
  return configured.replace(/\/$/, '');
}

export function upgradeUrl(orgId: string | null): string {
  const base = corePlatformUrl();
  if (!base) return '#';
  const params = new URLSearchParams({ tool: APP_NAME });
  if (orgId) params.set('org', orgId);
  return `${base}/billing?${params.toString()}`;
}
