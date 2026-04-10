import axios, { AxiosError } from "axios";
import { toast } from "sonner";
import { LS } from "./localStorageKeys";
import { redirectToLogin } from "./authRedirect";

/**
 * Axios instance for all calls to the buybox backend.
 *
 *  - `withCredentials: true` so the session_id cookie flows on cross-origin
 *    requests (dev flow B: frontend on :5004, backend on :5003).
 *  - Request interceptor attaches `x-organization-id` / `x-integration-account-id`
 *    from namespaced localStorage.
 *  - Response interceptor:
 *      * Unwraps the `{ status: 'success', data: ... }` envelope used by the
 *        buybox backend, preserving `pagination` when present.
 *      * On 401 (for protected endpoints), bounces to the core-platform login page.
 *      * Surfaces network / 5xx errors as toast notifications.
 */

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5003";

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  withCredentials: true,
});

// Endpoints that should NOT trigger a login redirect on 401.
// `/auth/me` is the canonical "am I logged in?" probe — a 401 here means
// "no, show the login screen yourself" rather than "bounce the browser".
const PUBLIC_401_ENDPOINTS: readonly string[] = ["/auth/me"];

function isPublic401(url: string | undefined): boolean {
  if (!url) return false;
  return PUBLIC_401_ENDPOINTS.some((path) => url.endsWith(path));
}

api.interceptors.request.use((config) => {
  const orgId = localStorage.getItem(LS.orgId);
  if (orgId) {
    config.headers["x-organization-id"] = orgId;
  }
  const accountId = localStorage.getItem(LS.accountId);
  if (accountId) {
    config.headers["x-integration-account-id"] = accountId;
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    // Unwrap `{ status, data }` envelope. Preserve `pagination` when present.
    const body = response.data;
    if (body && typeof body === "object" && "status" in body && "data" in body) {
      if ("pagination" in body) {
        const { status: _status, ...rest } = body as Record<string, unknown>;
        response.data = rest;
      } else {
        response.data = (body as { data: unknown }).data;
      }
    }
    return response;
  },
  (error: AxiosError) => {
    // Aborted requests (e.g. AbortController) are intentional — never toast.
    if (axios.isCancel(error)) {
      return Promise.reject(error);
    }

    const status = error.response?.status;
    const url = error.config?.url;

    if (status === 401 && !isPublic401(url)) {
      redirectToLogin();
      return Promise.reject(error);
    }

    // Backend error envelope: `{ status: 'error', error: { code, message } }`.
    const serverMessage = (error.response?.data as { error?: { message?: string } } | undefined)?.error?.message;

    if (status && status >= 500) {
      toast.error(serverMessage || "Server error. Please try again later.");
    } else if (!error.response) {
      console.error("Network error:", error);
      toast.error("Network error. Please check your connection.");
    }

    return Promise.reject(error);
  }
);

export default api;
