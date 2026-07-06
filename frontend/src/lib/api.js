import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

export const TOKEN_KEY = "nexusdrop.access";
export const REFRESH_KEY = "nexusdrop.refresh";

export const tokenStore = {
  get access() {
    return localStorage.getItem(TOKEN_KEY);
  },
  get refresh() {
    return localStorage.getItem(REFRESH_KEY);
  },
  set({ access, refresh }) {
    if (access) localStorage.setItem(TOKEN_KEY, access);
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const access = tokenStore.access;
  if (access) config.headers.Authorization = `Bearer ${access}`;
  return config;
});

let refreshing = null;

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;

    // Attempt a single silent refresh on 401 for authenticated calls.
    if (status === 401 && !original._retry && tokenStore.refresh) {
      original._retry = true;
      try {
        refreshing =
          refreshing ||
          axios.post(`${BASE_URL}/auth/token/refresh/`, { refresh: tokenStore.refresh });
        const { data } = await refreshing;
        refreshing = null;
        tokenStore.set({ access: data.access });
        original.headers.Authorization = `Bearer ${data.access}`;
        return api(original);
      } catch (e) {
        refreshing = null;
        tokenStore.clear();
        window.dispatchEvent(new CustomEvent("nexusdrop:signed-out"));
      }
    }
    return Promise.reject(error);
  }
);

/** Normalise DRF error payloads into a single readable string. */
export function extractError(error, fallback = "Something went wrong.") {
  const data = error?.response?.data;
  if (!data) return error?.message || fallback;
  if (typeof data === "string") return data;
  if (data.detail) return data.detail;
  const parts = [];
  for (const [key, val] of Object.entries(data)) {
    const msg = Array.isArray(val) ? val.join(" ") : String(val);
    parts.push(key === "non_field_errors" ? msg : `${key}: ${msg}`);
  }
  return parts.join(" · ") || fallback;
}

export { BASE_URL };

