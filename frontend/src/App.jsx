import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Home, ShoppingBag, Sprout, Package, TrendingUp, ClipboardList, Receipt,
  User, Search, Bell, Menu, X, ChevronRight, ChevronLeft,
  MapPin, Calendar, CheckCircle2, Clock, AlertCircle, Plus,
  ArrowLeft, LogOut, Users, ShieldCheck, Flag, Leaf, Wheat,
  Beaker, Tractor, ShieldAlert, PauseCircle, Trash2, Pencil, Info,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  registerUser, loginUser,
  getDashboardSummary, getDashboardActivity,
  getMyListings, getMarketplace, getListing,
  createListing, updateListingStatus, deleteListing,
  getOrders, createOrder, updateOrderStatus,
  getPrices, getLatestPrice,
  getProfile, updateProfile,
  getRecommendation,
  adminListUsers, adminVerifyUser,
  adminListPrices, adminCreatePrice,
  adminListReports,
  initiateMpesaPush, getPaymentStatus
} from "./api";

/* ============================================================================
   DESIGN TOKENS
   ========================================================================== */
const GlobalStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');

    .agri-root {
      --bg: #F8F8F5;
      --surface: #FFFFFF;
      --surface-alt: #F2F1EA;
      --border: #E1DED4;
      --border-strong: #C9C5B7;
      --text: #1A1D1A;
      --text-muted: #5A5D57;
      --text-faint: #8A8D85;
      --primary: #1E3A2B;
      --primary-dark: #142619;
      --primary-hover: #2A4A38;
      --primary-soft: #E8EEE8;
      --primary-soft-border: #C5D2C4;
      --amber: #8A5A0B;
      --amber-soft: #F5EEDC;
      --amber-border: #E0CC97;
      --blue: #2F4A6B;
      --blue-soft: #E7EDF4;
      --blue-border: #BFCDDD;
      --red: #963A3A;
      --red-soft: #F6E9E8;
      --red-border: #E0BFBD;
      font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif;
      background: var(--bg);
      color: var(--text);
      -webkit-font-smoothing: antialiased;
    }
    .agri-root .mono { font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace; }

    .agri-btn {
      display: inline-flex; align-items: center; justify-content: center; gap: 8px;
      padding: 10px 18px; border-radius: 4px; font-size: 14px; font-weight: 600;
      border: 1px solid transparent; cursor: pointer;
      transition: background 0.12s ease, border-color 0.12s ease, color 0.12s ease;
      white-space: nowrap;
    }
    .agri-btn:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
    .agri-btn-primary { background: var(--primary); color: #fff; border-color: var(--primary); }
    .agri-btn-primary:hover { background: var(--primary-hover); border-color: var(--primary-hover); }
    .agri-btn-secondary { background: var(--surface); color: var(--text); border-color: var(--border-strong); }
    .agri-btn-secondary:hover { background: var(--surface-alt); border-color: var(--primary); color: var(--primary); }
    .agri-btn-ghost { background: transparent; color: var(--text-muted); border-color: transparent; }
    .agri-btn-ghost:hover { background: var(--surface-alt); color: var(--text); }
    .agri-btn-danger { background: var(--surface); color: var(--red); border-color: var(--red-border); }
    .agri-btn-danger:hover { background: var(--red-soft); }
    .agri-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .agri-btn-sm { padding: 6px 12px; font-size: 13px; }
    .agri-btn-block { width: 100%; }

    .agri-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 6px;
      box-shadow: 0 1px 2px rgba(26, 29, 26, 0.04);
    }

    .agri-input, .agri-select, .agri-textarea {
      width: 100%; border: 1px solid var(--border-strong); border-radius: 4px;
      padding: 9px 11px; font-size: 14px; font-family: inherit; color: var(--text);
      background: var(--surface); transition: border-color 0.12s, box-shadow 0.12s;
    }
    .agri-input:focus, .agri-select:focus, .agri-textarea:focus {
      outline: none; border-color: var(--primary);
      box-shadow: 0 0 0 2px var(--primary-soft-border);
    }
    .agri-label { font-size: 13px; font-weight: 600; color: var(--text); margin-bottom: 6px; display: block; }
    .agri-hint { font-size: 12.5px; color: var(--text-faint); margin-top: 4px; }

    .agri-badge {
      display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600;
      padding: 3px 8px 3px 7px; border-radius: 3px; border: 1px solid transparent;
      border-left-width: 3px;
    }
    .agri-badge-green { background: var(--primary-soft); border-color: var(--primary-soft-border); border-left-color: var(--primary); color: var(--primary-dark); }
    .agri-badge-amber { background: var(--amber-soft); border-color: var(--amber-border); border-left-color: var(--amber); color: var(--amber); }
    .agri-badge-blue { background: var(--blue-soft); border-color: var(--blue-border); border-left-color: var(--blue); color: var(--blue); }
    .agri-badge-red { background: var(--red-soft); border-color: var(--red-border); border-left-color: var(--red); color: var(--red); }
    .agri-badge-gray { background: var(--surface-alt); border-color: var(--border); border-left-color: var(--border-strong); color: var(--text-muted); }

    .agri-nav-link {
      display: flex; align-items: center; gap: 12px; padding: 9px 14px; border-radius: 4px;
      font-size: 14px; font-weight: 500; color: var(--text-muted); cursor: pointer;
      border-left: 3px solid transparent; transition: background 0.12s, color 0.12s;
    }
    .agri-nav-link:hover { background: var(--surface-alt); color: var(--text); }
    .agri-nav-link.active {
      background: var(--primary-soft); color: var(--primary-dark);
      border-left-color: var(--primary); font-weight: 600;
    }

    .agri-table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
    .agri-table th {
      text-align: left; padding: 11px 14px; font-weight: 600; color: var(--text-muted);
      border-bottom: 1px solid var(--border); white-space: nowrap; font-size: 12px;
      text-transform: uppercase; letter-spacing: 0.04em; background: var(--surface-alt);
    }
    .agri-table td { padding: 13px 14px; border-bottom: 1px solid var(--border); vertical-align: middle; }
    .agri-table tr:last-child td { border-bottom: none; }
    .agri-table tbody tr:hover td { background: #FBFBF8; }
    .agri-table-wrap { overflow-x: auto; }

    .agri-step {
      width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center;
      justify-content: center; font-size: 12.5px; font-weight: 700;
      border: 1.5px solid var(--border-strong); color: var(--text-faint);
      background: var(--surface); flex-shrink: 0;
    }
    .agri-step.active { border-color: var(--primary); background: var(--primary); color: #fff; }
    .agri-step.done { border-color: var(--primary); background: var(--primary-soft); color: var(--primary-dark); }

    .agri-bar-track { height: 8px; background: var(--surface-alt); border-radius: 3px; overflow: hidden; }
    .agri-bar-fill { height: 100%; background: var(--primary); border-radius: 3px; }

    a.agri-plain { text-decoration: none; color: inherit; }
    .agri-scroll::-webkit-scrollbar { height: 6px; width: 6px; }
    .agri-scroll::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius: 3px; }

    .agri-stat {
      background: var(--surface);
      border: 1px solid var(--border);
      border-left: 3px solid var(--primary);
      border-radius: 6px;
      box-shadow: 0 1px 2px rgba(26, 29, 26, 0.04);
    }

    .agri-feature {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 6px;
      transition: border-color 0.12s ease;
    }
    .agri-feature:hover { border-color: var(--primary-soft-border); }

    @keyframes agri-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.55; } }
    .agri-skel { background: var(--surface-alt); border-radius: 4px; animation: agri-pulse 1.4s ease-in-out infinite; }

    @keyframes agri-toast-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes agri-modal-in { from { opacity: 0; transform: translateY(6px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
  `}</style>
);

/* ============================================================================
   DOMAIN — bean varieties with KALRO mapping
   ========================================================================== */
const BEAN_VARIETIES = [
  { value: "Kenya Umoja",  market: "Rosecoco",              code: "KAT B1", type: "Red mottled bush bean",             label: "Kenya Umoja (Rosecoco type)" },
  { value: "Kenya Tamu",   market: "Speckled / Sugar",      code: "MAC 34", type: "Red / beige speckled climbing bean", label: "Kenya Tamu (Speckled / Sugar type)" },
  { value: "Kenya Mavuno", market: "Rosecoco / Mottled",    code: "MAC 64", type: "Dark red mottled climbing bean",     label: "Kenya Mavuno (Rosecoco / Mottled type)" },
];
const beanLabel = (value) => BEAN_VARIETIES.find((v) => v.value === value)?.label || value;
const beanShort = (value) => BEAN_VARIETIES.find((v) => v.value === value)?.market || value;

const INPUT_CATEGORIES = [
  { id: "seed",            label: "Certified Seeds",   icon: Sprout },
  { id: "fertilizer",      label: "Fertilizers",       icon: Beaker },
  { id: "soil_amendment",  label: "Soil Amendments",   icon: Leaf },
  { id: "crop_protection", label: "Crop Protection",   icon: ShieldAlert },
  { id: "equipment",       label: "Farm Equipment",    icon: Tractor },
  { id: "other_input",     label: "Other Inputs",      icon: Package },
];

/* ============================================================================
   TOAST SYSTEM
   ========================================================================== */
const ToastCtx = React.createContext({ push: () => {} });
const useToast = () => React.useContext(ToastCtx);

function ToastHost({ children }) {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((msg, tone = "green") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, msg, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);
  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div className="fixed bottom-24 md:bottom-6 right-4 md:right-6 z-50 flex flex-col gap-2 pointer-events-none" aria-live="polite" aria-atomic="true">
        {toasts.map((t) => {
          const accent = t.tone === "green" ? "var(--primary)" : t.tone === "red" ? "var(--red)" : "var(--amber)";
          const Icon = t.tone === "green" ? CheckCircle2 : AlertCircle;
          return (
            <div key={t.id} className="agri-card px-4 py-3 text-sm font-medium flex items-center gap-2"
              style={{ borderLeft: `3px solid ${accent}`, minWidth: 260, maxWidth: 340, animation: "agri-toast-in 180ms ease-out" }} role="status">
              <Icon size={15} style={{ color: accent, flexShrink: 0 }} />
              <span style={{ color: "var(--text)" }}>{t.msg}</span>
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
}
/* ============================================================================
   PAYMENT MODAL — phone input → STK push → poll → confirm
   ========================================================================== */
function PaymentModal({ open, listing, quantity, onClose, onSuccess, goto }) {
  const { push } = useToast();
  const [stage, setStage] = useState("phone"); // phone | pushing | waiting | success | failed
  const [phone, setPhone] = useState("");
  const [receipt, setReceipt] = useState(null);
  const [error, setError] = useState("");
  const [orderId, setOrderId] = useState(null);
  const pollRef = React.useRef(null);

  // Reset on open
  useEffect(() => {
    if (open) {
      setStage("phone");
      setPhone("");
      setReceipt(null);
      setError("");
      setOrderId(null);
    }
  }, [open]);

  // Cleanup poller on unmount / close
  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  if (!open) return null;

  const validatePhone = (v) => /^254\d{9}$/.test(v) || /^0\d{9}$/.test(v);
  const normalisePhone = (v) => (v.startsWith("0") ? `254${v.slice(1)}` : v);

  const submit = async () => {
    if (!validatePhone(phone)) {
      setError("Enter a valid M-Pesa number, e.g. 0712345678 or 254712345678");
      return;
    }
    setError("");
    setStage("pushing");

    try {
      // 1. Create the order
      const order = await createOrder(listing.listing_id, Number(quantity));
      const txnId = order.order?.txn_id || order.txn_id;
      setOrderId(txnId);

      // 2. Initiate STK push
      await initiateMpesaPush(txnId, normalisePhone(phone));

      // 3. Poll for status
      setStage("waiting");
      let elapsed = 0;
      pollRef.current = setInterval(async () => {
        elapsed += 3;
        try {
          const status = await getPaymentStatus(txnId);
          if (status.payment_status === "paid") {
            clearInterval(pollRef.current);
            setReceipt(status.mpesa_receipt);
            setStage("success");
          } else if (status.payment_status === "failed") {
            clearInterval(pollRef.current);
            setStage("failed");
            setError("Payment was not completed. You can try again.");
          } else if (elapsed > 90) {
            clearInterval(pollRef.current);
            setStage("failed");
            setError("Timed out waiting for confirmation. Check your M-Pesa messages.");
          }
        } catch (err) {
          // keep polling on transient errors
        }
      }, 3000);
    } catch (err) {
      setStage("phone");
      setError(err.message || "Could not start payment. Please try again.");
    }
  };

  const close = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    onClose();
  };

  const done = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    onSuccess();
    onClose();
  };

  return (
    <div
      className="agri-root flex items-center justify-center p-4"
      style={{ position: "fixed", inset: 0, zIndex: 10000 }}
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={close}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(15, 25, 18, 0.65)",
        }}
      />
      <div
        className="agri-card relative w-full max-w-md"
        style={{
          background: "#FFFFFF",
          boxShadow: "0 12px 40px rgba(15, 25, 18, 0.28)",
          border: "1px solid var(--border-strong)",
        }}
      >
        <div className="p-5">
          <div className="flex items-start gap-3 mb-4">
            <div
              className="w-10 h-10 rounded flex items-center justify-center shrink-0"
              style={{ background: "var(--primary-soft)" }}
            >
              <Receipt size={20} style={{ color: "var(--primary)" }} />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-base mb-0.5">
                {stage === "phone" && "Pay with M-Pesa"}
                {stage === "pushing" && "Sending request…"}
                {stage === "waiting" && "Waiting for you to confirm"}
                {stage === "success" && "Payment confirmed"}
                {stage === "failed" && "Payment failed"}
              </h3>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                {listing.title || beanLabel(listing.variety)} ·{" "}
                {fmtKES(listing.price_per_unit)} × {quantity}
              </p>
            </div>
          </div>

          {stage === "phone" && (
            <div className="space-y-3">
              <Field
                label="M-Pesa phone number"
                hint="You will receive a prompt on your phone to enter your M-Pesa PIN."
              >
                <input
                  className="agri-input"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0712 345 678"
                  autoFocus
                />
              </Field>
              {error && (
                <div
                  className="text-sm p-2.5 rounded"
                  style={{
                    background: "var(--red-soft)",
                    color: "var(--red)",
                    border: "1px solid var(--red-border)",
                  }}
                >
                  {error}
                </div>
              )}
              <div className="p-3 rounded text-xs"
                   style={{ background: "var(--surface-alt)", color: "var(--text-muted)" }}>
                Total to pay:{" "}
                <strong style={{ color: "var(--text)" }}>
                  {fmtKES(Number(listing.price_per_unit) * Number(quantity))}
                </strong>
              </div>
            </div>
          )}

          {stage === "pushing" && (
            <div className="space-y-3">
              <div className="agri-skel h-4 w-3/4" />
              <div className="agri-skel h-4 w-1/2" />
            </div>
          )}

          {stage === "waiting" && (
            <div className="space-y-3 text-sm" style={{ color: "var(--text-muted)" }}>
              <p>
                Check your phone. Enter your M-Pesa PIN on the prompt that just
                appeared.
              </p>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-2 h-2 rounded-full" style={{ background: "var(--amber)" }} />
                <span>Waiting for confirmation… this can take up to 30 seconds.</span>
              </div>
            </div>
          )}

          {stage === "success" && (
            <div className="space-y-3 text-sm">
              <div
                className="p-3 rounded flex items-start gap-2"
                style={{
                  background: "var(--primary-soft)",
                  border: "1px solid var(--primary-soft-border)",
                  color: "var(--primary-dark)",
                }}
              >
                <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold mb-0.5">Order confirmed</div>
                  <div className="text-xs">
                    Receipt: <span className="mono">{receipt}</span>
                  </div>
                </div>
              </div>
              <p style={{ color: "var(--text-muted)" }}>
                The seller has been notified. You can track this order in Orders.
              </p>
            </div>
          )}

          {stage === "failed" && (
            <div className="text-sm" style={{ color: "var(--text-muted)" }}>
              {error}
            </div>
          )}
        </div>

        <div
          className="px-5 py-3 border-t flex justify-end gap-2"
          style={{ borderColor: "var(--border)", background: "#FBFBF8" }}
        >
          {stage === "phone" && (
            <>
              <Button variant="secondary" size="sm" onClick={close}>Cancel</Button>
              <Button size="sm" onClick={submit}>Send STK push</Button>
            </>
          )}
          {stage === "pushing" && (
            <Button variant="secondary" size="sm" disabled>Please wait…</Button>
          )}
          {stage === "waiting" && (
            <Button variant="secondary" size="sm" onClick={close}>
              I'll confirm later
            </Button>
          )}
          {stage === "success" && (
            <Button size="sm" onClick={done}>View my orders</Button>
          )}
          {stage === "failed" && (
            <>
              <Button variant="secondary" size="sm" onClick={close}>Close</Button>
              <Button size="sm" onClick={() => setStage("phone")}>Try again</Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
/* ============================================================================
   MODAL SYSTEM — success/error dialogs and confirm prompts
   ========================================================================== */
const ModalCtx = React.createContext({ open: () => {}, confirm: async () => false });
const useModal = () => React.useContext(ModalCtx);

function ModalHost({ children }) {
  const [modal, setModal] = useState(null);

  const open = useCallback((opts) => {
    setModal({
      id: Math.random().toString(36).slice(2),
      tone: opts.tone || "info",
      title: opts.title || "",
      body: opts.body || "",
      confirmLabel: opts.confirmLabel || "OK",
      cancelLabel: opts.cancelLabel || "Cancel",
      hasCancel: !!opts.hasCancel,
      resolve: opts.resolve || null,
    });
  }, []);

  const confirm = useCallback(
    (opts) => new Promise((resolve) => {
      setModal({
        id: Math.random().toString(36).slice(2),
        tone: opts.tone || "info",
        title: opts.title || "Are you sure?",
        body: opts.body || "",
        confirmLabel: opts.confirmLabel || "Confirm",
        cancelLabel: opts.cancelLabel || "Cancel",
        hasCancel: true,
        resolve,
      });
    }),
    []
  );

  const close = useCallback((result) => {
    setModal((m) => {
      if (m?.resolve) m.resolve(result);
      return null;
    });
  }, []);

  useEffect(() => {
    if (!modal) return;
    const onKey = (e) => { if (e.key === "Escape") close(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modal, close]);

  const toneStyles = {
    success: { accent: "var(--primary)", Icon: CheckCircle2 },
    error:   { accent: "var(--red)",     Icon: AlertCircle },
    warn:    { accent: "var(--amber)",   Icon: AlertCircle },
    info:    { accent: "var(--primary)", Icon: Info },
  };

 return (
  <ModalCtx.Provider value={{ open, confirm }}>
    {children}
    {modal && (
      <div
        className="agri-root flex items-center justify-center p-4"
        style={{
          position: "fixed",
          top: 0, left: 0, right: 0, bottom: 0,
          zIndex: 9999,
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Backdrop */}
        <div
          onClick={() => close(false)}
          style={{
            position: "absolute",
            top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(15, 25, 18, 0.65)",
          }}
        />

        {/* Card */}
        <div
          className="agri-card relative w-full max-w-md"
          style={{
            animation: "agri-modal-in 160ms ease-out",
            background: "#FFFFFF",
            boxShadow: "0 12px 40px rgba(15, 25, 18, 0.28), 0 2px 8px rgba(15, 25, 18, 0.10)",
            border: "1px solid var(--border-strong)",
          }}
        >
          {(() => {
            const cfg = toneStyles[modal.tone] || toneStyles.info;
            const Ico = cfg.Icon;
            return (
              <>
                <div className="p-5">
                  <div className="flex items-start gap-3">
                    <div
                      className="w-9 h-9 rounded flex items-center justify-center shrink-0"
                      style={{ background: "var(--surface-alt)" }}
                    >
                      <Ico size={18} style={{ color: cfg.accent }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3
                        id="modal-title"
                        className="font-semibold text-base mb-1"
                        style={{ color: "var(--text)" }}
                      >
                        {modal.title}
                      </h3>
                      {modal.body && (
                        <p
                          className="text-sm"
                          style={{ color: "var(--text-muted)", lineHeight: 1.5 }}
                        >
                          {modal.body}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => close(false)}
                      aria-label="Close"
                      className="shrink-0 -mt-1 -mr-1 p-1 rounded hover:bg-[var(--surface-alt)]"
                    >
                      <X size={16} style={{ color: "var(--text-muted)" }} />
                    </button>
                  </div>
                </div>

                <div
                  className="px-5 py-3 border-t flex justify-end gap-2"
                  style={{ borderColor: "var(--border)", background: "#fff" }}
                >
                  {modal.hasCancel && (
                    <Button variant="secondary" size="sm" onClick={() => close(false)}>
                      {modal.cancelLabel}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant={modal.tone === "error" ? "danger" : "primary"}
                    onClick={() => close(true)}
                  >
                    {modal.confirmLabel}
                  </Button>
                </div>
              </>
            );
          })()}
        </div>
      </div>
    )}
   </ModalCtx.Provider>
  );
}
/* ============================================================================
   COUNT-UP
   ========================================================================== */
function CountUp({ to, duration = 1200 }) {
  const [n, setN] = useState(0);
  const ref = React.useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") { setN(to); return; }
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const start = performance.now();
      const tick = (t) => {
        const p = Math.min(1, (t - start) / duration);
        setN(Math.round(to * (1 - Math.pow(1 - p, 3))));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, [to, duration]);
  return <span ref={ref} className="mono">{n.toLocaleString("en-KE")}</span>;
}

/* ============================================================================
   HERO SLIDESHOW
   ========================================================================== */
const HERO_SLIDES = [
  { src: "annie-spratt-QYcSeY7vuZM-unsplash.jpg", alt: "Bean field in Kenya" },
  { src: "annie-spratt-GaLzDCnA5EI-unsplash.jpg", alt: "Farmer harvesting beans by hand" },
  { src: "Untitled design.jpg", alt: "Sorting dried beans" },
  { src: "kelly-sikkema-k1cpHnqBuMM-unsplash.jpg", alt: "Beans drying on tarps" },
];

function HeroSlideshow({ interval = 5000 }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const prefersReduced = useMemo(
    () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
    []
  );
  useEffect(() => {
    if (paused || prefersReduced || HERO_SLIDES.length < 2) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % HERO_SLIDES.length), interval);
    return () => clearInterval(id);
  }, [paused, prefersReduced, interval]);
  const prev = () => setIndex((i) => (i - 1 + HERO_SLIDES.length) % HERO_SLIDES.length);
  const next = () => setIndex((i) => (i + 1) % HERO_SLIDES.length);
  return (
    <div className="agri-card p-2" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="relative w-full h-72 rounded overflow-hidden bg-[var(--surface-alt)]">
        {HERO_SLIDES.map((s, i) => (
          <img key={s.src} src={s.src} alt={s.alt} loading={i === 0 ? "eager" : "lazy"}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ opacity: i === index ? 1 : 0, transition: prefersReduced ? "none" : "opacity 700ms ease-in-out" }} />
        ))}
        <button type="button" onClick={prev} aria-label="Previous slide"
          className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded opacity-0 hover:opacity-100 focus:opacity-100 transition-opacity"
          style={{ background: "rgba(20, 38, 25, 0.78)", color: "#fff" }}>
          <ChevronLeft size={18} />
        </button>
        <button type="button" onClick={next} aria-label="Next slide"
          className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded opacity-0 hover:opacity-100 focus:opacity-100 transition-opacity"
          style={{ background: "rgba(20, 38, 25, 0.78)", color: "#fff" }}>
          <ChevronRight size={18} />
        </button>
        <div className="absolute right-3 bottom-3 flex items-center gap-1.5">
          {HERO_SLIDES.map((s, i) => (
            <button key={s.src} type="button" aria-label={`Go to slide ${i + 1}`} onClick={() => setIndex(i)}
              className="w-2 h-2 rounded-sm transition-colors"
              style={{ background: i === index ? "var(--primary)" : "rgba(255,255,255,0.65)", border: "1px solid rgba(20, 38, 25, 0.45)" }} />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   SHARED UI PRIMITIVES
   ========================================================================== */
const Badge = ({ tone = "gray", icon: Icon, children }) => (
  <span className={`agri-badge agri-badge-${tone}`}>{Icon && <Icon size={12} />}{children}</span>
);

const statusTone = (status) => {
  const s = (status || "").toLowerCase();
  return ({
    pending: "amber", confirmed: "blue", processing: "amber", completed: "green",
    cancelled: "red", active: "green", sold: "gray", draft: "amber",
    paused: "amber", unavailable: "red", verified: "green",
  }[s] || "gray");
};

const Button = ({ variant = "primary", size = "md", icon: Icon, className = "", ...props }) => (
  <button className={`agri-btn agri-btn-${variant} ${size === "sm" ? "agri-btn-sm" : ""} ${className}`} {...props}>
    {Icon && <Icon size={16} />}
    {props.children}
  </button>
);

const Field = ({ label, hint, children }) => (
  <div>
    <label className="agri-label">{label}</label>
    {children}
    {hint && <p className="agri-hint">{hint}</p>}
  </div>
);

const SectionHeading = ({ eyebrow, title, subtitle, action }) => (
  <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
    <div>
      {eyebrow && <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--primary)" }}>{eyebrow}</div>}
      <h2 className="text-xl font-bold" style={{ color: "var(--text)", letterSpacing: "-0.01em" }}>{title}</h2>
      {subtitle && <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>{subtitle}</p>}
    </div>
    {action}
  </div>
);

const StatCard = ({ label, value, icon: Icon, mono = true }) => (
  <div className="agri-stat p-4">
    <div className="flex items-center justify-between mb-2">
      <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-faint)" }}>{label}</span>
      {Icon && <Icon size={16} style={{ color: "var(--primary)" }} />}
    </div>
    <div className={`text-2xl font-bold ${mono ? "mono" : ""}`}>{value}</div>
  </div>
);

const fmtKES = (n) => `KES ${Number(n || 0).toLocaleString("en-KE")}`;
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" }) : "—");

const PageSkeleton = ({ rows = 3 }) => (
  <div className="space-y-3">
    <div className="agri-skel h-8 w-56" />
    <div className="agri-skel h-4 w-80" />
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-5">
      {Array.from({ length: rows }).map((_, i) => <div key={i} className="agri-skel h-40" />)}
    </div>
  </div>
);

const EmptyState = ({ icon: Icon = Package, title, body, action }) => (
  <div className="agri-card p-10 text-center max-w-md mx-auto">
    <Icon size={32} style={{ color: "var(--text-faint)" }} className="mx-auto mb-3" />
    <h3 className="font-semibold mb-1">{title}</h3>
    {body && <p className="text-sm mb-5" style={{ color: "var(--text-muted)" }}>{body}</p>}
    {action}
  </div>
);

/* ============================================================================
   GUEST HEADER
   ========================================================================== */
function GuestHeader({ page, goto, goLogin, goRegister }) {
  const links = [
    { id: "landing", label: "Home" },
    { id: "guest-produce", label: "Marketplace" },
    { id: "guest-prices", label: "Market Prices" },
    { id: "about", label: "About" },
  ];
  return (
    <header className="border-b sticky top-0 z-20" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
      <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between gap-4">
        <button className="flex items-center gap-2 font-bold text-lg" onClick={() => goto("landing")}>
          <div className="w-8 h-8 flex items-center justify-center rounded" style={{ background: "var(--primary)" }}>
            <Sprout size={18} color="#fff" />
          </div>
          Bean<span style={{ color: "var(--primary)" }}>Link</span>
        </button>
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium" style={{ color: "var(--text-muted)" }}>
          {links.map((l) => {
            const active = page === l.id;
            return (
              <button key={l.id} onClick={() => goto(l.id)} className="agri-plain relative py-1"
                style={{ color: active ? "var(--primary)" : "var(--text-muted)", fontWeight: active ? 700 : 500 }}>
                {l.label}
                {active && <span className="absolute left-0 right-0 -bottom-[18px] h-[2px]" style={{ background: "var(--primary)" }} />}
              </button>
            );
          })}
        </nav>
        <div className="flex items-center gap-3">
          <button className="text-sm font-semibold hidden sm:block" style={{ color: "var(--text)" }} onClick={goLogin}>Login</button>
          <Button size="sm" onClick={goRegister}>Register</Button>
        </div>
      </div>
      <div className="md:hidden border-t overflow-x-auto agri-scroll" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
        <div className="flex gap-1 px-3 py-2 min-w-max">
          {links.map((l) => {
            const active = page === l.id;
            return (
              <button key={l.id} onClick={() => goto(l.id)} className="px-3 py-1.5 text-sm font-semibold rounded"
                style={{
                  color: active ? "var(--primary-dark)" : "var(--text-muted)",
                  background: active ? "var(--primary-soft)" : "transparent",
                  border: active ? "1px solid var(--primary-soft-border)" : "1px solid transparent",
                }}>
                {l.label}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}

/* ============================================================================
   LANDING
   ========================================================================== */
function Landing({ goto, goLogin, goRegister }) {
  return (
    <div className="agri-root min-h-screen">
      <GuestHeader page="landing" goto={goto} goLogin={goLogin} goRegister={goRegister} />
      <section className="max-w-6xl mx-auto px-5 pt-14 pb-16 grid md:grid-cols-2 gap-10 items-center">
        <div>
          <h1 className="text-4xl md:text-[2.6rem] leading-tight font-bold mb-5" style={{ letterSpacing: "-0.02em" }}>
            Connecting Kenyan Bean Farmers to Better Markets and Better Decisions
          </h1>
          <p className="text-base mb-7" style={{ color: "var(--text-muted)" }}>
            Access farm inputs, receive data-driven recommendations, sell your bean produce, and stay informed about
            current agricultural market prices.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => goto("guest-produce")}>Explore Marketplace</Button>
            <Button variant="secondary" onClick={() => goto("guest-prices")}>View Market Prices</Button>
          </div>
        </div>
        <HeroSlideshow />
      </section>
      <section className="max-w-6xl mx-auto px-5 pb-14 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: ShoppingBag, title: "Access Farm Inputs", desc: "Find agricultural inputs from verified sellers near you." },
          { icon: Sprout, title: "Smart Input Recommendations", desc: "Get recommendations based on farm and soil conditions using a Random Forest model." },
          { icon: Wheat, title: "Sell Your Bean Produce", desc: "List harvested beans and connect with potential buyers." },
          { icon: TrendingUp, title: "View Market Prices", desc: "Access current and historical bean market prices from recorded market data." },
        ].map((f, i) => (
          <div key={i} className="agri-feature p-5">
            <div className="w-9 h-9 rounded flex items-center justify-center mb-3" style={{ background: "var(--primary-soft)" }}>
              <f.icon size={18} style={{ color: "var(--primary)" }} />
            </div>
            <h3 className="font-semibold mb-1.5">{f.title}</h3>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>{f.desc}</p>
          </div>
        ))}
      </section>
      <section className="max-w-6xl mx-auto px-5 pb-16">
        <div className="mb-5">
          <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--primary)" }}>
            By the numbers
          </div>
          <h2 className="text-xl font-bold" style={{ letterSpacing: "-0.01em" }}>Trusted across Kenya</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Registered farmers", to: 1284 },
            { label: "Active listings", to: 612 },
            { label: "Transactions completed", to: 4130 },
            { label: "Counties covered", to: 24 },
          ].map((s) => (
            <div key={s.label} className="agri-stat p-5">
              <div className="text-3xl font-bold mb-1"><CountUp to={s.to} /></div>
              <div className="text-xs uppercase tracking-wide" style={{ color: "var(--text-faint)" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>
      <footer className="border-t py-6 text-center text-xs" style={{ borderColor: "var(--border)", color: "var(--text-faint)" }}>
        BeanLink — Agricultural Marketplace and Decision Support for Smallholder Bean Farmers
      </footer>
    </div>
  );
}

/* ============================================================================
   ABOUT
   ========================================================================== */
function AboutPage({ goto, goLogin, goRegister }) {
  return (
    <div className="agri-root min-h-screen">
      <GuestHeader page="about" goto={goto} goLogin={goLogin} goRegister={goRegister} />
      <div className="max-w-3xl mx-auto px-5 py-14">
        <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "var(--primary)" }}>
          About BeanLink
        </div>
        <h1 className="text-3xl font-bold mb-4" style={{ letterSpacing: "-0.02em" }}>
          Built to connect smallholder bean farmers with better markets.
        </h1>
        <p className="text-base mb-4" style={{ color: "var(--text-muted)" }}>
          BeanLink is an agricultural marketplace and decision-support platform for
          smallholder bean farmers in Kenya. It brings together three tools that are
          usually separate: a marketplace for certified farm inputs, a marketplace for
          harvested produce, and a data-driven input recommendation engine.
        </p>
        <p className="text-base mb-8" style={{ color: "var(--text-muted)" }}>
          Recommendations are produced by a Random Forest model trained on soil, agro-
          ecological, and crop-history features. Recorded market prices come from
          trusted sources such as WFP and NCPB and are updated by platform administrators.
        </p>
        <div className="grid sm:grid-cols-3 gap-4 mb-10">
          {[
            { icon: Wheat, title: "Market access", desc: "Sell produce directly to verified buyers across Kenya." },
            { icon: Sprout, title: "Decision support", desc: "Input recommendations based on your farm's specific conditions." },
            { icon: TrendingUp, title: "Price transparency", desc: "Recorded bean prices you can check before you sell." },
          ].map((c, i) => (
            <div key={i} className="agri-feature p-5">
              <div className="w-9 h-9 rounded flex items-center justify-center mb-3" style={{ background: "var(--primary-soft)" }}>
                <c.icon size={18} style={{ color: "var(--primary)" }} />
              </div>
              <h3 className="font-semibold mb-1.5">{c.title}</h3>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>{c.desc}</p>
            </div>
          ))}
        </div>
        <div className="agri-card p-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="font-semibold mb-1">Ready to get started?</div>
            <div className="text-sm" style={{ color: "var(--text-muted)" }}>
              Create a free account as a farmer, buyer, or supplier.
            </div>
          </div>
          <Button onClick={goRegister}>Create Account</Button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   LOGIN / REGISTER
   ========================================================================== */
function Login({ goto, onLogin, mode, setMode }) {
  const [role, setRole] = useState("farmer");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [county, setCounty] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError("");
    setLoading(true);
    try {
      let data;
      if (mode === "login") {
        data = await loginUser({ email, password });
      } else {
        const safeRole = ["farmer", "buyer", "supplier"].includes(role) ? role : "farmer";
        data = await registerUser({
          full_name: fullName, email, password,
          role: safeRole, phone_number: phone, county,
        });
      }
      localStorage.setItem("beanlink_token", data.token);
      localStorage.setItem("beanlink_user", JSON.stringify(data.user));
      onLogin(data.user);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="agri-root min-h-screen flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm">
        <button className="flex items-center gap-1 text-sm mb-6" style={{ color: "var(--text-muted)" }} onClick={() => goto("landing")}>
          <ArrowLeft size={15} /> Back to home
        </button>
        <div className="agri-card p-6">
          <div className="flex items-center gap-2 font-bold text-lg mb-1">
            <div className="w-7 h-7 flex items-center justify-center rounded" style={{ background: "var(--primary)" }}>
              <Sprout size={15} color="#fff" />
            </div>
            BeanLink
          </div>
          <p className="text-sm mb-5" style={{ color: "var(--text-muted)" }}>
            {mode === "login" ? "Log in to your account." : "Create a new account."}
          </p>
          <div className="space-y-4">
            {mode === "register" && (
              <>
                <Field label="I am a...">
                  <div className="grid grid-cols-3 gap-2">
                    {["farmer", "buyer", "supplier"].map((r) => (
                      <button key={r} onClick={() => setRole(r)} className="agri-btn agri-btn-sm"
                        style={{
                          background: role === r ? "var(--primary-soft)" : "var(--surface)",
                          border: `1px solid ${role === r ? "var(--primary)" : "var(--border-strong)"}`,
                          color: role === r ? "var(--primary-dark)" : "var(--text-muted)",
                          textTransform: "capitalize", padding: "8px 4px",
                          fontWeight: role === r ? 700 : 600,
                        }}>
                        {r}
                      </button>
                    ))}
                  </div>
                </Field>
                <Field label="Full name">
                  <input className="agri-input" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. Josephine Mwangi" />
                </Field>
                <Field label="Phone number">
                  <input className="agri-input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. 0712 345 678" />
                </Field>
                <Field label="County">
                  <input className="agri-input" value={county} onChange={(e) => setCounty(e.target.value)} placeholder="e.g. Machakos" />
                </Field>
              </>
            )}
            <Field label="Email">
              <input className="agri-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </Field>
            <Field label="Password">
              <input className="agri-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </Field>
            {error && (
              <div className="text-sm p-2.5 rounded" style={{ background: "var(--red-soft)", color: "var(--red)", border: "1px solid var(--red-border)" }}>
                {error}
              </div>
            )}
            <Button className="agri-btn-block" onClick={handleSubmit} disabled={loading}>
              {loading ? "Please wait..." : mode === "login" ? "Log In" : "Create Account"}
            </Button>
          </div>
          <p className="text-sm text-center mt-5" style={{ color: "var(--text-muted)" }}>
            {mode === "login" ? "New to BeanLink?" : "Already have an account?"}{" "}
            <button className="font-semibold" style={{ color: "var(--primary)" }}
              onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}>
              {mode === "login" ? "Register" : "Log In"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   APP SHELL
   ========================================================================== */
const NAV_BY_ROLE = {
 farmer: [
  { id: "dashboard",   label: "Dashboard",             icon: Home },
  { id: "marketplace", label: "Marketplace",           icon: ShoppingBag },
  { id: "recommendation", label: "Input Recommendations", icon: Sprout },
  { id: "my-listings", label: "My Listings",           icon: Wheat },
  { id: "list-produce", label: "List Produce",         icon: Plus },
  { id: "prices",      label: "Market Prices",         icon: TrendingUp },
  { id: "orders",      label: "Orders",                icon: ClipboardList },
  { id: "transactions", label: "Transactions",         icon: Receipt },
  { id: "profile",     label: "Profile",               icon: User },
],
buyer: [
  { id: "dashboard",   label: "Dashboard",             icon: Home },
  { id: "marketplace", label: "Marketplace",           icon: ShoppingBag },
  { id: "prices",      label: "Market Prices",         icon: TrendingUp },
  { id: "orders",      label: "Orders",                icon: ClipboardList },
  { id: "transactions", label: "Transactions",         icon: Receipt },
  { id: "profile",     label: "Profile",               icon: User },
],
supplier: [
  { id: "dashboard",   label: "Dashboard",             icon: Home },
  { id: "marketplace", label: "Marketplace",           icon: ShoppingBag },
  { id: "my-listings", label: "My Listings",           icon: Package },
  { id: "list-input",  label: "Add Listing",           icon: Plus },
  { id: "orders",      label: "Orders",                icon: ClipboardList },
  { id: "transactions", label: "Transactions",         icon: Receipt },
  { id: "profile",     label: "Profile",               icon: User },
],
admin: [
  { id: "dashboard",   label: "Dashboard",             icon: Home },
  { id: "admin-users", label: "Users",                 icon: Users },
  { id: "marketplace", label: "Listings",              icon: ShoppingBag },
  { id: "admin-prices", label: "Market Prices",        icon: TrendingUp },
  { id: "transactions", label: "Transactions",         icon: Receipt },
  { id: "admin-reports", label: "Reports",             icon: Flag },
],
};

function AppShell({ role, user, page, goto, onLogout, children }) {
  const [mobileMenu, setMobileMenu] = useState(false);
  const { confirm } = useModal();
  const nav = NAV_BY_ROLE[role] || NAV_BY_ROLE.farmer;
  const mobilePrimary = nav.slice(0, 4);

  const handleLogout = async () => {
    const ok = await confirm({
      tone: "warn",
      title: "Log out?",
      body: "You'll need to sign in again to access your dashboard.",
      confirmLabel: "Log out",
      cancelLabel: "Stay",
    });
    if (ok) onLogout();
  };

  return (
    <div className="agri-root min-h-screen flex">
      <aside className="hidden md:flex w-60 shrink-0 flex-col border-r" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
        <div className="px-5 py-5 flex items-center gap-2 font-bold text-base border-b" style={{ borderColor: "var(--border)" }}>
          <div className="w-7 h-7 flex items-center justify-center rounded" style={{ background: "var(--primary)" }}>
            <Sprout size={15} color="#fff" />
          </div>
          BeanLink
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {nav.map((n) => (
            <div key={n.id} className={`agri-nav-link ${page === n.id ? "active" : ""}`} onClick={() => goto(n.id)}>
              <n.icon size={17} /> {n.label}
            </div>
          ))}
        </nav>
        <div className="px-3 py-4 border-t" style={{ borderColor: "var(--border)" }}>
          <div className="agri-nav-link" onClick={handleLogout}>
            <LogOut size={17} /> Log Out
          </div>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="border-b px-4 md:px-6 py-3 flex items-center gap-3 sticky top-0 z-10" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <button className="md:hidden" onClick={() => setMobileMenu(true)} aria-label="Open menu">
            <Menu size={22} />
          </button>
          <div className="hidden sm:flex items-center flex-1 max-w-md relative">
            <Search size={16} style={{ position: "absolute", left: 10, color: "var(--text-faint)" }} />
            <input className="agri-input" style={{ paddingLeft: 32 }} placeholder="Search produce, inputs, prices..." />
          </div>
          <div className="flex-1 sm:hidden font-bold">BeanLink</div>
          <button className="relative" aria-label="Notifications">
            <Bell size={19} style={{ color: "var(--text-muted)" }} />
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full" style={{ background: "var(--amber)" }} />
          </button>
          <button className="flex items-center gap-2" onClick={() => goto("profile")}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: "var(--primary-soft)", color: "var(--primary-dark)" }}>
              {user.full_name.split(" ").map((p) => p[0]).join("").slice(0, 2)}
            </div>
            <span className="hidden md:block text-sm font-medium">{user.full_name}</span>
          </button>
        </header>
        <main className="flex-1 p-4 md:p-7 pb-20 md:pb-7">{children}</main>
      </div>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 border-t flex z-20" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
        {mobilePrimary.map((n) => (
          <button key={n.id} onClick={() => goto(n.id)} className="flex-1 flex flex-col items-center gap-1 py-2.5" style={{ color: page === n.id ? "var(--primary)" : "var(--text-faint)" }}>
            <n.icon size={19} />
            <span className="text-[10px] font-medium">{n.label.split(" ")[0]}</span>
          </button>
        ))}
        <button onClick={() => setMobileMenu(true)} className="flex-1 flex flex-col items-center gap-1 py-2.5" style={{ color: "var(--text-faint)" }}>
          <Menu size={19} />
          <span className="text-[10px] font-medium">More</span>
        </button>
      </nav>

      {mobileMenu && (
        <div className="fixed inset-0 z-30 flex">
          <div className="flex-1" style={{ background: "rgba(0,0,0,0.3)" }} onClick={() => setMobileMenu(false)} />
          <div className="w-72 h-full p-4" style={{ background: "var(--surface)" }}>
            <div className="flex items-center justify-between mb-4">
              <div className="font-bold">Menu</div>
              <button onClick={() => setMobileMenu(false)}><X size={20} /></button>
            </div>
            <div className="space-y-1">
              {nav.map((n) => (
                <div key={n.id} className={`agri-nav-link ${page === n.id ? "active" : ""}`} onClick={() => { goto(n.id); setMobileMenu(false); }}>
                  <n.icon size={17} /> {n.label}
                </div>
              ))}
              <div className="agri-nav-link" onClick={() => { setMobileMenu(false); handleLogout(); }}><LogOut size={17} /> Log Out</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================================
   FARMER DASHBOARD
   ========================================================================== */
function FarmerDashboard({ goto, user }) {
  const { push } = useToast();
  const [summary, setSummary] = useState(null);
  const [activity, setActivity] = useState([]);
  const [priceSeries, setPriceSeries] = useState([]);
  const [latest, setLatest] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [sum, act, prices, latestRes] = await Promise.all([
          getDashboardSummary(),
          getDashboardActivity(),
          getPrices({ variety: "Kenya Umoja" }),
          getLatestPrice("Kenya Umoja"),
        ]);
        if (cancelled) return;
        setSummary(sum);
        setActivity(act.activity || []);
        setPriceSeries(
          (prices.prices || []).slice()
            .sort((a, b) => new Date(a.recorded_date) - new Date(b.recorded_date))
            .map((p) => ({ date: String(p.recorded_date).slice(5), price: Number(p.price_per_kg) }))
        );
        setLatest(latestRes.latest || null);
      } catch (err) {
        push(err.message || "Failed to load dashboard", "red");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [push]);

  if (loading) {
    return (
      <div>
        <SectionHeading title={`Hello, ${user.full_name.split(" ")[0]}`} subtitle="Loading your dashboard…" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-7">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="agri-skel h-24" />)}
        </div>
        <div className="grid lg:grid-cols-3 gap-5 mb-7">
          <div className="agri-skel h-72 lg:col-span-2" />
          <div className="agri-skel h-72" />
        </div>
        <div className="agri-skel h-40" />
      </div>
    );
  }

  const firstName = user.full_name.split(" ")[0];

  return (
    <div>
      <SectionHeading title={`Good morning, ${firstName}`} subtitle="Here is an overview of your farming and marketplace activity." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-7">
        <StatCard label="Active Listings" value={summary?.activeListings ?? 0} icon={Wheat} />
        <StatCard label="Pending Orders" value={summary?.pendingOrders ?? 0} icon={ClipboardList} />
        <StatCard label="Completed Sales" value={summary?.completedSales ?? 0} icon={CheckCircle2} />
        <StatCard label="Latest Bean Price" value={latest ? fmtKES(latest.price_per_kg) : "—"} icon={TrendingUp} />
      </div>

      <div className="grid lg:grid-cols-3 gap-5 mb-7">
        <div className="agri-card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold">Market Price Snapshot</h3>
            <button className="text-xs font-semibold flex items-center gap-1" style={{ color: "var(--primary)" }} onClick={() => goto("prices")}>
              View all <ChevronRight size={13} />
            </button>
          </div>
          <p className="text-xs mb-4" style={{ color: "var(--text-faint)" }}>Recorded Market Prices — not a forecast</p>
          {latest ? (
            <div className="flex items-center justify-between p-3 rounded mb-4" style={{ background: "var(--surface-alt)" }}>
              <div>
                <div className="font-semibold text-sm">{beanLabel(latest.bean_variety)}</div>
                <div className="text-xs" style={{ color: "var(--text-muted)" }}>{latest.market_name} Market</div>
              </div>
              <div className="text-right">
                <div className="mono font-bold">{fmtKES(latest.price_per_kg)} / kg</div>
                <div className="text-xs" style={{ color: "var(--text-faint)" }}>Updated: {fmtDate(latest.recorded_date)}</div>
              </div>
            </div>
          ) : (
            <div className="p-3 rounded mb-4 text-sm" style={{ background: "var(--surface-alt)", color: "var(--text-muted)" }}>
              No recorded prices yet.
            </div>
          )}
          <div style={{ width: "100%", height: 160 }}>
            {priceSeries.length > 0 ? (
              <ResponsiveContainer>
                <LineChart data={priceSeries} margin={{ left: -20, right: 10, top: 5 }}>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--text-faint)" }} axisLine={{ stroke: "var(--border)" }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "var(--text-faint)" }} axisLine={false} tickLine={false} width={45} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 4, border: "1px solid var(--border)" }} formatter={(v) => [`KES ${v}`, "Price/kg"]} />
                  <Line type="monotone" dataKey="price" stroke="var(--primary)" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm" style={{ color: "var(--text-faint)" }}>
                No chart data available yet.
              </div>
            )}
          </div>
        </div>

        <div className="agri-card p-5">
          <h3 className="font-semibold mb-4">Quick Actions</h3>
          <div className="space-y-2">
            <Button className="agri-btn-block" variant="primary" onClick={() => goto("recommendation")}>Get Input Recommendation</Button>
            <Button className="agri-btn-block" variant="secondary" onClick={() => goto("marketplace")}>Buy Farm Inputs</Button>
            <Button className="agri-btn-block" variant="secondary" onClick={() => goto("list-produce")}>List Produce</Button>
            <Button className="agri-btn-block" variant="secondary" onClick={() => goto("prices")}>View Market Prices</Button>
          </div>
        </div>
      </div>

      <div className="agri-card p-5">
        <h3 className="font-semibold mb-4">Recent Activity</h3>
        {activity.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text-faint)" }}>No activity yet.</p>
        ) : (
          <div className="space-y-3">
            {activity.map((a, i) => {
              const Icon = a.kind === "order" ? ClipboardList : a.kind === "listing" ? Wheat : Receipt;
              return (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 rounded flex items-center justify-center shrink-0" style={{ background: "var(--surface-alt)" }}>
                    <Icon size={15} style={{ color: "var(--primary)" }} />
                  </div>
                  <div className="flex-1">{a.message}</div>
                  <div className="text-xs shrink-0" style={{ color: "var(--text-faint)" }}>{fmtDate(a.created_at)}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================================
   BUYER DASHBOARD
   ========================================================================== */
function BuyerDashboard({ goto, user }) {
  const { push } = useToast();
  const [summary, setSummary] = useState(null);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [sum, mk] = await Promise.all([
          getDashboardSummary(),
          getMarketplace({ category: "produce" }),
        ]);
        if (cancelled) return;
        setSummary(sum);
        setListings((mk.listings || []).slice(0, 3));
      } catch (err) {
        push(err.message || "Failed to load dashboard", "red");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [push]);

  if (loading) return <PageSkeleton rows={3} />;

  const firstName = user.full_name.split(" ")[0];

  return (
    <div>
      <SectionHeading title={`Welcome back, ${firstName}`} subtitle="Here is an overview of your marketplace activity." />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-7">
        <StatCard label="Open Orders" value={summary?.openOrders ?? 0} icon={ClipboardList} />
        <StatCard label="Completed Orders" value={summary?.completedOrders ?? 0} icon={CheckCircle2} />
        <StatCard label="Saved Listings" value={0} icon={Wheat} />
        <StatCard label="Total Spent" value={fmtKES(summary?.totalSpent ?? 0)} icon={Receipt} />
      </div>
      <div className="grid lg:grid-cols-3 gap-5">
        <div className="agri-card p-5 lg:col-span-2">
          <h3 className="font-semibold mb-4">Recommended Listings</h3>
          {listings.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--text-faint)" }}>No produce listings available.</p>
          ) : (
            <div className="space-y-3">
              {listings.map((p) => (
                <ProduceRow key={p.listing_id} p={p} onClick={() => goto("produce-detail", p)} />
              ))}
            </div>
          )}
        </div>
        <div className="agri-card p-5">
          <h3 className="font-semibold mb-4">Quick Actions</h3>
          <div className="space-y-2">
            <Button className="agri-btn-block" onClick={() => goto("marketplace")}>Browse Bean Produce</Button>
            <Button className="agri-btn-block" variant="secondary" onClick={() => goto("prices")}>View Market Prices</Button>
            <Button className="agri-btn-block" variant="secondary" onClick={() => goto("orders")}>Track My Orders</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

const ProduceRow = ({ p, onClick }) => (
  <div className="flex items-center justify-between gap-3 p-3 rounded border cursor-pointer" style={{ borderColor: "var(--border)" }} onClick={onClick}>
    <div className="flex items-center gap-3 min-w-0">
      <div className="w-9 h-9 rounded flex items-center justify-center shrink-0" style={{ background: "var(--primary-soft)" }}>
        <Wheat size={16} style={{ color: "var(--primary)" }} />
      </div>
      <div className="min-w-0">
        <div className="font-semibold text-sm truncate">{p.title || beanLabel(p.variety)}</div>
        <div className="text-xs flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
          <MapPin size={11} /> {p.location || p.seller_county || "—"}
        </div>
      </div>
    </div>
    <div className="text-right shrink-0">
      <div className="mono font-bold text-sm">{fmtKES(p.price_per_unit)}/kg</div>
      <div className="text-xs" style={{ color: "var(--text-faint)" }}>{Number(p.quantity_available)} kg available</div>
    </div>
  </div>
);

/* ============================================================================
   SUPPLIER DASHBOARD
   ========================================================================== */
function SupplierDashboard({ goto, user }) {
  const { push } = useToast();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const sum = await getDashboardSummary();
        if (!cancelled) setSummary(sum);
      } catch (err) {
        push(err.message || "Failed to load dashboard", "red");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [push]);

  if (loading) return <PageSkeleton rows={4} />;

  const firstName = user.full_name.split(" ")[0];

  return (
    <div>
      <SectionHeading title={`Welcome back, ${firstName}`} subtitle="Here is an overview of your supplier activity." />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-7">
        <StatCard label="Active Listings" value={summary?.activeListings ?? 0} icon={Package} />
        <StatCard label="Pending Orders" value={summary?.pendingOrders ?? 0} icon={ClipboardList} />
        <StatCard label="Completed Sales" value={summary?.completedSales ?? 0} icon={CheckCircle2} />
        <StatCard label="Total Revenue" value={fmtKES(summary?.totalRevenue ?? 0)} icon={Receipt} />
      </div>
      <div className="agri-card p-5">
  <h3 className="font-semibold mb-4">Quick Actions</h3>
  <div className="space-y-2 max-w-sm">
    <Button className="agri-btn-block" onClick={() => goto("list-input")}>Add New Listing</Button>
    <Button className="agri-btn-block" variant="secondary" onClick={() => goto("my-listings")}>Manage My Listings</Button>
    <Button className="agri-btn-block" variant="secondary" onClick={() => goto("orders")}>View Orders</Button>
  </div>
</div>
    </div>
  );
}

/* ============================================================================
   INPUT RECOMMENDATION
   ========================================================================== */
function InputRecommendation() {
  const { push } = useToast();
  const { open } = useModal();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [form, setForm] = useState({
    location: "Machakos County",
    agroZone: "Upper Midland 4",
    soilType: "Sandy loam",
    soilPh: "5.6",
    nitrogen: "Medium",
    farmSize: "2",
    beanVariety: "Kenya Umoja",
    previousCrop: "Maize",
  });
  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const totalSteps = 3;

  const submit = async () => {
    setLoading(true);
    try {
      const data = await getRecommendation(form);
      setResult(data);
    } catch (err) {
      open({
        tone: "error",
        title: "Recommendation failed",
        body: err.message || "The recommendation service is unavailable. Please try again shortly.",
        confirmLabel: "Close",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl">
        <SectionHeading eyebrow="Random Forest Model" title="Analysing farm conditions…" subtitle="Running your inputs through the recommendation model." />
        <div className="space-y-3">
          <div className="agri-skel h-6 w-56" />
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="agri-skel h-28" />
            <div className="agri-skel h-28" />
            <div className="agri-skel h-28" />
          </div>
          <div className="agri-skel h-40" />
          <div className="agri-skel h-10 w-48" />
        </div>
      </div>
    );
  }

  if (result) {
    const rec = result.recommendation || {
      seed: result.seed || "—",
      fertilizer: result.fertilizer || "—",
      soilAmendment: result.soil_amendment || result.soilAmendment || "—",
    };
    const explanation =
      result.explanation ||
      (result.shap_values
        ? Object.entries(result.shap_values).map(([factor, weight]) => ({ factor, value: "", weight: Math.abs(Number(weight)) }))
        : []);
    const summary = result.summary || "Recommendation generated from your farm conditions using the trained model.";

    return (
      <div className="max-w-2xl">
        <SectionHeading eyebrow="Random Forest Model" title="Recommended Farm Inputs" subtitle="Based on the farm information you provided." />
        <div className="grid sm:grid-cols-3 gap-3 mb-6">
          {[
            { label: "Recommended Seed", value: rec.seed, icon: Sprout },
            { label: "Recommended Fertilizer", value: rec.fertilizer, icon: Beaker },
            { label: "Recommended Soil Amendment", value: rec.soilAmendment, icon: Leaf },
          ].map((r, i) => (
            <div key={i} className="agri-card p-4">
              <r.icon size={17} style={{ color: "var(--primary)" }} className="mb-2" />
              <div className="text-xs font-semibold uppercase mb-1" style={{ color: "var(--text-faint)" }}>{r.label}</div>
              <div className="text-sm font-semibold">{r.value}</div>
            </div>
          ))}
        </div>
        {explanation.length > 0 && (
          <div className="agri-card p-5 mb-5">
            <div className="flex items-center gap-2 mb-2">
              <Info size={15} style={{ color: "var(--primary)" }} />
              <span className="text-sm font-semibold">Why was this recommended?</span>
            </div>
            <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>{summary}</p>
            <div className="space-y-3">
              {explanation.map((e, i) => {
                const pct = Math.min(100, Math.round((Number(e.weight) || 0) * 100));
                return (
                  <div key={i}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium">
                        {e.factor}{" "}
                        {e.value && <span style={{ color: "var(--text-faint)" }}>({e.value})</span>}
                      </span>
                      <span className="mono" style={{ color: "var(--text-muted)" }}>{pct}%</span>
                    </div>
                    <div className="agri-bar-track"><div className="agri-bar-fill" style={{ width: `${pct}%` }} /></div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => { setResult(null); setStep(1); }}>Start New Recommendation</Button>
          <Button icon={ShoppingBag}>Buy Recommended Inputs</Button>
        </div>
      </div>
    );
  }

  const selectedVariety = BEAN_VARIETIES.find((v) => v.value === form.beanVariety);

  return (
    <div className="max-w-xl">
      <SectionHeading eyebrow="Random Forest Model" title="Input Recommendation" subtitle="Tell us about your farm to receive a tailored input recommendation." />
      <div className="flex items-center gap-2 mb-6">
        {[1, 2, 3].map((s) => (
          <React.Fragment key={s}>
            <div className={`agri-step ${s === step ? "active" : s < step ? "done" : ""}`}>{s < step ? <CheckCircle2 size={14} /> : s}</div>
            {s < totalSteps && <div className="flex-1 h-px" style={{ background: s < step ? "var(--primary)" : "var(--border)" }} />}
          </React.Fragment>
        ))}
      </div>
      <div className="agri-card p-5">
        {step === 1 && (
          <div className="space-y-4">
            <div className="text-sm font-semibold mb-1" style={{ color: "var(--text-faint)" }}>Step 1 of 3 — Location & Zone</div>
            <Field label="Location">
              <input className="agri-input" value={form.location} onChange={(e) => update("location", e.target.value)} />
            </Field>
            <Field label="Agro-ecological zone">
              <select className="agri-select" value={form.agroZone} onChange={(e) => update("agroZone", e.target.value)}>
                {["Upper Midland 1", "Upper Midland 2", "Upper Midland 3", "Upper Midland 4", "Lower Midland 1", "Lower Midland 2"].map((z) => <option key={z}>{z}</option>)}
              </select>
            </Field>
            <Field label="Farm size (acres)">
              <input className="agri-input" type="number" value={form.farmSize} onChange={(e) => update("farmSize", e.target.value)} />
            </Field>
          </div>
        )}
        {step === 2 && (
          <div className="space-y-4">
            <div className="text-sm font-semibold mb-1" style={{ color: "var(--text-faint)" }}>Step 2 of 3 — Soil Information</div>
            <Field label="Soil type">
              <select className="agri-select" value={form.soilType} onChange={(e) => update("soilType", e.target.value)}>
                {["Sandy loam", "Clay loam", "Silty clay", "Volcanic loam", "Sandy clay"].map((z) => <option key={z}>{z}</option>)}
              </select>
            </Field>
            <Field label="Soil pH" hint="If unknown, use your last soil test result or leave the estimate.">
              <input className="agri-input" type="number" step="0.1" value={form.soilPh} onChange={(e) => update("soilPh", e.target.value)} />
            </Field>
            <Field label="Nitrogen level (if available)">
              <select className="agri-select" value={form.nitrogen} onChange={(e) => update("nitrogen", e.target.value)}>
                {["Low", "Medium", "High", "Not known"].map((z) => <option key={z}>{z}</option>)}
              </select>
            </Field>
          </div>
        )}
        {step === 3 && (
          <div className="space-y-4">
            <div className="text-sm font-semibold mb-1" style={{ color: "var(--text-faint)" }}>Step 3 of 3 — Crop Details</div>
            <Field label="Bean variety" hint="Names in brackets are the KALRO official line codes.">
              <select className="agri-select" value={form.beanVariety} onChange={(e) => update("beanVariety", e.target.value)}>
                {BEAN_VARIETIES.map((v) => (
                  <option key={v.value} value={v.value}>{v.label}  ·  {v.code}</option>
                ))}
              </select>
            </Field>
            {selectedVariety && (
              <div className="p-3 rounded text-sm"
                style={{ background: "var(--primary-soft)", border: "1px solid var(--primary-soft-border)", color: "var(--primary-dark)" }}>
                <div className="font-semibold mb-0.5">
                  {selectedVariety.value} <span className="mono" style={{ opacity: 0.7 }}>· {selectedVariety.code}</span>
                </div>
                <div style={{ opacity: 0.85 }}>
                  Market class: <strong>{selectedVariety.market}</strong>. {selectedVariety.type}.
                </div>
              </div>
            )}
            <Field label="Previous crop">
              <input className="agri-input" value={form.previousCrop} onChange={(e) => update("previousCrop", e.target.value)} />
            </Field>
          </div>
        )}
        <div className="flex justify-between mt-6">
          <Button variant="secondary" disabled={step === 1} onClick={() => setStep((s) => s - 1)} icon={ChevronLeft}>Back</Button>
          {step < totalSteps ? (
            <Button onClick={() => setStep((s) => s + 1)}>Next</Button>
          ) : (
            <Button onClick={submit} disabled={loading}>{loading ? "Analysing…" : "Get Recommendation"}</Button>
          )}
        </div>
      </div>
    </div>
  );
}
/* ============================================================================
   UNIFIED MARKETPLACE — produce + inputs in one browse experience
   ========================================================================== */
const CATEGORY_FILTERS = [
  { id: "all", label: "All", icon: ShoppingBag },
  ...INPUT_CATEGORIES,
  { id: "produce", label: "Bean Produce", icon: Wheat },
];

function Marketplace({ goto }) {
   const { push } = useToast();
  const { confirm } = useModal();
  const [category, setCategory] = useState("all");
  const [county, setCounty] = useState("all");
  const [variety, setVariety] = useState("all");
  const [sort, setSort] = useState("recent");
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  // Reset category-specific filters whenever the category changes
  useEffect(() => {
    if (category !== "produce" && category !== "all") setVariety("all");
  }, [category]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const params = {};
        if (category !== "all") params.category = category;
        if (county !== "all") params.county = county;
        if (variety !== "all") params.variety = variety;
        if (sort !== "recent") params.sort = sort;
        const data = await getMarketplace(params);
        if (!cancelled) setListings(data.listings || []);
      } catch (err) {
        push(err.message || "Failed to load marketplace", "red");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [category, county, variety, sort, push]);

  const showProduceFilters = category === "produce" || category === "all";

  // Counties derived from the currently-returned listings, so the filter
  // is always populated with options that will actually match.
  const counties = ["all", ...new Set(listings.map((p) => p.location).filter(Boolean))];

 const addToCart = async (l) => {
    if (guest) {
      const ok = await confirm({
        tone: "info",
        title: "Log in to purchase",
        body: "You can browse freely, but you need an account to place orders on BeanLink.",
        confirmLabel: "Log in",
        cancelLabel: "Keep browsing",
      });
      if (ok) goto("login");
      return;
    }
    push(`${l.title || beanLabel(l.variety)} added to cart`, "green");
  };
  return (
    <div>
      <SectionHeading
        title="Marketplace"
        subtitle="Browse bean produce, seeds, fertilizers, equipment and other farm inputs from verified farmers and suppliers."
      />

      {/* Category chips */}
      <div className="flex gap-2 mb-4 overflow-x-auto agri-scroll pb-1">
        {CATEGORY_FILTERS.map((c) => {
          const active = category === c.id;
          return (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              className="agri-btn agri-btn-sm"
              style={{
                background: active ? "var(--primary)" : "var(--surface)",
                color: active ? "#fff" : "var(--text)",
                border: "1px solid var(--border-strong)",
              }}
            >
              <c.icon size={13} /> {c.label}
            </button>
          );
        })}
      </div>

      {/* Secondary filters */}
      <div className="agri-card p-4 mb-5 grid sm:grid-cols-3 gap-3">
        <Field label="County">
          <select className="agri-select" value={county} onChange={(e) => setCounty(e.target.value)}>
            {counties.map((v) => (
              <option key={v} value={v}>{v === "all" ? "All counties" : v}</option>
            ))}
          </select>
        </Field>

        {showProduceFilters && (
          <Field label="Bean variety" hint={category === "all" ? "Applies to produce listings only" : undefined}>
            <select className="agri-select" value={variety} onChange={(e) => setVariety(e.target.value)}>
              <option value="all">All varieties</option>
              {BEAN_VARIETIES.map((v) => (
                <option key={v.value} value={v.value}>{v.label} · {v.code}</option>
              ))}
            </select>
          </Field>
        )}

        <Field label="Sort by">
          <select className="agri-select" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="recent">Most recent</option>
            <option value="price-low">Price: low to high</option>
            <option value="price-high">Price: high to low</option>
            <option value="quantity">Quantity available</option>
          </select>
        </Field>
      </div>

      {/* Results */}
      {loading ? (
        <PageSkeleton rows={6} />
      ) : listings.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="No listings match these filters"
          body="Try a different category or county, or check back later."
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {listings.map((p) => {
            const isProduce = p.category === "produce";
            const catIcon =
              (isProduce
                ? Wheat
                : INPUT_CATEGORIES.find((c) => c.id === p.category)?.icon) || Package;

            return (
              <div key={p.listing_id} className="agri-card p-4 flex flex-col">
                <div
                  className="w-full h-28 rounded mb-3 flex items-center justify-center"
                  style={{ background: "var(--surface-alt)" }}
                >
                  <catIcon size={30} color="var(--primary)" />
                </div>

                <div className="mb-1">
                  {isProduce && (
                    <div className="text-[10px] font-bold uppercase tracking-wider mb-1"
                         style={{ color: "var(--primary)" }}>
                      Bean Produce
                    </div>
                  )}
                  <div className="font-semibold text-sm">
                    {isProduce ? `${beanShort(p.variety)} Beans` : p.title}
                  </div>
                </div>

                <div className="text-xs mb-2 flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
                  <MapPin size={11} /> {p.location || p.seller_county || "—"}
                </div>

                <div className="mb-3">
                  {p.seller_name
                    ? <Badge tone="green" icon={ShieldCheck}>{p.seller_name}</Badge>
                    : <Badge tone="gray">Seller</Badge>}
                </div>

                <div className="flex items-center justify-between mb-3">
                  <div className="mono font-bold">
                    {fmtKES(p.price_per_unit)}
                    <span className="text-xs font-normal" style={{ color: "var(--text-faint)" }}>
                      /{isProduce ? "kg" : "unit"}
                    </span>
                  </div>
                  <Badge tone={Number(p.quantity_available) > 0 ? "green" : "red"}>
                    {Number(p.quantity_available) > 0
                      ? `${Number(p.quantity_available)} ${isProduce ? "kg" : "in stock"}`
                      : "Out of Stock"}
                  </Badge>
                </div>

                <div className="mt-auto flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="agri-btn-block"
                    onClick={() => goto(isProduce ? "produce-detail" : "input-detail", p)}
                  >
                    View Details
                  </Button>
                  <Button
                    size="sm"
                    className="agri-btn-block"
                    disabled={Number(p.quantity_available) <= 0}
                    onClick={() => addToCart(p)}
                  >
                    Add to Cart
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function InputDetail({ item, goto, guest = false }) {
  const { push } = useToast();
  const { open, confirm } = useModal();
  const [fresh, setFresh] = useState(item);
  const [loading, setLoading] = useState(!item);
  const [quantity, setQuantity] = useState(1);
  const [paymentOpen, setPaymentOpen] = useState(false);

  useEffect(() => {
    if (!item?.listing_id) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const data = await getListing(item.listing_id);
        if (!cancelled) setFresh(data.listing);
      } catch (err) {
        push(err.message || "Failed to load listing", "red");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [item?.listing_id, push]);

  if (loading) return <PageSkeleton rows={1} />;
  if (!fresh) return null;

  const catIcon = INPUT_CATEGORIES.find((c) => c.id === fresh.category)?.icon || Package;
  const available = Number(fresh.quantity_available) > 0;

  const requireAuth = async () => {
    if (guest) {
      const ok = await confirm({
        tone: "info",
        title: "Log in to purchase",
        body: "You can browse freely, but you need an account to place orders on BeanLink.",
        confirmLabel: "Log in",
        cancelLabel: "Keep browsing",
      });
      if (ok) goto("login");
      return false;
    }
    return true;
  };

  const addToCart = async () => {
    if (!(await requireAuth())) return;
    push(`${fresh.title} added to cart`, "green");
  };

  const placeOrder = async () => {
    if (!(await requireAuth())) return;
    setPaymentOpen(true);
  };

  const handlePaymentSuccess = () => {
    push("Payment received. Order confirmed.", "green");
    goto("orders");
  };

  return (
    <div className="max-w-2xl">
      <button
        className="flex items-center gap-1 text-sm mb-5"
        style={{ color: "var(--text-muted)" }}
        onClick={() => goto("marketplace")}
      >
        <ArrowLeft size={15} /> Back to Marketplace
      </button>

      <div className="agri-card p-6">
        <div
          className="w-full h-48 rounded mb-4 flex items-center justify-center"
          style={{ background: "var(--surface-alt)" }}
        >
          {React.createElement(catIcon, { size: 48, color: "var(--primary)" })}
        </div>

        <h2 className="text-xl font-bold mb-2">{fresh.title}</h2>
        <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
          {fresh.description || `Quality-checked ${fresh.title.toLowerCase()}, sourced from a registered agro-dealer.`}
        </p>

        <div className="grid grid-cols-2 gap-4 mb-5 text-sm">
          <div>
            <div className="text-xs mb-1" style={{ color: "var(--text-faint)" }}>Seller</div>
            <div className="font-semibold">{fresh.seller_name || "—"}</div>
          </div>
          <div>
            <div className="text-xs mb-1" style={{ color: "var(--text-faint)" }}>Verification</div>
            {fresh.seller_name
              ? <Badge tone="green" icon={ShieldCheck}>Verified Seller</Badge>
              : <Badge tone="gray">Unverified</Badge>}
          </div>
          <div>
            <div className="text-xs mb-1" style={{ color: "var(--text-faint)" }}>Price</div>
            <div className="mono font-bold">{fmtKES(fresh.price_per_unit)}</div>
          </div>
          <div>
            <div className="text-xs mb-1" style={{ color: "var(--text-faint)" }}>Available Quantity</div>
            <div className="font-semibold">
              {available ? `${Number(fresh.quantity_available)} in stock` : "Out of stock"}
            </div>
          </div>
          <div>
            <div className="text-xs mb-1" style={{ color: "var(--text-faint)" }}>Location</div>
            <div className="font-semibold flex items-center gap-1">
              <MapPin size={13} />{fresh.location || "—"}
            </div>
          </div>
        </div>

        <div className="mb-4">
          <Field label="Quantity to order">
            <input
              type="number"
              min="1"
              className="agri-input"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              disabled={!available}
            />
          </Field>
        </div>

        <div className="flex gap-3">
          <Button
            variant="secondary"
            className="agri-btn-block"
            disabled={!available}
            onClick={addToCart}
          >
            Add to Cart
          </Button>
          <Button
            className="agri-btn-block"
            disabled={!available}
            onClick={placeOrder}
          >
            Buy Now
          </Button>
        </div>
      </div>

      <PaymentModal
        open={paymentOpen}
        listing={fresh}
        quantity={quantity}
        goto={goto}
        onClose={() => setPaymentOpen(false)}
        onSuccess={handlePaymentSuccess}
      />
    </div>
  );
}
function ProduceDetail({ item, goto, guest = false }) {
  const { push } = useToast();
  const { open, confirm } = useModal();
  const [fresh, setFresh] = useState(item);
  const [loading, setLoading] = useState(!item);
  const [quantity, setQuantity] = useState(1);
  const [paymentOpen, setPaymentOpen] = useState(false);

  useEffect(() => {
    if (!item?.listing_id) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const data = await getListing(item.listing_id);
        if (!cancelled) setFresh(data.listing);
      } catch (err) {
        push(err.message || "Failed to load listing", "red");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [item?.listing_id, push]);

  if (loading) return <PageSkeleton rows={1} />;
  if (!fresh) return null;

  const available = Number(fresh.quantity_available) > 0;

  const requireAuth = async () => {
    if (guest) {
      const ok = await confirm({
        tone: "info",
        title: "Log in to purchase",
        body: "You can browse freely, but you need an account to place orders on BeanLink.",
        confirmLabel: "Log in",
        cancelLabel: "Keep browsing",
      });
      if (ok) goto("login");
      return false;
    }
    return true;
  };

  const placeOrder = async () => {
    if (!(await requireAuth())) return;
    setPaymentOpen(true);
  };

  const handlePaymentSuccess = () => {
    push("Payment received. Order confirmed.", "green");
    goto("orders");
  };

  return (
    <div className="max-w-2xl">
      <button
        className="flex items-center gap-1 text-sm mb-5"
        style={{ color: "var(--text-muted)" }}
        onClick={() => goto("marketplace")}
      >
        <ArrowLeft size={15} /> Back to Marketplace
      </button>

      <div className="agri-card p-6">
        <div
          className="w-full h-48 rounded mb-4 flex items-center justify-center"
          style={{ background: "var(--surface-alt)" }}
        >
          <Wheat size={48} color="var(--primary)" />
        </div>

        <h2 className="text-xl font-bold mb-1 uppercase">{beanLabel(fresh.variety)} Beans</h2>
        <div
          className="flex items-center gap-1 text-sm mb-4"
          style={{ color: "var(--text-muted)" }}
        >
          <MapPin size={13} /> {fresh.location || fresh.seller_county || "—"} · Listed by {fresh.seller_name || "—"}
        </div>

        <p className="text-sm mb-5" style={{ color: "var(--text-muted)" }}>
          {fresh.description || "Freshly harvested and sorted bean produce."}
        </p>

        <div className="grid grid-cols-2 gap-4 mb-5 text-sm">
          <div>
            <div className="text-xs mb-1" style={{ color: "var(--text-faint)" }}>Quantity Available</div>
            <div className="font-semibold mono">{Number(fresh.quantity_available)} kg</div>
          </div>
          <div>
            <div className="text-xs mb-1" style={{ color: "var(--text-faint)" }}>Price</div>
            <div className="font-semibold mono">{fmtKES(fresh.price_per_unit)} / kg</div>
          </div>
          <div>
            <div className="text-xs mb-1" style={{ color: "var(--text-faint)" }}>Listed</div>
            <div className="font-semibold">{fmtDate(fresh.created_at)}</div>
          </div>
          <div>
            <div className="text-xs mb-1" style={{ color: "var(--text-faint)" }}>Category</div>
            <Badge tone="green">Produce</Badge>
          </div>
        </div>

        {fresh.seller_name && (
          <div
            className="p-3 rounded mb-5 text-sm flex items-center gap-2"
            style={{
              background: "var(--primary-soft)",
              color: "var(--primary-dark)",
              border: "1px solid var(--primary-soft-border)",
            }}
          >
            <ShieldCheck size={16} /> Listed by a verified farmer on BeanLink
          </div>
        )}

        <div className="flex gap-3">
          <Field label="Quantity to order (kg)">
            <input
              className="agri-input"
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              disabled={!available}
            />
          </Field>
        </div>

        <Button
          className="agri-btn-block mt-4"
          disabled={!available}
          onClick={placeOrder}
        >
          Place Order
        </Button>
      </div>

      <PaymentModal
        open={paymentOpen}
        listing={fresh}
        quantity={quantity}
        goto={goto}
        onClose={() => setPaymentOpen(false)}
        onSuccess={handlePaymentSuccess}
      />
    </div>
  );
}

/* ============================================================================
   MY PRODUCE
   ========================================================================== */
function MyListings({ goto, role }) {
  const { push } = useToast();
  const { confirm, open } = useModal();
  const [tab, setTab] = useState("active");
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  const isFarmer = role === "farmer";
  const addHref = isFarmer ? "list-produce" : "list-input";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getMyListings();
      setListings(data.listings || []);
    } catch (err) {
      push(err.message || "Failed to load your listings", "red");
    } finally {
      setLoading(false);
    }
  }, [push]);

  useEffect(() => { load(); }, [load]);

  const grouped = {
    active: listings.filter((l) => l.status === "active"),
    sold: listings.filter((l) => l.status === "sold"),
    draft: listings.filter((l) => l.status === "draft"),
    unavailable: listings.filter((l) => l.status === "unavailable" || l.status === "paused"),
  };

  const changeStatus = async (id, status) => {
    try {
      await updateListingStatus(id, status);
      push(`Listing marked as ${status}`, "green");
      load();
    } catch (err) {
      push(err.message || "Failed to update status", "red");
    }
  };

  const remove = async (id, title) => {
    const ok = await confirm({
      tone: "warn",
      title: `Delete "${title}"?`,
      body: "This listing will be permanently removed. Buyers will no longer see it.",
      confirmLabel: "Delete",
      cancelLabel: "Keep it",
    });
    if (!ok) return;

    try {
      await deleteListing(id);
      open({
        tone: "success",
        title: "Listing deleted",
        body: "The listing has been removed from the marketplace.",
        confirmLabel: "Done",
      });
      load();
    } catch (err) {
      open({
        tone: "error",
        title: "Could not delete listing",
        body: err.message || "Please try again.",
        confirmLabel: "Close",
      });
    }
  };

  const listingLabel = isFarmer ? "Produce" : "Inputs";
  const addLabel = isFarmer ? "List Produce" : "Add Listing";
  const titleFor = (l) => (l.category === "produce" ? beanLabel(l.variety) : l.title);

  return (
    <div>
      <SectionHeading
        title={isFarmer ? "My Produce" : "My Listings"}
        subtitle={
          isFarmer
            ? "Manage your bean produce listings."
            : "Manage your farm input and equipment listings."
        }
        action={<Button icon={Plus} onClick={() => goto(addHref)}>{addLabel}</Button>}
      />

      <div className="flex gap-1 mb-5 border-b overflow-x-auto agri-scroll" style={{ borderColor: "var(--border)" }}>
        {[["active", "Active"], ["sold", "Sold"], ["draft", "Draft"], ["unavailable", "Unavailable"]].map(([k, l]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className="px-4 py-2 text-sm font-semibold whitespace-nowrap"
            style={{
              color: tab === k ? "var(--primary)" : "var(--text-faint)",
              borderBottom: tab === k ? "2px solid var(--primary)" : "2px solid transparent",
            }}
          >
            {l} <span className="mono">({grouped[k].length})</span>
          </button>
        ))}
      </div>

      {loading ? (
        <PageSkeleton rows={3} />
      ) : grouped[tab].length === 0 ? (
        <EmptyState
          icon={isFarmer ? Wheat : Package}
          title={`No ${listingLabel.toLowerCase()} in ${tab}`}
          body={isFarmer ? "When you list produce, it will appear here." : "When you add an input, it will appear here."}
          action={<Button icon={Plus} onClick={() => goto(addHref)}>{addLabel}</Button>}
        />
      ) : (
        <div className="space-y-3">
          {grouped[tab].map((p) => {
            const isProduce = p.category === "produce";
            const CatIcon = isProduce ? Wheat : (INPUT_CATEGORIES.find((c) => c.id === p.category)?.icon || Package);
            return (
              <div key={p.listing_id} className="agri-card p-4 flex flex-wrap items-center gap-4">
                <div
                  className="w-11 h-11 rounded flex items-center justify-center shrink-0"
                  style={{ background: "var(--primary-soft)" }}
                >
                  <CatIcon size={20} color="var(--primary)" />
                </div>
                <div className="flex-1 min-w-[200px]">
                  <div className="font-semibold text-sm">{titleFor(p)}</div>
                  <div className="text-xs flex items-center gap-2" style={{ color: "var(--text-muted)" }}>
                    <span className="flex items-center gap-1">
                      <MapPin size={11} /> {p.location || "—"}
                    </span>
                    <span>·</span>
                    <span>{Number(p.quantity_available)} in stock</span>
                    <span>·</span>
                    <span>Listed {fmtDate(p.created_at)}</span>
                  </div>
                </div>
                <div className="mono font-bold text-sm">
                  {fmtKES(p.price_per_unit)}
                  {isProduce && <span className="text-xs font-normal" style={{ color: "var(--text-faint)" }}>/kg</span>}
                </div>
                <Badge tone={statusTone(p.status)}>{p.status}</Badge>
                <div className="flex gap-2 ml-auto">
                  {p.status === "active" && (
                    <Button size="sm" variant="ghost" icon={PauseCircle} onClick={() => changeStatus(p.listing_id, "paused")}>
                      Pause
                    </Button>
                  )}
                  {p.status === "active" && (
                    <Button size="sm" variant="ghost" icon={CheckCircle2} onClick={() => changeStatus(p.listing_id, "sold")}>
                      Mark as Sold
                    </Button>
                  )}
                  {p.status === "paused" && (
                    <Button size="sm" variant="ghost" icon={CheckCircle2} onClick={() => changeStatus(p.listing_id, "active")}>
                      Resume
                    </Button>
                  )}
                  <Button size="sm" variant="danger" icon={Trash2} onClick={() => remove(p.listing_id, titleFor(p))}>
                    Delete
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ============================================================================
   LIST PRODUCE FORM
   ========================================================================== */
function ListForm({ goto, role }) {
  const { push } = useToast();
  const { open } = useModal();
  const isFarmer = role === "farmer";
  const [submitting, setSubmitting] = useState(false);

  // Farmer defaults to produce; supplier defaults to seed (first input category)
  const [form, setForm] = useState({
    title: "",
    category: isFarmer ? "produce" : "seed",
    variety: "Kenya Umoja",           // farmer only
    quantity: "",
    price: "",
    location: "",
    description: "",
    status: "active",
  });
  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.title || !form.quantity || !form.price || !form.location) {
      push("Please fill in all required fields", "amber");
      return;
    }

    const payload = {
      title: form.title,
      category: form.category,
      quantity_available: Number(form.quantity),
      price_per_unit: Number(form.price),
      location: form.location,
      status: form.status,
      description: form.description || null,
    };
    if (isFarmer) payload.variety = form.variety;

    setSubmitting(true);
    try {
      await createListing(payload);
      open({
        tone: "success",
        title: isFarmer ? "Produce listing published" : "Input listing published",
        body: `"${form.title}" is now visible on the marketplace.`,
        confirmLabel: "View my listings",
      });
      goto("my-listings");
    } catch (err) {
      open({
        tone: "error",
        title: "Could not publish listing",
        body: err.message || "Please try again.",
        confirmLabel: "Close",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-lg">
      <SectionHeading
        title={isFarmer ? "List Bean Produce" : "Add Farm Input"}
        subtitle={
          isFarmer
            ? "Share details about your harvest so buyers can find it."
            : "List seeds, fertilizers, equipment or machinery for farmers and buyers."
        }
      />

      <div className="agri-card p-5 space-y-4">
        <Field
          label={isFarmer ? "Listing title" : "Product name"}
          hint={isFarmer ? "e.g. Well-dried Rosecoco beans" : "e.g. DAP Fertilizer 50kg"}
        >
          <input
            className="agri-input"
            value={form.title}
            onChange={(e) => update("title", e.target.value)}
            placeholder={isFarmer ? "e.g. Well-dried Rosecoco beans" : "e.g. Knapsack Sprayer 16L"}
          />
        </Field>

        {isFarmer ? (
          <Field label="Bean variety" hint="Names in brackets are the KALRO official line codes.">
            <select
              className="agri-select"
              value={form.variety}
              onChange={(e) => update("variety", e.target.value)}
            >
              {BEAN_VARIETIES.map((v) => (
                <option key={v.value} value={v.value}>
                  {v.label} · {v.code}
                </option>
              ))}
            </select>
          </Field>
        ) : (
          <Field label="Input category" hint="Choose the closest category so farmers can find it.">
            <select
              className="agri-select"
              value={form.category}
              onChange={(e) => update("category", e.target.value)}
            >
              {INPUT_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Field
            label={isFarmer ? "Quantity available (kg)" : "Quantity in stock"}
            hint={isFarmer ? undefined : "Number of units, bags, litres…"}
          >
            <input
              className="agri-input"
              type="number"
              value={form.quantity}
              onChange={(e) => update("quantity", e.target.value)}
              placeholder={isFarmer ? "e.g. 300" : "e.g. 20"}
            />
          </Field>
          <Field label={isFarmer ? "Price per kg (KES)" : "Price per unit (KES)"}>
            <input
              className="agri-input"
              type="number"
              value={form.price}
              onChange={(e) => update("price", e.target.value)}
              placeholder={isFarmer ? "e.g. 145" : "e.g. 3600"}
            />
          </Field>
        </div>

        <Field label="Location (County)">
          <input
            className="agri-input"
            value={form.location}
            onChange={(e) => update("location", e.target.value)}
            placeholder="e.g. Machakos"
          />
        </Field>

        <Field label="Description (optional)">
          <textarea
            className="agri-textarea"
            rows={3}
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            placeholder={
              isFarmer
                ? "Describe the beans — cleaning, sorting, storage condition…"
                : "Describe the product — brand, certification, condition, warranty…"
            }
          />
        </Field>

        <Field label="Publish status">
          <select
            className="agri-select"
            value={form.status}
            onChange={(e) => update("status", e.target.value)}
          >
            <option value="active">Active (visible to buyers)</option>
            <option value="draft">Draft (only you can see)</option>
          </select>
        </Field>

        <Button className="agri-btn-block" onClick={submit} disabled={submitting}>
          {submitting
            ? "Publishing…"
            : isFarmer
            ? "Publish Produce Listing"
            : "Publish Input Listing"}
        </Button>
      </div>
    </div>
  );
}

/* ============================================================================
   MARKET PRICES
   ========================================================================== */
function MarketPrices({ guest, goto }) {
  const { push } = useToast();
  const [variety, setVariety] = useState("Kenya Umoja");
  const [county, setCounty] = useState("all");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const params = { variety };
        if (county !== "all") params.county = county;
        const data = await getPrices(params);
        if (cancelled) return;
        setRows((data.prices || []).slice().sort((a, b) => new Date(a.recorded_date) - new Date(b.recorded_date)));
      } catch (err) {
        push(err.message || "Failed to load prices", "red");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [variety, county, push]);

  const chartData = rows.map((r) => ({ date: String(r.recorded_date).slice(5), price: Number(r.price_per_kg) }));
  const latest = rows[rows.length - 1];
  const prev = rows[rows.length - 2];

  return (
    <div>
      <SectionHeading title="Bean Market Prices" subtitle="View recorded bean prices across selected markets and time periods." />
      {guest && (
        <div className="p-3 rounded mb-5 text-sm flex items-center gap-2" style={{ background: "var(--amber-soft)", color: "var(--amber)", border: "1px solid var(--amber-border)" }}>
          <Info size={15} /> You're viewing public market data.{" "}
          <button className="font-semibold underline" onClick={() => goto("register")}>Register</button> or{" "}
          <button className="font-semibold underline" onClick={() => goto("login")}>Log in</button> to access your dashboard.
        </div>
      )}
      <div className="agri-card p-4 mb-5 grid sm:grid-cols-4 gap-3">
        <Field label="Bean variety">
          <select className="agri-select" value={variety} onChange={(e) => setVariety(e.target.value)}>
            {BEAN_VARIETIES.map((v) => (
              <option key={v.value} value={v.value}>{v.label} · {v.code}</option>
            ))}
          </select>
        </Field>
        <Field label="County">
          <select className="agri-select" value={county} onChange={(e) => setCounty(e.target.value)}>
            <option value="all">All counties</option>
            {[...new Set(rows.map((r) => r.county).filter(Boolean))].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="Market"><input className="agri-input" placeholder="All markets" disabled /></Field>
        <Field label="Date range"><input className="agri-input" placeholder="All records" disabled /></Field>
      </div>
      {loading ? (
        <PageSkeleton rows={3} />
      ) : rows.length === 0 ? (
        <EmptyState icon={TrendingUp} title="No recorded prices" body="There are no recorded prices for this variety yet." />
      ) : (
        <>
          <div className="grid sm:grid-cols-4 gap-3 mb-6">
            <StatCard label="Current Recorded Price" value={`${fmtKES(latest.price_per_kg)}/kg`} icon={TrendingUp} />
            <StatCard label="Previous Recorded Price" value={prev ? `${fmtKES(prev.price_per_kg)}/kg` : "—"} icon={Clock} />
            <StatCard label="Market" value={latest.market_name} icon={MapPin} mono={false} />
            <StatCard label="Last Updated" value={fmtDate(latest.recorded_date)} icon={Calendar} mono={false} />
          </div>
          <div className="agri-card p-5 mb-6">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold">Price History</h3>
              <Badge tone="gray">Recorded Market Prices</Badge>
            </div>
            <p className="text-xs mb-4" style={{ color: "var(--text-faint)" }}>
              Historical prices recorded in the database — this is not a price prediction.
            </p>
            <div style={{ width: "100%", height: 220 }}>
              <ResponsiveContainer>
                <LineChart data={chartData} margin={{ left: -20, right: 10, top: 5 }}>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--text-faint)" }} axisLine={{ stroke: "var(--border)" }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "var(--text-faint)" }} axisLine={false} tickLine={false} width={45} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 4, border: "1px solid var(--border)" }} formatter={(v) => [`KES ${v}`, "Price/kg"]} />
                  <Line type="monotone" dataKey="price" stroke="var(--primary)" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="agri-card">
            <div className="agri-table-wrap">
              <table className="agri-table">
                <thead>
                  <tr><th>Market</th><th>Bean Variety</th><th>Price/kg</th><th>Date</th><th>Source</th></tr>
                </thead>
                <tbody>
                  {[...rows].reverse().map((r, i) => (
                    <tr key={i}>
                      <td>{r.market_name}</td>
                      <td>{beanShort(r.bean_variety)}</td>
                      <td className="mono font-semibold">{fmtKES(r.price_per_kg)}</td>
                      <td>{fmtDate(r.recorded_date)}</td>
                      <td><Badge tone="gray">{r.source}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ============================================================================
   ORDERS
   ========================================================================== */
function Orders() {
  const { push } = useToast();
  const [filter, setFilter] = useState("all");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = filter === "all" ? {} : { status: filter.toLowerCase() };
      const data = await getOrders(params);
      setRows(data.orders || []);
    } catch (err) {
      push(err.message || "Failed to load orders", "red");
    } finally {
      setLoading(false);
    }
  }, [filter, push]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (orderId, status) => {
    try {
      await updateOrderStatus(orderId, status);
      push(`Order marked as ${status}`, "green");
      load();
    } catch (err) {
      push(err.message || "Failed to update order", "red");
    }
  };

  return (
    <div>
      <SectionHeading title="Orders" subtitle="Manage orders involving your produce and purchased inputs." />
      <div className="flex gap-2 mb-5 overflow-x-auto agri-scroll pb-1">
        {["all", "Pending", "Confirmed", "Processing", "Completed", "Cancelled"].map((s) => (
          <button key={s} onClick={() => setFilter(s)} className="agri-btn agri-btn-sm"
            style={{ background: filter === s ? "var(--primary)" : "var(--surface)", color: filter === s ? "#fff" : "var(--text)", border: "1px solid var(--border-strong)" }}>
            {s === "all" ? "All" : s}
          </button>
        ))}
      </div>
      {loading ? (
        <PageSkeleton rows={3} />
      ) : rows.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No orders" body="Orders you place or receive will appear here." />
      ) : (
        <div className="agri-card">
          <div className="agri-table-wrap">
            <table className="agri-table">
              <thead>
                <tr><th>Order ID</th><th>Item</th><th>Counterparty</th><th>Quantity</th><th>Amount</th><th>Date</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                {rows.map((o) => (
                  <tr key={o.id}>
                    <td className="mono">{o.id}</td>
                    <td className="font-medium">{o.item}</td>
                    <td>{o.counterparty}</td>
                    <td className="mono">{o.quantity}</td>
                    <td className="mono font-semibold">{fmtKES(o.amount)}</td>
                    <td>{fmtDate(o.date)}</td>
                    <td><Badge tone={statusTone(o.status)}>{o.status}</Badge></td>
                    <td>
                      {o.status === "Pending" && (
                        <Button size="sm" variant="ghost" onClick={() => updateStatus(o.id.replace("ORD-", ""), "confirmed")}>Confirm</Button>
                      )}
                      {o.status === "Confirmed" && (
                        <Button size="sm" variant="ghost" onClick={() => updateStatus(o.id.replace("ORD-", ""), "processing")}>Process</Button>
                      )}
                      {o.status === "Processing" && (
                        <Button size="sm" variant="ghost" onClick={() => updateStatus(o.id.replace("ORD-", ""), "completed")}>Complete</Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================================
   TRANSACTIONS
   ========================================================================== */
function Transactions() {
  const { push } = useToast();
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const params = {};
        if (status !== "all") params.status = status.toLowerCase();
        const data = await getOrders(params);
        if (cancelled) return;
        let list = (data.orders || []).map((o) => ({
          id: `TXN-${o.id.replace("ORD-", "")}`,
          date: o.date,
          type: o.counterparty.includes("(Seller)") ? "Input Purchase" : "Produce Sale",
          description: `${o.item} · ${o.counterparty}`,
          amount: o.counterparty.includes("(Seller)") ? -o.amount : o.amount,
          status: o.status,
        }));
        if (type !== "all") list = list.filter((t) => t.type === type);
        setRows(list);
      } catch (err) {
        push(err.message || "Failed to load transactions", "red");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [type, status, push]);

  return (
    <div>
      <SectionHeading title="Transactions" subtitle="A record of your marketplace transactions." />
      <div className="agri-card p-4 mb-5 grid sm:grid-cols-3 gap-3">
        <Field label="Transaction type">
          <select className="agri-select" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="all">All types</option>
            <option>Produce Sale</option>
            <option>Input Purchase</option>
          </select>
        </Field>
        <Field label="Status">
          <select className="agri-select" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All statuses</option>
            <option>Pending</option>
            <option>Processing</option>
            <option>Completed</option>
            <option>Cancelled</option>
          </select>
        </Field>
        <Field label="Date"><input className="agri-input" type="date" /></Field>
      </div>
      {loading ? (
        <PageSkeleton rows={3} />
      ) : rows.length === 0 ? (
        <EmptyState icon={Receipt} title="No transactions" body="Your transaction history will appear here." />
      ) : (
        <div className="agri-card">
          <div className="agri-table-wrap">
            <table className="agri-table">
              <thead>
                <tr><th>Transaction ID</th><th>Date</th><th>Type</th><th>Description</th><th>Amount</th><th>Status</th></tr>
              </thead>
              <tbody>
                {rows.map((t) => (
                  <tr key={t.id}>
                    <td className="mono">{t.id}</td>
                    <td>{fmtDate(t.date)}</td>
                    <td>{t.type}</td>
                    <td>{t.description}</td>
                    <td className="mono font-semibold" style={{ color: t.amount < 0 ? "var(--red)" : "var(--primary)" }}>
                      {t.amount === 0 ? "—" : `${t.amount < 0 ? "-" : "+"}${fmtKES(Math.abs(t.amount))}`}
                    </td>
                    <td><Badge tone={statusTone(t.status)}>{t.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================================
   PROFILE
   ========================================================================== */
function Profile({ user, onUserUpdate }) {
  const { push } = useToast();
  const { open } = useModal();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ full_name: "", phone_number: "", county: "" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getProfile();
        if (cancelled) return;
        setProfile(data.user);
        setForm({
          full_name: data.user.full_name || "",
          phone_number: data.user.phone_number || "",
          county: data.user.county || "",
        });
      } catch (err) {
        push(err.message || "Failed to load profile", "red");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [push]);

  const save = async () => {
    setSaving(true);
    try {
      const data = await updateProfile(form);
      push("Profile changes saved", "green");
      setProfile(data.user);
      if (onUserUpdate) onUserUpdate(data.user);
    } catch (err) {
      open({
        tone: "error",
        title: "Could not save profile",
        body: err.message || "Please try again.",
        confirmLabel: "Close",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageSkeleton rows={1} />;
  if (!profile) return null;

  return (
    <div className="max-w-lg">
      <SectionHeading title="Profile" subtitle="Manage your account information." />
      <div className="agri-card p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold" style={{ background: "var(--primary-soft)", color: "var(--primary-dark)" }}>
            {profile.full_name.split(" ").map((p) => p[0]).join("").slice(0, 2)}
          </div>
          <div>
            <div className="font-bold">{profile.full_name}</div>
            <div className="text-sm capitalize" style={{ color: "var(--text-muted)" }}>
              {profile.role} · {profile.county || "—"}
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <Field label="Full name">
            <input className="agri-input" value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} />
          </Field>
          <Field label="Phone number">
            <input className="agri-input" value={form.phone_number} onChange={(e) => setForm((f) => ({ ...f, phone_number: e.target.value }))} />
          </Field>
          <Field label="County">
            <input className="agri-input" value={form.county} onChange={(e) => setForm((f) => ({ ...f, county: e.target.value }))} />
          </Field>
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save Changes"}</Button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   ADMIN
   ========================================================================== */
function AdminDashboard({ goto }) {
  const [stats, setStats] = useState({ farmers: 0, buyers: 0, listings: 0, users: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [usersRes, pricesRes] = await Promise.all([adminListUsers(), adminListPrices()]);
        if (cancelled) return;
        const users = usersRes.users || [];
        setStats({
          farmers: users.filter((u) => u.role === "farmer").length,
          buyers: users.filter((u) => u.role === "buyer").length,
          listings: 0,
          users,
        });
        void pricesRes;
      } catch (err) {
        console.warn("Admin dashboard load failed", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) return <PageSkeleton rows={6} />;

  const pending = stats.users.filter((u) => !u.verified);

  return (
    <div>
      <SectionHeading title="Admin Dashboard" subtitle="Platform overview and management." />
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-7">
        <StatCard label="Total Farmers" value={stats.farmers} icon={Sprout} />
        <StatCard label="Total Buyers" value={stats.buyers} icon={Users} />
        <StatCard label="Total Users" value={stats.users.length} icon={User} />
      </div>
      <div className="grid lg:grid-cols-2 gap-5">
        <div className="agri-card p-5">
          <h3 className="font-semibold mb-4">Pending Verifications</h3>
          {pending.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--text-faint)" }}>No pending verifications.</p>
          ) : (
            <div className="space-y-3">
              {pending.slice(0, 5).map((u) => (
                <div key={u.user_id} className="flex items-center justify-between text-sm">
                  <div>
                    <div className="font-medium">{u.full_name}</div>
                    <div className="text-xs" style={{ color: "var(--text-faint)" }}>{u.role} · {u.county || "—"}</div>
                  </div>
                  <Button size="sm" icon={ShieldCheck} onClick={() => goto("admin-users")}>Review</Button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="agri-card p-5">
          <h3 className="font-semibold mb-4">Quick Actions</h3>
          <div className="space-y-2">
            <Button className="agri-btn-block" onClick={() => goto("admin-prices")}>Manage Market Price Data</Button>
            <Button className="agri-btn-block" variant="secondary" onClick={() => goto("admin-users")}>Manage Users</Button>
            <Button className="agri-btn-block" variant="secondary" onClick={() => goto("marketplace")}>Review Produce Listings</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminUsers() {
  const { push } = useToast();
  const { open } = useModal();
  const [filter, setFilter] = useState("all");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminListUsers(filter === "all" ? null : filter);
      setRows(data.users || []);
    } catch (err) {
      push(err.message || "Failed to load users", "red");
    } finally {
      setLoading(false);
    }
  }, [filter, push]);

  useEffect(() => { load(); }, [load]);

  const verify = async (id, name) => {
    const ok = await confirm({
      tone: "info",
      title: `Verify ${name}?`,
      body: "Verified users get a trust badge on the platform.",
      confirmLabel: "Verify",
      cancelLabel: "Cancel",
    });
    if (!ok) return;
    try {
      await adminVerifyUser(id);
      push(`${name} verified`, "green");
      load();
    } catch (err) {
      push(err.message || "Failed to verify user", "red");
    }
  };

  return (
    <div>
      <SectionHeading title="Manage Users" subtitle="View and verify farmers, buyers, and sellers on the platform." />
      <div className="flex gap-2 mb-5">
        {["all", "farmer", "buyer", "supplier"].map((r) => (
          <button key={r} onClick={() => setFilter(r)} className="agri-btn agri-btn-sm"
            style={{
              background: filter === r ? "var(--primary)" : "var(--surface)",
              color: filter === r ? "#fff" : "var(--text)",
              border: "1px solid var(--border-strong)",
              textTransform: "capitalize",
            }}>
            {r === "all" ? "All" : `${r}s`}
          </button>
        ))}
      </div>
      {loading ? (
        <PageSkeleton rows={3} />
      ) : rows.length === 0 ? (
        <EmptyState icon={Users} title="No users" body="No users match this filter." />
      ) : (
        <div className="agri-card">
          <div className="agri-table-wrap">
            <table className="agri-table">
              <thead>
                <tr><th>ID</th><th>Name</th><th>Email</th><th>Role</th><th>County</th><th>Joined</th><th></th></tr>
              </thead>
              <tbody>
                {rows.map((u) => (
                  <tr key={u.user_id}>
                    <td className="mono">{String(u.user_id).slice(0, 8)}</td>
                    <td className="font-medium">{u.full_name}</td>
                    <td>{u.email}</td>
                    <td className="capitalize">{u.role}</td>
                    <td>{u.county || "—"}</td>
                    <td>{fmtDate(u.created_at)}</td>
                    <td>
                      <Button size="sm" icon={ShieldCheck} onClick={() => verify(u.user_id, u.full_name)}>Verify</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function AdminMarketPrices() {
  const { push } = useToast();
  const { open } = useModal();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    market_name: "", county: "", bean_variety: "Kenya Umoja", price_per_kg: "", recorded_date: "", source: "",
  });
  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminListPrices();
      setRows(data.prices || []);
    } catch (err) {
      push(err.message || "Failed to load price records", "red");
    } finally {
      setLoading(false);
    }
  }, [push]);

  useEffect(() => { load(); }, [load]);

  const addRecord = async () => {
    if (!form.market_name || !form.price_per_kg || !form.recorded_date) {
      push("Please fill market, price, and date", "amber");
      return;
    }
    setSaving(true);
    try {
      await adminCreatePrice({
        market_name: form.market_name,
        county: form.county || null,
        bean_variety: form.bean_variety,
        price_per_kg: Number(form.price_per_kg),
        recorded_date: form.recorded_date,
        source: form.source || "Manual entry",
      });
      open({
        tone: "success",
        title: "Price record saved",
        body: "The new record is now live on the public Market Prices page.",
        confirmLabel: "Done",
      });
      setForm({ market_name: "", county: "", bean_variety: "Kenya Umoja", price_per_kg: "", recorded_date: "", source: "" });
      load();
    } catch (err) {
      open({
        tone: "error",
        title: "Could not save price record",
        body: err.message || "Please try again.",
        confirmLabel: "Close",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <SectionHeading title="Market Price Data Management" subtitle="Add and manage recorded bean market prices. This data feeds the public Market Price Dashboard." />
      <div className="grid lg:grid-cols-3 gap-5">
        <div className="agri-card p-5 lg:col-span-1 h-fit">
          <h3 className="font-semibold mb-4">Record a New Price</h3>
          <div className="space-y-3">
            <Field label="Market"><input className="agri-input" value={form.market_name} onChange={(e) => update("market_name", e.target.value)} placeholder="e.g. Nairobi" /></Field>
            <Field label="County"><input className="agri-input" value={form.county} onChange={(e) => update("county", e.target.value)} placeholder="e.g. Nairobi" /></Field>
            <Field label="Bean variety">
              <select className="agri-select" value={form.bean_variety} onChange={(e) => update("bean_variety", e.target.value)}>
                {BEAN_VARIETIES.map((v) => (
                  <option key={v.value} value={v.value}>{v.label} · {v.code}</option>
                ))}
              </select>
            </Field>
            <Field label="Price (KES)"><input className="agri-input" type="number" value={form.price_per_kg} onChange={(e) => update("price_per_kg", e.target.value)} /></Field>
            <Field label="Date"><input className="agri-input" type="date" value={form.recorded_date} onChange={(e) => update("recorded_date", e.target.value)} /></Field>
            <Field label="Data source"><input className="agri-input" placeholder="e.g. WFP, NCPB, field survey" value={form.source} onChange={(e) => update("source", e.target.value)} /></Field>
            <Button className="agri-btn-block" onClick={addRecord} disabled={saving}>{saving ? "Saving…" : "Save Price Record"}</Button>
          </div>
        </div>
        <div className="agri-card lg:col-span-2">
          {loading ? (
            <div className="p-5"><PageSkeleton rows={1} /></div>
          ) : rows.length === 0 ? (
            <div className="p-5"><EmptyState icon={TrendingUp} title="No price records" body="Add the first price record using the form on the left." /></div>
          ) : (
            <div className="agri-table-wrap">
              <table className="agri-table">
                <thead>
                  <tr><th>Market</th><th>County</th><th>Variety</th><th>Price/kg</th><th>Date</th><th>Source</th></tr>
                </thead>
                <tbody>
                  {rows.slice(0, 30).map((r) => (
                    <tr key={r.price_id}>
                      <td>{r.market_name}</td>
                      <td>{r.county || "—"}</td>
                      <td>{beanShort(r.bean_variety)}</td>
                      <td className="mono font-semibold">{fmtKES(r.price_per_kg)}</td>
                      <td>{fmtDate(r.recorded_date)}</td>
                      <td><Badge tone="gray">{r.source}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AdminReports() {
  const { push } = useToast();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await adminListReports();
        if (!cancelled) setReports(data.reports || []);
      } catch (err) {
        push(err.message || "Failed to load reports", "red");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [push]);

  if (loading) return <PageSkeleton rows={3} />;

  return (
    <div>
      <SectionHeading title="Reports" subtitle="Review listings flagged by farmers, buyers, or the platform." />
      {reports.length === 0 ? (
        <EmptyState icon={Flag} title="No reports" body="Nothing has been flagged yet." />
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <div key={r.id} className="agri-card p-4 flex items-center gap-4 flex-wrap">
              <Flag size={17} style={{ color: "var(--red)" }} />
              <div className="flex-1 min-w-[180px]">
                <div className="font-semibold text-sm">{r.listing}</div>
                <div className="text-xs" style={{ color: "var(--text-muted)" }}>{r.reason}</div>
              </div>
              <Badge tone={r.status === "Open" ? "amber" : "green"}>{r.status}</Badge>
              <Button size="sm" variant="secondary" onClick={() => push("Review flow coming soon", "amber")}>Review Listing</Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================================================================
   GUEST WRAPPER
   ========================================================================== */
function GuestPage({ children, page, goto, goLogin, goRegister }) {
  return (
    <div className="agri-root min-h-screen">
      <GuestHeader page={page} goto={goto} goLogin={goLogin} goRegister={goRegister} />
      <div className="max-w-6xl mx-auto p-4 md:p-7">{children}</div>
    </div>
  );
}

/* ============================================================================
   ROOT APP
   ========================================================================== */
export default function App() {
  const [session, setSession] = useState(null);
  const [page, setPage] = useState("landing");
  const [authMode, setAuthMode] = useState("login");
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("beanlink_token");
    const storedUser = localStorage.getItem("beanlink_user");
    if (token && storedUser) {
      setSession(JSON.parse(storedUser));
      setPage("dashboard");
    }
  }, []);

  const goto = (p, item) => {
    if (p === "register") { setAuthMode("register"); setPage("login"); }
    else if (p === "login") { setAuthMode("login"); setPage("login"); }
    else { setPage(p); }
    setSelectedItem(item || null);
    window.scrollTo?.(0, 0);
  };

  const goLogin = () => goto("login");
  const goRegister = () => goto("register");

  const handleLogin = (user) => {
    setSession(user);
    setPage("dashboard");
  };

  const handleUserUpdate = (user) => {
    const merged = { ...session, ...user };
    localStorage.setItem("beanlink_user", JSON.stringify(merged));
    setSession(merged);
  };

  const handleLogout = () => {
    localStorage.removeItem("beanlink_token");
    localStorage.removeItem("beanlink_user");
    setSession(null);
    setPage("landing");
  };

 if (!session) {
  let guestContent = null;

  if (page === "landing") {
    guestContent = <Landing goto={goto} goLogin={goLogin} goRegister={goRegister} />;
  } else if (page === "login") {
    guestContent = <Login goto={goto} onLogin={handleLogin} mode={authMode} setMode={setAuthMode} />;
  } else if (page === "about") {
    guestContent = <AboutPage goto={goto} goLogin={goLogin} goRegister={goRegister} />;
  } else if (page === "marketplace" || page === "guest-produce") {
    guestContent = (
      <GuestPage page="guest-produce" goto={goto} goLogin={goLogin} goRegister={goRegister}>
        <Marketplace goto={goto} guest />
      </GuestPage>
    );
  } else if (page === "guest-prices") {
    guestContent = (
      <GuestPage page="guest-prices" goto={goto} goLogin={goLogin} goRegister={goRegister}>
        <MarketPrices guest goto={goto} />
      </GuestPage>
    );
  } else if (page === "input-detail") {
    guestContent = (
      <GuestPage page="guest-produce" goto={goto} goLogin={goLogin} goRegister={goRegister}>
        <InputDetail item={selectedItem} goto={goto} guest />
      </GuestPage>
    );
  } else if (page === "produce-detail") {
    guestContent = (
      <GuestPage page="guest-produce" goto={goto} goLogin={goLogin} goRegister={goRegister}>
        <ProduceDetail item={selectedItem} goto={goto} guest />
      </GuestPage>
    );
  } else {
    guestContent = <Landing goto={goto} goLogin={goLogin} goRegister={goRegister} />;
  }

  return (
    <ToastHost>
      <ModalHost>
        <GlobalStyle />
        {guestContent}
      </ModalHost>
    </ToastHost>
  );
}

  const role = session.role;

  const renderPage = () => {
    switch (page) {
      case "dashboard":
        if (role === "farmer") return <FarmerDashboard goto={goto} user={session} />;
        if (role === "buyer") return <BuyerDashboard goto={goto} user={session} />;
        if (role === "supplier") return <SupplierDashboard goto={goto} user={session} />;
        return <AdminDashboard goto={goto} />;
      case "recommendation": return <InputRecommendation />;
      case "marketplace": return <Marketplace goto={goto} />;
      case "input-detail": return <InputDetail item={selectedItem} goto={goto} />;
      case "produce-detail": return <ProduceDetail item={selectedItem} goto={goto} />;
      case "my-listings":   return <MyListings goto={goto} role={role} />;
case "list-produce":  return <ListForm goto={goto} role="farmer" />;
case "list-input":    return <ListForm goto={goto} role="supplier" />;
      case "prices": return <MarketPrices goto={goto} />;
      case "orders": return <Orders />;
      case "transactions": return <Transactions />;
      case "profile": return <Profile user={session} onUserUpdate={handleUserUpdate} />;
      case "admin-users": return <AdminUsers />;
      case "admin-prices": return <AdminMarketPrices />;
      case "admin-reports": return <AdminReports />;
      default:
        if (role === "farmer") return <FarmerDashboard goto={goto} user={session} />;
        if (role === "buyer") return <BuyerDashboard goto={goto} user={session} />;
        if (role === "supplier") return <SupplierDashboard goto={goto} user={session} />;
        return <AdminDashboard goto={goto} />;
    }
  };

  return (
    <ToastHost>
      <ModalHost>
        <GlobalStyle />
        <AppShell role={role} user={session} page={page} goto={goto} onLogout={handleLogout}>
          {renderPage()}
        </AppShell>
      </ModalHost>
    </ToastHost>
  );
}
