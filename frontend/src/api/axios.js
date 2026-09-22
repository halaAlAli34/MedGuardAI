import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  // Safety net: with the backend's own AI retry budget capped around 13s
  // worst case (see aiService.js), 30s gives generous headroom for slow
  // networks/report PDFs while still guaranteeing the UI never spins
  // forever if something genuinely hangs server-side.
  timeout: 30000
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("medguard_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("medguard_token");
      localStorage.removeItem("medguard_user");
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);

export default api;
