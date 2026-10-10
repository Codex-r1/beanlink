export const fmtKES = (n) =>
  `KES ${Number(n || 0).toLocaleString("en-KE")}`;

export const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" }) : "—";

export const statusTone = (status) => {
  const s = (status || "").toLowerCase();
  return {
    pending: "amber", confirmed: "blue", processing: "amber", completed: "green",
    cancelled: "red", active: "green", sold: "gray", draft: "amber",
    paused: "amber", unavailable: "red", verified: "green",
  }[s] || "gray";
};