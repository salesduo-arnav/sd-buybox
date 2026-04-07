import axios from "axios";

const CORE_PLATFORM_URL =
  import.meta.env.VITE_CORE_PLATFORM_URL || "http://localhost:3000";

const coreApi = axios.create({
  baseURL: `${CORE_PLATFORM_URL}/api`,
  withCredentials: true,
});

export default coreApi;
