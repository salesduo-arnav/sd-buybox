/**
 * Centralized redirect helpers for handing off to sd-core-platform login.
 *
 * Buybox doesn't host its own login UI — it bounces unauthenticated users to
 * the core-platform login page with `?redirect=<back-to-buybox>&app=buybox`,
 * and core-platform sends them back here after auth (+ onboarding, if any).
 *
 * Anywhere in the app that needs to trigger a login redirect should import
 * `redirectToLogin` from this file instead of building the URL inline —
 * keeps the query-param contract in exactly one place.
 */

const APP_NAME = 'buybox';

function corePlatformUrl(): string {
    const configured = import.meta.env.VITE_CORE_PLATFORM_URL;
    if (!configured) {
        // Should never happen in a properly-built frontend — Vite inlines
        // env vars at build time. If we get here, something is misconfigured.
        // eslint-disable-next-line no-console
        console.error('VITE_CORE_PLATFORM_URL is not set — auth redirects will fail.');
        return '';
    }
    return configured.replace(/\/$/, '');
}

function buildLoginUrl(returnTo: string): string {
    const base = corePlatformUrl();
    const redirect = encodeURIComponent(returnTo);
    return `${base}/login?redirect=${redirect}&app=${APP_NAME}`;
}

/**
 * Redirect the browser to the core-platform login page, preserving the
 * current URL as the post-login return target.
 *
 * `returnTo` defaults to the full current URL (origin + path + search) so
 * the user lands back on exactly the page they tried to visit.
 */
export function redirectToLogin(returnTo: string = window.location.href): void {
    window.location.replace(buildLoginUrl(returnTo));
}

/**
 * Redirect after a completed logout. Points at the app root so the user
 * lands on the buybox landing page after re-auth rather than a deep link.
 */
export function redirectToLogoutLanding(): void {
    window.location.replace(buildLoginUrl(window.location.origin));
}
