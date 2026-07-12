const API_BASE = import.meta.env.VITE_API_URL || "/api";

export function getToken() {
  return localStorage.getItem("panorama_jum_token");
}

export function setSession(session) {
  localStorage.setItem("panorama_jum_token", session.access_token);
  localStorage.setItem("panorama_jum_user", JSON.stringify(session.user));
}

export function getStoredUser() {
  const raw = localStorage.getItem("panorama_jum_user");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    clearSession();
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem("panorama_jum_token");
  localStorage.removeItem("panorama_jum_user");
}

async function request(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.detail || "Request failed");
  }
  if (response.status === 204) return {};
  return response.json();
}

async function requestBlob(path) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${API_BASE}${path}`, { headers });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.detail || "Request failed");
  }
  return response.blob();
}

export const api = {
  login: (email, password) => request("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  me: () => request("/auth/me"),
  dashboard: () => request("/dashboard"),
  records: (resource, search = "") => request(`/records/${resource}?search=${encodeURIComponent(search)}`),
  create: (resource, payload) => request(`/records/${resource}`, { method: "POST", body: JSON.stringify(payload) }),
  update: (resource, id, payload) => request(`/records/${resource}/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  remove: (resource, id) => request(`/records/${resource}/${id}`, { method: "DELETE" }),
  checkout: (payload) => request("/pos/checkout", { method: "POST", body: JSON.stringify(payload) }),
  sellRideTicket: (payload) => request("/rides/tickets", { method: "POST", body: JSON.stringify(payload) }),
  useRideTicket: (id) => request(`/rides/tickets/${id}/use`, { method: "POST" }),
  rideSummary: () => request("/rides/summary"),
  checkoutParkingTicket: (id) => request(`/parking/tickets/${id}/checkout`, { method: "POST" }),
  parkingSummary: () => request("/parking/summary"),
  parkingVehicles: (search = "") => request(`/parking/vehicles?search=${encodeURIComponent(search)}`),
  parkingTickets: (status = "all", search = "", fromDate = "", toDate = "") =>
    request(
      `/parking/tickets?status=${status}&search=${encodeURIComponent(search)}&from_date=${encodeURIComponent(fromDate)}&to_date=${encodeURIComponent(toDate)}`
    ),
  report: (period, fromDate = "", toDate = "") =>
    request(`/reports/summary?period=${period}&from_date=${encodeURIComponent(fromDate)}&to_date=${encodeURIComponent(toDate)}`),
  backups: () => request("/backups"),
  createBackup: () => request("/backups", { method: "POST" }),
  restoreBackup: (filename) => request(`/backups/${encodeURIComponent(filename)}/restore`, { method: "POST" }),
  deleteBackup: (filename) => request(`/backups/${encodeURIComponent(filename)}`, { method: "DELETE" }),
  downloadBackup: (filename) => requestBlob(`/backups/${encodeURIComponent(filename)}/download`)
};
