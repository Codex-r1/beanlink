const BASE = import.meta.env?.VITE_API_URL || "http://localhost:5000/api";

function getToken() {
  return localStorage.getItem("beanlink_token");
}

async function request(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    // non-JSON body (e.g. 204)
  }

  if (!res.ok) {
    const err = new Error(data?.error || `Request failed (${res.status})`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

/* AUTH */
export const registerUser = (payload) =>
  request("/auth/register", { method: "POST", body: payload, auth: false });

export const loginUser = (payload) =>
  request("/auth/login", { method: "POST", body: payload, auth: false });

/* DASHBOARD */
export const getDashboardSummary = () => request("/dashboard/summary");
export const getDashboardActivity = () => request("/dashboard/activity");

/* LISTINGS */
export const getMyListings = () => request("/listings/mine");
export const getListing = (id) => request(`/listings/${id}`, { auth: false });

export const getMarketplace = (params = {}) => {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== "" && v !== "all")
  ).toString();
  return request(`/marketplace/listings${qs ? `?${qs}` : ""}`, { auth: false });
};
export const initiateMpesaPush = (order_id, phone) =>
  request("/payments/mpesa-push", { method: "POST", body: { order_id, phone } });

export const getPaymentStatus = (txn_id) =>
  request(`/orders/${txn_id}/payment-status`);

export const createListing = (payload) =>
  request("/listings", { method: "POST", body: payload });

export const updateListing = (id, payload) =>
  request(`/listings/${id}`, { method: "PATCH", body: payload });

export const updateListingStatus = (id, status) =>
  request(`/listings/${id}/status`, { method: "PATCH", body: { status } });

export const deleteListing = (id) =>
  request(`/listings/${id}`, { method: "DELETE" });

/* ORDERS */
export const getOrders = (params = {}) => {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== "" && v !== "all")
  ).toString();
  return request(`/orders${qs ? `?${qs}` : ""}`);
};

export const createOrder = (listing_id, quantity) =>
  request("/orders", { method: "POST", body: { listing_id, quantity } });

export const updateOrderStatus = (id, status) =>
  request(`/orders/${id}/status`, { method: "PATCH", body: { status } });

/* PRICES */
export const getPrices = (params = {}) => {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== "" && v !== "all")
  ).toString();
  return request(`/prices${qs ? `?${qs}` : ""}`, { auth: false });
};

export const getLatestPrice = (variety, market) => {
  const qs = new URLSearchParams({ variety, ...(market ? { market } : {}) }).toString();
  return request(`/prices/latest?${qs}`, { auth: false });
};

/* PROFILE */
export const getProfile = () => request("/profile");
export const updateProfile = (payload) =>
  request("/profile", { method: "PATCH", body: payload });

/* RECOMMENDATIONS — stub endpoint, wire the ML service when ready */
export const getRecommendation = (farmData) =>
  request("/recommendations", { method: "POST", body: farmData });

/* ADMIN */
export const adminListUsers = (role) =>
  request(`/admin/users${role && role !== "all" ? `?role=${role}` : ""}`);
export const adminVerifyUser = (id) =>
  request(`/admin/users/${id}/verify`, { method: "PATCH" });
export const adminListPrices = () => request("/admin/prices");
export const adminCreatePrice = (payload) =>
  request("/admin/prices", { method: "POST", body: payload });
export const adminDeletePrice = (id) =>
  request(`/admin/prices/${id}`, { method: "DELETE" });
export const adminListReports = () => request("/admin/reports");
export const getOrder = (id) => request(`/orders/${id}`);

export const setFulfillment = (id, payload) =>
  request(`/orders/${id}/fulfillment`, { method: "PATCH", body: payload });

export const sellerAdvance = (id, action) =>
  request(`/orders/${id}/seller-advance`, { method: "PATCH", body: { action } });

export const buyerConfirm = (id, pickup_code) =>
  request(`/orders/${id}/confirm-receipt`, { method: "PATCH", body: { pickup_code } });
export const adminGetStats = () => request("/admin/stats");