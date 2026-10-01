const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

async function request(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

export function registerUser({ full_name, email, password, role, phone_number, county }) {
  return request("/auth/register", {
    method: "POST",
    body: JSON.stringify({ full_name, email, password, role, phone_number, county }),
  });
}

export function loginUser({ email, password }) {
  return request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function getFarmerProfile(token) {
  return request("/farmer/profile", {
    headers: { Authorization: `Bearer ${token}` },
  });
}