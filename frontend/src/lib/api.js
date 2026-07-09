import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API_BASE = `${BACKEND_URL}/api`;

// Axios instance that always sends the JWT (from localStorage) as Bearer.
// We rely on Bearer auth because the app runs across preview subdomains
// where cross-site cookies are unreliable.
const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("nje_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/** Convert a backend image reference into an absolute URL usable in <img src>. */
export function resolveImageUrl(imageUrl) {
  if (!imageUrl) return "";
  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) return imageUrl;
  if (imageUrl.startsWith("/api/")) return `${BACKEND_URL}${imageUrl}`;
  return imageUrl;
}

/** Format Indian Rupee amount without decimals. */
export function formatINR(value) {
  const n = Number(value || 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
}

/** Human-readable error message from an axios error. */
export function apiErrorMessage(err, fallback = "Something went wrong") {
  const detail = err?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((e) => (e && typeof e.msg === "string" ? e.msg : JSON.stringify(e)))
      .join(" ");
  }
  if (detail && typeof detail.msg === "string") return detail.msg;
  return err?.message || fallback;
}

export default api;
