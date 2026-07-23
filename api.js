// api.js — shared helper for talking to the Norza backend.
// Include this on any page that needs auth or API calls:
// <script src="api.js"></script>

// Automatically uses your local backend while developing on your computer,
// and switches to your deployed backend once the site is live on GitHub Pages.
// After you deploy (see README), replace the placeholder URL below with your
// real Render/Railway URL — e.g. "https://norza-backend.onrender.com/api".
const DEPLOYED_API_BASE = "https://norza-production.up.railway.app/api"; // <-- REPLACE THIS WITH YOUR REAL DEPLOYED BACKEND URL
const LOCAL_API_BASE = "http://localhost:5000/api";

const API_BASE =
  window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? LOCAL_API_BASE
    : DEPLOYED_API_BASE;

const NorzaAuth = {
  saveSession(token, user) {
    localStorage.setItem("norza_token", token);
    localStorage.setItem("norza_user", JSON.stringify(user));
  },
  getToken() {
    return localStorage.getItem("norza_token");
  },
  getUser() {
    const raw = localStorage.getItem("norza_user");
    return raw ? JSON.parse(raw) : null;
  },
  isLoggedIn() {
    return !!this.getToken();
  },
  logout() {
    localStorage.removeItem("norza_token");
    localStorage.removeItem("norza_user");
    window.location.href = "login.html";
  },
};

// Wrapper around fetch() that adds the API base URL and auth header automatically.
async function norzaApiFetch(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  const token = NorzaAuth.getToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || `Request failed (${res.status})`);
  }

  return data;
}
