import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { getReportNotifications } from "../api";

const POLL_MS = 45000;
const RECENT_DAYS = 14;
const storageKey = (userId) => `beanlink_order_alerts_${userId}`;

function readSeen(userId) {
  try {
    return JSON.parse(localStorage.getItem(storageKey(userId))) || {};
  } catch {
    return {};
  }
}

function writeSeen(userId, seen) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(seen));
  } catch {
    // The current view can still mark alerts as read.
  }
}

function deriveOrderAlerts(orders, userId, seen) {
  const cutoff = Date.now() - RECENT_DAYS * 86400000;
  const alerts = [];

  for (const order of orders) {
    const id = order.id ?? order.txn_id;
    const status = String(order.status || "").toLowerCase();
    const time = new Date(order.created_at ?? order.date).getTime();
    const isSeller = order.seller_id
      ? String(order.seller_id) === String(userId)
      : order.role === "seller";

    if (id == null || !status || time < cutoff) continue;
    if (isSeller ? status !== "pending" : status === "pending") continue;

    const item = order.item ?? order.title ?? "your order";
    const counterparty = order.counterparty ?? order.counterparty_name ?? "";

    alerts.push({
      id,
      key: `order:${id}:${status}`,
      status,
      unread: seen[id] !== status,
      time,
      title: isSeller ? "New order received" : "Order update",
      body: isSeller
        ? `${item}${counterparty ? ` from ${counterparty}` : ""}`
        : `${item} is now ${status}`,
      page: "orders",
    });
  }

  return alerts;
}

function deriveReportAlerts(reports, isAdmin, seen) {
  return reports.map((report) => {
    const id = `report:${report.report_id}`;
    const status = isAdmin ? "submitted" : report.status;

    return {
      id,
      key: `${id}:${status}`,
      status,
      unread: seen[id] !== status,
      time: new Date(
        isAdmin ? report.created_at : report.resolved_at
      ).getTime(),
      title: isAdmin
        ? `New report #${report.report_id}`
        : `Report #${report.report_id} ${status}`,
      body: isAdmin
        ? report.reason
        : report.decision_reason
          ? `Decision reason: ${report.decision_reason}`
          : `Reported issue: ${report.reason}`,
      page: isAdmin ? "admin-reports" : null,
    };
  });
}

function timeAgo(ms) {
  if (!Number.isFinite(ms)) return "";

  const minutes = Math.floor((Date.now() - ms) / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;

  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
}

function useAlerts(user, loadOrders) {
  const [orderAlerts, setOrderAlerts] = useState([]);
  const [reportAlerts, setReportAlerts] = useState([]);
  const loadOrdersRef = useRef(loadOrders);
  const seenRef = useRef({});
  const userId = user?.user_id;
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    loadOrdersRef.current = loadOrders;
  }, [loadOrders]);

  useEffect(() => {
    setOrderAlerts([]);
    setReportAlerts([]);
    if (!userId) return;

    seenRef.current = readSeen(userId);
    let cancelled = false;
    let refreshing = false;

    async function refresh() {
      if (refreshing) return;
      refreshing = true;

      try {
        const [ordersResult, reportsResult] = await Promise.allSettled([
          Promise.resolve().then(() => loadOrdersRef.current()),
          Promise.resolve().then(() => getReportNotifications()),
        ]);

        if (cancelled) return;

        if (ordersResult.status === "fulfilled") {
          const orders = Array.isArray(ordersResult.value)
            ? ordersResult.value
            : [];
          setOrderAlerts(deriveOrderAlerts(orders, userId, seenRef.current));
        }

        if (reportsResult.status === "fulfilled") {
          const reports = reportsResult.value?.reports;
          setReportAlerts(
            deriveReportAlerts(
              Array.isArray(reports) ? reports : [],
              isAdmin,
              seenRef.current
            )
          );
        }
      } finally {
        refreshing = false;
      }
    }

    function refreshWhenVisible() {
      if (document.visibilityState === "visible") refresh();
    }

    refresh();
    const timer = setInterval(refreshWhenVisible, POLL_MS);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [userId, isAdmin]);

  const alerts = [...orderAlerts, ...reportAlerts].sort(
    (a, b) => (b.time || 0) - (a.time || 0)
  );

  function markRead(list) {
    if (!userId) return;

    const seen = { ...readSeen(userId), ...seenRef.current };
    for (const alert of list) {
      seen[alert.id] = alert.status;
    }
    seenRef.current = seen;
    writeSeen(userId, seen);

    const keys = new Set(list.map((alert) => alert.key));
    const update = (previous) =>
      previous.map((alert) =>
        keys.has(alert.key) ? { ...alert, unread: false } : alert
      );

    setOrderAlerts(update);
    setReportAlerts(update);
  }

  return {
    alerts,
    unreadCount: alerts.filter((alert) => alert.unread).length,
    markRead,
  };
}

export default function NotificationBell({ user, loadOrders, goto }) {
  const { alerts, unreadCount, markRead } = useAlerts(user, loadOrders);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;

    function handleOutsideClick(event) {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function selectAlert(alert) {
    markRead([alert]);
    if (!alert.page) return;

    setOpen(false);
    goto(alert.page);
  }

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        className="relative p-1"
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
        aria-expanded={open}
        onClick={() => setOpen((previous) => !previous)}
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
          <div
            className="flex items-center justify-between px-4 py-3 border-b"
            style={{ borderColor: "var(--border)" }}
          >
            <span className="font-semibold text-sm">Notifications</span>
            {unreadCount > 0 && (
              <button
                type="button"
                className="text-xs font-semibold underline"
                style={{ color: "var(--primary)" }}
                onClick={() => markRead(alerts)}
              >
                Mark all as read
              </button>
            )}
          </div>

          {alerts.length === 0 ? (
            <p
              className="px-4 py-6 text-sm text-center"
              style={{ color: "var(--text-muted)" }}
            >
              No notifications yet.
            </p>
          ) : (
            <div className="overflow-y-auto" style={{ maxHeight: 360 }}>
              {alerts.map((alert) => (
                <button
                  key={alert.key}
                  type="button"
                  className="w-full text-left px-4 py-3 border-b flex gap-3"
                  style={{
                    borderColor: "var(--border)",
                    background: alert.unread ? "var(--primary-soft)" : "transparent",
                    color: "var(--text)",
                  }}
                  onClick={() => selectAlert(alert)}
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold">{alert.title}</div>
                    <div
                      className={
                        alert.page === null
                          ? "text-xs whitespace-pre-wrap break-words"
                          : "text-xs truncate"
                      }
                      style={{ color: "var(--text-muted)" }}
                    >
                      {alert.body}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: "var(--text-faint)" }}>
                      {timeAgo(alert.time)}
                    </div>
                  </div>
                  {alert.unread && (
                    <span
                      aria-hidden="true"
                      className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                      style={{ background: "var(--primary)" }}
                    />
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