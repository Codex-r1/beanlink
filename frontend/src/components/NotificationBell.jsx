import { useCallback, useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";

/* ============================================================================
   In-app order alerts. No new table and no new endpoint.
   Alerts are worked out from the orders your app already loads:
     - sellers (farmers, suppliers): "New order received" while an order is pending
     - buyers: "Order update" when an order moves past pending
   "Read" state is kept in this browser's localStorage, so it is per device.
   ========================================================================== */

const POLL_MS = 45000;   // refresh every 45 seconds while the tab is visible
const RECENT_DAYS = 14;  // ignore orders older than this
const storageKey = (userId) => `beanlink_order_alerts_${userId}`;

function readSeen(userId) {
  try { return JSON.parse(localStorage.getItem(storageKey(userId))) || {}; }
  catch { return {}; }
}
function writeSeen(userId, map) {
  try { localStorage.setItem(storageKey(userId), JSON.stringify(map)); }
  catch { /* storage blocked or full: alerts just stay unread */ }
}

// Adjust these field names to match what your orders API returns.
function normalise(o, user) {
  return {
    id: o.id ?? o.txn_id,
    status: String(o.status || "").toLowerCase(),
    created: o.created_at ?? o.date,
    isSeller: o.seller_id ? o.seller_id === user.user_id : o.role === "seller",
    item: o.item ?? o.title ?? "your order",
    who: o.counterparty ?? o.counterparty_name ?? "",
  };
}

function deriveAlerts(orders, user, seen) {
  const cutoff = Date.now() - RECENT_DAYS * 86400000;
  const alerts = [];
  for (const raw of orders) {
    const o = normalise(raw, user);
    if (o.id == null || !o.status) continue;
    const time = new Date(o.created).getTime();
    if (!Number.isNaN(time) && time < cutoff) continue;
    const unread = seen[o.id] !== o.status;

    if (o.isSeller) {
      if (o.status !== "pending") continue; // only orders waiting on the seller
      alerts.push({
        key: `${o.id}:${o.status}`, id: o.id, status: o.status, unread, time,
        title: "New order received",
        body: `${o.item}${o.who ? ` from ${o.who}` : ""}`,
      });
    } else {
      if (o.status === "pending") continue; // buyers placed it themselves
      alerts.push({
        key: `${o.id}:${o.status}`, id: o.id, status: o.status, unread, time,
        title: "Order update",
        body: `${o.item} is now ${o.status}`,
      });
    }
  }
  return alerts.sort((a, b) => (b.time || 0) - (a.time || 0));
}

function timeAgo(ms) {
  if (!ms || Number.isNaN(ms)) return "";
  const m = Math.floor((Date.now() - ms) / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.floor(h / 24);
  return `${d} day${d > 1 ? "s" : ""} ago`;
}

function useOrderAlerts(user, loadOrders) {
  const [alerts, setAlerts] = useState([]);
  const loadRef = useRef(loadOrders);
  loadRef.current = loadOrders; // so an inline function from the parent can't retrigger the polling

  const userId = user?.user_id;

  const refresh = useCallback(async () => {
    if (!userId) return;
    try {
      const orders = await loadRef.current();
      setAlerts(deriveAlerts(Array.isArray(orders) ? orders : [], { user_id: userId }, readSeen(userId)));
    } catch {
      // keep the last list if a request fails
    }
  }, [userId]);

  useEffect(() => {
    refresh();
    const t = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, POLL_MS);
    return () => clearInterval(t);
  }, [refresh]);

  const markRead = (list) => {
    if (!userId) return;
    const seen = readSeen(userId);
    list.forEach((a) => { seen[a.id] = a.status; });
    writeSeen(userId, seen);
    const ids = new Set(list.map((a) => a.key));
    setAlerts((prev) => prev.map((a) => (ids.has(a.key) ? { ...a, unread: false } : a)));
  };

  return { alerts, unreadCount: alerts.filter((a) => a.unread).length, markRead };
}

export default function NotificationBell({ user, loadOrders, goto }) {
  const { alerts, unreadCount, markRead } = useOrderAlerts(user, loadOrders);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const shown = alerts.slice(0, 10);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className="relative p-1"
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        style={{ background: "transparent", border: "none", cursor: "pointer" }}
      >
        <Bell size={19} style={{ color: "var(--text-muted)" }} />
        {unreadCount > 0 && (
          <span
            className="absolute -top-1 -right-1 h-4 px-1 rounded-full text-[10px] font-bold flex items-center justify-center"
            style={{ minWidth: 16, background: "var(--amber)", color: "#fff" }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="agri-card z-30 fixed left-2 right-2 top-14 sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-80"
          style={{ boxShadow: "0 8px 24px rgba(26, 29, 26, 0.12)" }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
            <span className="font-semibold text-sm">Notifications</span>
            {unreadCount > 0 && (
              <button
                type="button"
                className="text-xs font-semibold underline"
                style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--primary)" }}
                onClick={() => markRead(alerts)}
              >
                Mark all as read
              </button>
            )}
          </div>

          {shown.length === 0 ? (
            <p className="px-4 py-6 text-sm text-center" style={{ color: "var(--text-muted)" }}>
              No new notifications.
            </p>
          ) : (
            <div className="overflow-y-auto" style={{ maxHeight: 360 }}>
              {shown.map((a) => (
                <button
                  key={a.key}
                  type="button"
                  className="w-full text-left px-4 py-3 border-b flex gap-3"
                  style={{
                    borderColor: "var(--border)",
                    background: a.unread ? "var(--primary-soft)" : "transparent",
                    cursor: "pointer",
                    color: "var(--text)",
                  }}
                  onClick={() => {
                    markRead([a]);
                    setOpen(false);
                    goto("orders"); // must match a case in renderPage
                  }}
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold">{a.title}</div>
                    <div className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{a.body}</div>
                    <div className="text-xs mt-0.5" style={{ color: "var(--text-faint)" }}>{timeAgo(a.time)}</div>
                  </div>
                  {a.unread && (
                    <span aria-hidden="true" className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: "var(--primary)" }} />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}