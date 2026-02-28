// frontend/src/config/api.ts

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "/api";

const WS_BASE_URL =
  import.meta.env.VITE_WS_URL || "ws://localhost/ws";

export const API_CONFIG = {
  baseURL: API_BASE_URL,
  wsURL: WS_BASE_URL,
  timeout: 30000,
};

export default API_CONFIG;