import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API_BASE = `${BACKEND_URL}/api`;

// Axios instance that always sends the JWT (from localStorage) as Bearer.
// We rely on Bearer auth because the app runs across preview subdomains
// where cross-site cookies are unreliable.
const api = axios.create({
  baseURL: API_BASE,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("nje_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Cloudinary on-the-fly transformation strings, keyed by usage context.
const CLOUDINARY_TRANSFORMS = {
  thumbnail: "f_auto,q_auto,w_400", // catalogue grid, admin table
  hero: "f_auto,q_auto,w_400", // homepage hero collage
  detail: "f_auto,q_auto,w_800", // product detail page
};

/**
 * Convert a backend image reference into an absolute URL usable in <img src>.
 * Pass `size` ("thumbnail" | "hero" | "detail") to have Cloudinary serve an
 * auto-format/quality, resized variant instead of the raw uploaded original —
 * works retroactively on already-uploaded images, no re-upload needed.
 */
export function resolveImageUrl(imageUrl, size) {
  if (!imageUrl) return "";
  let url = imageUrl;
  if (!(url.startsWith("http://") || url.startsWith("https://"))) {
    if (!url.startsWith("/api/")) return url;
    url = `${BACKEND_URL}${url}`;
  }
  const transform = size && CLOUDINARY_TRANSFORMS[size];
  if (transform && url.includes("res.cloudinary.com") && url.includes("/upload/")) {
    return url.replace("/upload/", `/upload/${transform}/`);
  }
  return url;
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
