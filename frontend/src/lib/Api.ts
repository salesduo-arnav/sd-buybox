import axios from "axios";
import { toast } from "sonner";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  withCredentials: true,
});

// Attach active organization and integration account headers
api.interceptors.request.use((config) => {
  const orgId = localStorage.getItem("activeOrganizationId");
  if (orgId) {
    config.headers["x-organization-id"] = orgId;
  }
  const accountId = localStorage.getItem("activeIntegrationAccountId");
  if (accountId) {
    config.headers["x-integration-account-id"] = accountId;
  }
  return config;
});

// Unwrap backend envelope: { status: "success", data: ... } -> just the inner data
// For paginated responses { status, data, pagination }, strip status but keep data + pagination
api.interceptors.response.use(
  (response) => {
    if (response.data && typeof response.data === "object" && "status" in response.data && "data" in response.data) {
      if ("pagination" in response.data) {
        const { status: _status, ...rest } = response.data;
        response.data = rest;
      } else {
        response.data = response.data.data;
      }
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401 && !error.config?.url?.includes("/auth/me")) {
      const corePlatformUrl =
        import.meta.env.VITE_CORE_PLATFORM_URL || "http://localhost:3000";
      window.location.href = `${corePlatformUrl}/login?redirect=${encodeURIComponent(window.location.href)}&app=buybox`;
      return new Promise(() => {}); // never resolves — page is redirecting
    }
    if (error.response?.status >= 500) {
      toast.error("Server error. Please try again later.");
    } else if (!error.response) {
      toast.error("Network error. Please check your connection.");
    }
    return Promise.reject(error);
  }
);

export default api;
