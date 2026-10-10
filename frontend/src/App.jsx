import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Home, ShoppingBag, Sprout, Package, TrendingUp, ClipboardList, Receipt,
  User, Search, Bell, Menu, X, ChevronRight, ChevronLeft,
  MapPin, Calendar, CheckCircle2, Clock, AlertCircle, Plus,
  ArrowLeft, LogOut, Users, ShieldCheck, Flag, Leaf, Wheat,
  Beaker, Tractor, ShieldAlert, PauseCircle, Trash2, Pencil, Info
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
  initiateMpesaPush, getPaymentStatus,getOrder, setFulfillment, sellerAdvance, buyerConfirm,
  adminGetStats
} from "./api";
import { BEAN_VARIETIES, beanLabel, beanShort } from "./constants/varieties";
import { INPUT_CATEGORIES, CATEGORY_FILTERS } from "./constants/inputCategories";
import { NAV_BY_ROLE } from "./constants/nav";
import { fmtKES, fmtDate, statusTone } from "./utility";
import GlobalStyle from "./styles/GlobalStyles";
import { ModalHost, useModal } from "./contexts/ModalContext";
import Button from "./components/button"; 
import Badge from "./components/Badge";
import SectionHeading from "./components/SectionHeading";
import HeroSlideshow from "./components/HeroSlideshow";
import { ToastHost, useToast } from "./contexts/ToastContext";
import PageSkeleton from "./components/PageSkeleton";
import CountUp from "./components/CountUp";
import EmptyState from "./components/EmptyState";
import StatCard from "./components/StatCard";
import Field from "./components/Field";
import RecommendedInputCard from "./components/RecommendedInputCard";

/* ============================================================================
   PAYMENT MODAL — phone input → STK push → poll → confirm
   ========================================================================== */
function PaymentModal({ open, listing, quantity, onClose, onSuccess, goto }) {
  const { push } = useToast();
  const [stage, setStage] = useState("fulfillment");
  const [method, setMethod] = useState("pickup");
  const [address, setAddress] = useState("");
  const [landmark, setLandmark] = useState("");
  const [phone, setPhone] = useState("");
  const [receipt, setReceipt] = useState(null);
  const [error, setError] = useState("");
  const [orderId, setOrderId] = useState(null);
  const pollRef = React.useRef(null);

  useEffect(() => {
    if (open) {
      setStage("fulfillment");
      setMethod("pickup");
      setAddress("");
      setLandmark("");
      setPhone("");
      setReceipt(null);
      setError("");
      setOrderId(null);
    }
  }, [open]);

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  if (!open) return null;

  const validatePhone = (v) => /^254\d{9}$/.test(v) || /^0\d{9}$/.test(v);
  const normalisePhone = (v) => (v.startsWith("0") ? `254${v.slice(1)}` : v);

  const goToPhone = () => {
    if (method === "delivery" && !address.trim()) {
      setError("Please enter a delivery address.");
      return;
    }
    setError("");
    setStage("phone");
  };

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

      // 2. Persist fulfillment choice
      await setFulfillment(txnId, {
        method,
        address: method === "delivery" ? address : null,
        landmark: method === "delivery" ? landmark : null,
      });

      // 3. STK push
      await initiateMpesaPush(txnId, normalisePhone(phone));

      // 4. Poll
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
        } catch {}
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
      <div onClick={close} style={{ position: "absolute", inset: 0, background: "rgba(15, 25, 18, 0.65)" }} />
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
            <div className="w-10 h-10 rounded flex items-center justify-center shrink-0" style={{ background: "var(--primary-soft)" }}>
              <Receipt size={20} style={{ color: "var(--primary)" }} />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-base mb-0.5">
                {stage === "fulfillment" && "How would you like to receive this?"}
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

          {stage === "fulfillment" && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "pickup", label: "Pickup", icon: MapPin, desc: "Collect from the seller" },
                  { id: "delivery", label: "Delivery", icon: Package, desc: "Sent to your address" },
                ].map((opt) => {
                  const active = method === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => setMethod(opt.id)}
                      className="agri-card p-3 text-left"
                      style={{
                        borderColor: active ? "var(--primary)" : "var(--border)",
                        background: active ? "var(--primary-soft)" : "var(--surface)",
                        cursor: "pointer",
                      }}
                    >
                      <opt.icon size={16} style={{ color: active ? "var(--primary)" : "var(--text-muted)" }} />
                      <div className="font-semibold text-sm mt-1.5">{opt.label}</div>
                      <div className="text-xs" style={{ color: "var(--text-muted)" }}>{opt.desc}</div>
                    </button>
                  );
                })}
              </div>

              {method === "delivery" && (
                <>
                  <Field label="Delivery address" hint="Street, estate, or building.">
                    <input
                      className="agri-input"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="e.g. Ngong Road, Kilimani"
                    />
                  </Field>
                  <Field label="Landmark (optional)">
                    <input
                      className="agri-input"
                      value={landmark}
                      onChange={(e) => setLandmark(e.target.value)}
                      placeholder="e.g. Next to Yaya Centre"
                    />
                  </Field>
                </>
              )}

              {error && (
                <div className="text-sm p-2.5 rounded"
                     style={{ background: "var(--red-soft)", color: "var(--red)", border: "1px solid var(--red-border)" }}>
                  {error}
                </div>
              )}
            </div>
          )}

          {stage === "phone" && (
            <div className="space-y-3">
              <Field label="M-Pesa phone number" hint="You'll receive a prompt to enter your PIN.">
                <input
                  className="agri-input"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0712 345 678"
                  autoFocus
                />
              </Field>
              {error && (
                <div className="text-sm p-2.5 rounded"
                     style={{ background: "var(--red-soft)", color: "var(--red)", border: "1px solid var(--red-border)" }}>
                  {error}
                </div>
              )}
              <div className="p-3 rounded text-xs"
                   style={{ background: "var(--surface-alt)", color: "var(--text-muted)" }}>
                Total:{" "}
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
              <p>Check your phone. Enter your M-Pesa PIN on the prompt that just appeared.</p>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-2 h-2 rounded-full" style={{ background: "var(--amber)" }} />
                <span>Waiting for confirmation… this can take up to 30 seconds.</span>
              </div>
            </div>
          )}

          {stage === "success" && (
            <div className="space-y-3 text-sm">
              <div className="p-3 rounded flex items-start gap-2"
                   style={{ background: "var(--primary-soft)", border: "1px solid var(--primary-soft-border)", color: "var(--primary-dark)" }}>
                <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold mb-0.5">Order confirmed</div>
                  <div className="text-xs">Receipt: <span className="mono">{receipt}</span></div>
                </div>
              </div>
              <p style={{ color: "var(--text-muted)" }}>
                The seller has been notified. Track this order from the Orders page.
              </p>
            </div>
          )}

          {stage === "failed" && (
            <div className="text-sm" style={{ color: "var(--text-muted)" }}>{error}</div>
          )}
        </div>

        <div className="px-5 py-3 border-t flex justify-end gap-2"
             style={{ borderColor: "var(--border)", background: "#FBFBF8" }}>
          {stage === "fulfillment" && (
            <>
              <Button variant="secondary" size="sm" onClick={close}>Cancel</Button>
              <Button size="sm" onClick={goToPhone}>Continue</Button>
            </>
          )}
          {stage === "phone" && (
            <>
              <Button variant="secondary" size="sm" onClick={() => setStage("fulfillment")}>Back</Button>
              <Button size="sm" onClick={submit}>Send STK push</Button>
            </>
          )}
          {stage === "pushing" && <Button variant="secondary" size="sm" disabled>Please wait…</Button>}
          {stage === "waiting" && <Button variant="secondary" size="sm" onClick={close}>I'll confirm later</Button>}
          {stage === "success" && <Button size="sm" onClick={done}>View my orders</Button>}
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
function InputRecommendation({ goto, initialResult = null, onResult = null }) {
  const { open } = useModal();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(initialResult); // restores the App-level result on return
  const [marketplaceListings, setMarketplaceListings] = useState([]);
  const [history, setHistory] = useState([]);
  const [form, setForm] = useState({
    beanVariety: "Kenya Umoja",
    season: "Long Rains",
    county: "Machakos",
  });
  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));
 
  // Load the farmer's saved recommendations once.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getRecommendationHistory();
        if (!cancelled) setHistory(data.recommendations || []);
      } catch {
        if (!cancelled) setHistory([]);
      }
    })();
    return () => { cancelled = true; };
  }, []);
 
  // Reload the history after a new recommendation is saved.
  const refreshHistory = async () => {
    try {
      const data = await getRecommendationHistory();
      setHistory(data.recommendations || []);
    } catch {
      // keep the list we already have
    }
  };
 
  const submit = async () => {
    setLoading(true);
    try {
      const data = await getRecommendation({
        variety: form.beanVariety,
        season: form.season,
        county: form.county,
      });
      setResult(data);
      if (onResult) onResult(data);
      refreshHistory(); // not awaited, so the result shows straight away
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
 
  // Rebuild the result view from a saved record.
  const openFromHistory = (h) => {
    setResult({
      recommendation: {
        seed: h.recommended_seed || h.variety, // variety is an input now, so recommended_seed may be empty
        fertilizer: h.recommended_fertilizer,
        soilAmendment: h.recommended_lime,
        inoculation: h.recommended_inoculation,
      },
      explanation: Array.isArray(h.shap_values) ? h.shap_values : [],
      summary: h.summary || "",
      disclaimer: "This is a saved recommendation from your history. Absolute yields vary by site.",
    });
    if (onResult) onResult(null); // clear the App-level copy of the latest result
  };
 
  // When a recommendation is on screen, fetch marketplace listings once so the
  // input cards can check availability locally.
  useEffect(() => {
    if (!result) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await getMarketplace({});
        if (!cancelled) setMarketplaceListings(data.listings || []);
      } catch {
        if (!cancelled) setMarketplaceListings([]);
      }
    })();
    return () => { cancelled = true; };
  }, [result]);
 
  if (loading) {
    return (
      <div className="max-w-2xl">
        <SectionHeading
          eyebrow="Smart Advice"
          title="Working out your advice…"
          subtitle="Checking your answers against the trial results."
        />
        <div className="space-y-3">
          <div className="agri-skel h-6 w-56" />
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="agri-skel h-32" />
            <div className="agri-skel h-32" />
            <div className="agri-skel h-32" />
          </div>
          <div className="agri-skel h-40" />
          <div className="agri-skel h-10 w-48" />
        </div>
      </div>
    );
  }
 
  if (result) {
    const rec = result.recommendation || {};
    const explanation = Array.isArray(result.explanation) ? result.explanation : [];
    const alternatives = Array.isArray(result.alternatives) ? result.alternatives : [];
 
    // Bars show relative importance: the biggest factor is 100%, the rest scale from it.
    // Absolute values, because SHAP-style weights can be negative.
    const weights = explanation.map((e) => Math.abs(Number(e.weight) || 0));
    const maxWeight = Math.max(1e-6, ...weights);
 
    // Specific search terms only. Generic words like "seed" or "fertilizer" would
    // make any listing count as a match, so they are left out.
    const seedTerms = [beanShort(rec.seed), rec.seed].filter(Boolean);
    const fertilizerTerms = [rec.fertilizer].filter(Boolean);
    const limeTerms = rec.soilAmendment === "With lime" ? ["lime", "agricultural lime"] : [];
    const inocTerms = rec.inoculation === "Inoculated" ? ["biofix", "inoculant", "rhizobium"] : [];
    const limeAndInocTerms = [...limeTerms, ...inocTerms]; // empty when advice is "Without lime" and "Not inoculated"
 
    return (
      <div className="max-w-2xl">
        <SectionHeading
          eyebrow="Smart Advice"
          title="What to use on your farm"
          subtitle="Based on 25 bean farm tests done in Kenya between 2010 and 2012."
        />
 
        {/* Recommendation cards: each resolves to Buy or Agrovet */}
        <div className="grid sm:grid-cols-3 gap-3 mb-6">
          <RecommendedInputCard
            icon={Sprout}
            label="Your variety"
            value={beanLabel(rec.seed) || "—"}
            note="Confirm this is what you are planting."
            searchTerms={seedTerms}
            marketplaceListings={marketplaceListings}
            goto={goto}
          />
          <RecommendedInputCard
            icon={Beaker}
            label="Use this fertilizer"
            value={rec.fertilizerDisplay || rec.fertilizer || "—"}
            searchTerms={fertilizerTerms}
            marketplaceListings={marketplaceListings}
            goto={goto}
          />
          <RecommendedInputCard
            icon={Leaf}
            label="Lime & seed treatment"
            value={`${rec.soilAmendmentDisplay || rec.soilAmendment || "—"} · ${
              rec.inoculationDisplay || rec.inoculation || "—"
            }`}
            searchTerms={limeAndInocTerms}
            marketplaceListings={marketplaceListings}
            goto={goto}
          />
        </div>
 
        {/* Why we suggest this: relative weighting, not kg/ha */}
        {explanation.length > 0 && (
          <div className="agri-card p-5 mb-5">
            <div className="flex items-center gap-2 mb-2">
              <Info size={15} style={{ color: "var(--primary)" }} />
              <span className="text-sm font-semibold">Why we suggest this</span>
            </div>
            {result.summary && (
              <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
                {result.summary}
              </p>
            )}
 
            <div
              className="p-3 rounded mb-4 text-xs"
              style={{ background: "var(--surface-alt)", color: "var(--text-muted)" }}
            >
              Longer bars mean the factor mattered more in the recommendation.
              This shows relative weighting only, not a prediction of your harvest.
            </div>
 
            <div className="space-y-3">
              {explanation.map((e, i) => {
                const pct = Math.round((weights[i] / maxWeight) * 100);
                return (
                  <div key={i}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium">{e.factor}</span>
                      <span className="mono" style={{ color: "var(--text-muted)" }}>
                        {pct}%
                      </span>
                    </div>
                    <div className="agri-bar-track">
                      <div className="agri-bar-fill" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
 
        {/* Alternatives */}
        {alternatives.length > 0 && (
          <div className="agri-card p-5 mb-5">
            <h3 className="font-semibold mb-3">Other mixes we tested</h3>
            <div className="agri-table-wrap">
              <table className="agri-table">
                <thead>
                  <tr>
                    <th>Fertilizer</th>
                    <th>Lime</th>
                    <th>Seed treatment</th>
                  </tr>
                </thead>
                <tbody>
                  {alternatives.map((a, i) => (
                    <tr key={i}>
                      <td>{a.fertilizerDisplay || a.fertilizer}</td>
                      <td>{a.limeDisplay || a.lime}</td>
                      <td>{a.inoculationDisplay || a.inoculation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
 
        {result.disclaimer && (
          <div
            className="p-3 rounded mb-5 text-xs"
            style={{ background: "var(--surface-alt)", color: "var(--text-muted)" }}
          >
            {result.disclaimer}
          </div>
        )}
 
        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={() => {
              setResult(null);
              if (onResult) onResult(null);
            }}
          >
            Try another farm
          </Button>
          {/* the route name must match a case in renderPage */}
          <Button variant="secondary" icon={ShoppingBag} onClick={() => goto("marketplace")}>
            Browse all inputs
          </Button>
        </div>
      </div>
    );
  }
 
  return (
    <div className="max-w-xl">
      <SectionHeading
        eyebrow="Smart Advice"
        title="Get advice for your farm"
        subtitle="Tell us three things and we'll suggest the best inputs to use."
      />
 
      <div className="agri-card p-5 space-y-4">
        <Field label="Bean variety" hint="The code after each name is the trial line code.">
          <select
            className="agri-select"
            value={form.beanVariety}
            onChange={(e) => update("beanVariety", e.target.value)}
          >
            {BEAN_VARIETIES.map((v) => (
              <option key={v.value} value={v.value}>
                {v.label}  ·  {v.code}
              </option>
            ))}
          </select>
        </Field>
 
        <Field label="Season" hint="Which rains are you planting for?">
          <select
            className="agri-select"
            value={form.season}
            onChange={(e) => update("season", e.target.value)}
          >
            <option>Long Rains</option>
            <option>Short Rains</option>
          </select>
        </Field>
 
        <Field label="County" hint="We save this with your record. It doesn't change the advice.">
          <input
            className="agri-input"
            value={form.county}
            onChange={(e) => update("county", e.target.value)}
            placeholder="e.g. Machakos"
          />
        </Field>
 
        <Button className="agri-btn-block" onClick={submit} disabled={loading}>
          {loading ? "Working it out…" : "Get Recommendation"}
        </Button>
      </div>
 
      <p className="text-xs mt-3" style={{ color: "var(--text-faint)" }}>
        Recommendations come from a Random Forest model trained on 25 Kenyan bean trials
        (2010–2012). The model ranks input packages against each other; absolute yield
        varies by site.
      </p>
 
      {/* Saved recommendations */}
      {history.length > 0 && (
        <div className="agri-card p-5 mt-5">
          <h3 className="font-semibold mb-3">Your recent recommendations</h3>
          <div className="space-y-3">
            {history.slice(0, 5).map((h) => (
              <button
                key={h.rec_id}
                type="button"
                onClick={() => openFromHistory(h)}
                className="w-full text-left p-3 rounded border flex items-center justify-between gap-3"
                style={{ borderColor: "var(--border)", background: "#FBFBF8", cursor: "pointer" }}
              >
                <div className="min-w-0">
                  <div className="font-semibold text-sm">
                    {beanLabel(h.variety)} · {h.season}
                  </div>
                  <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {h.recommended_fertilizer || "—"}
                    {h.recommended_lime ? ` · ${h.recommended_lime}` : ""}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: "var(--text-faint)" }}>
                    {fmtDate(h.created_at)}
                  </div>
                </div>
                <ChevronRight size={16} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Marketplace({ goto, guest = false, initialSearch = ""}) {
  const { push } = useToast();
  const { confirm } = useModal();
  
  // Marketplace states
  const [category, setCategory] = useState("all");
  const [county, setCounty] = useState("all");
  const [variety, setVariety] = useState("all");
  const [sort, setSort] = useState("recent");
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
const [search, setSearch] = useState(initialSearch || "");
  // Cart state
  const [cart, setCart] = useState(() => {
  try {
    const raw = localStorage.getItem("beanlink_cart");
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
});

useEffect(() => {
  try {
    localStorage.setItem("beanlink_cart", JSON.stringify(cart));
  } catch {
    // storage unavailable (private mode, quota); ignore
  }
}, [cart]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [checkoutItem, setCheckoutItem] = useState(null);
  const [checkoutQty, setCheckoutQty] = useState(1);
  const [paymentOpen, setPaymentOpen] = useState(false);

  useEffect(() => {
    if (category !== "produce" && category !== "all") setVariety("all");
  }, [category]);
useEffect(() => {
  setSearch(initialSearch || "");
}, [initialSearch]);
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
  const counties = ["all", ...new Set(listings.map((p) => p.location).filter(Boolean))];
const visibleListings = React.useMemo(() => {
  if (!search || search === "") return listings;
  const q = search.toLowerCase();
  return listings.filter((l) =>
    `${l.title || ""} ${l.description || ""}`.toLowerCase().includes(q)
  );
}, [listings, search]);
  // Cart functions
  const addToCart = async (item) => {
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

    setCart((prevCart) => {
      const existingIndex = prevCart.findIndex((i) => i.listing_id === item.listing_id);
      if (existingIndex > -1) {
        const updated = [...prevCart];
        const maxAvail = Number(item.quantity_available);
        const newQty = updated[existingIndex].cartQuantity + 1;
        if (newQty > maxAvail) {
          push(`Maximum available stock reached (${maxAvail})`, "amber");
          return prevCart;
        }
        updated[existingIndex].cartQuantity = newQty;
        return updated;
      }
      return [...prevCart, { ...item, cartQuantity: 1 }];
    });

    push(`${item.title || beanLabel(item.variety)} added to cart`, "green");
  };

  const updateCartQuantity = (id, delta) => {
    setCart((prevCart) =>
      prevCart
        .map((item) => {
          if (item.listing_id === id) {
            const maxAvail = Number(item.quantity_available);
            const target = item.cartQuantity + delta;
            if (target > maxAvail) {
              push(`Maximum available stock reached (${maxAvail})`, "amber");
              return item;
            }
            return { ...item, cartQuantity: target };
          }
          return item;
        })
        .filter((item) => item.cartQuantity > 0)
    );
  };

 const removeFromCart = (id, { silent = false } = {}) => {
  setCart((prevCart) => prevCart.filter((i) => i.listing_id !== id));
  if (!silent) {
    push("Item removed from cart", "amber");
  }
};

  const cartTotalCount = cart.reduce((acc, item) => acc + item.cartQuantity, 0);
  const cartTotalPrice = cart.reduce(
    (acc, item) => acc + Number(item.price_per_unit) * item.cartQuantity,
    0
  );

  const startCheckout = (item) => {
    setCheckoutItem(item);
    setCheckoutQty(item.cartQuantity);
    setIsCartOpen(false);
    setPaymentOpen(true);
  };

  return (
    <div className="relative">
      {/* Top Header Row with Cart Button */}
      <div className="flex items-center justify-between gap-4 mb-5">
        <SectionHeading
          title="Marketplace"
          subtitle="Browse bean produce, seeds, fertilizers, equipment and other farm inputs from verified farmers and suppliers."
        />
        {goBack && (
  <button
    onClick={goBack}
    className="flex items-center gap-1 text-sm mb-4"
    style={{ color: "var(--primary)" }}
  >
    <ArrowLeft size={15} /> Back to your recommendation
  </button>
)}
        <button
          onClick={() => setIsCartOpen(true)}
          className="agri-btn agri-btn-secondary relative shrink-0"
          aria-label="View Cart"
        >
          <ShoppingBag size={18} />
          <span className="hidden sm:inline">Cart</span>
          {cartTotalCount > 0 && (
            <span
              className="mono text-xs font-bold px-1.5 py-0.5 rounded-full"
              style={{ background: "var(--red)", color: "#fff", marginLeft: 4 }}
            >
              {cartTotalCount}
            </span>
          )}
        </button>
      </div>

      {/* Category Chips */}
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

      {/* Filters */}
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

    {/* Listings Grid */}
{loading ? (
  <PageSkeleton rows={6} />
) : visibleListings.length === 0 ? (
  search ? (
    <EmptyState
      icon={Package}
      title={`No listings for "${search}"`}
      body="This input isn't currently on the marketplace. Ask for it at your local agrovet using the recommended name."
      action={
        <Button variant="secondary" onClick={() => setSearch("")}>
          Browse all listings
        </Button>
      }
    />
  ) : (
    <EmptyState
      icon={ShoppingBag}
      title="No listings match these filters"
      body="Try a different category or county, or check back later."
    />
  )
) : (
  <>
    {search && (
      <div
        className="p-2.5 rounded mb-4 flex items-center justify-between text-sm"
        style={{
          background: "var(--primary-soft)",
          border: "1px solid var(--primary-soft-border)",
          color: "var(--primary-dark)",
        }}
      >
        <span>Showing results for <strong>{search}</strong></span>
        <button className="font-semibold underline" onClick={() => setSearch("")}>
          Clear
        </button>
      </div>
    )}
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {visibleListings.map((p) => {
        const isProduce = p.category === "produce";
        return (
          <div key={p.listing_id} className="agri-card p-4 flex flex-col">
            <div
              className="w-full h-28 rounded mb-3 flex items-center justify-center"
              style={{ background: "var(--surface-alt)" }}
            >
              <Wheat size={30} color="var(--primary)" />
            </div>

            <div className="mb-1">
              {isProduce && (
                <div
                  className="text-[10px] font-bold uppercase tracking-wider mb-1"
                  style={{ color: "var(--primary)" }}
                >
                  Bean Produce
                </div>
              )}
              <div className="font-semibold text-sm">
                {isProduce ? `${beanShort(p.variety)} Beans` : p.title}
              </div>
            </div>

            <div
              className="text-xs mb-2 flex items-center gap-1"
              style={{ color: "var(--text-muted)" }}
            >
              <MapPin size={11} /> {p.location || p.seller_county || "—"}
            </div>

            <div className="mb-3">
              {p.seller_name ? (
                <Badge tone="green" icon={ShieldCheck}>{p.seller_name}</Badge>
              ) : (
                <Badge tone="gray">Seller</Badge>
              )}
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
  </>
)}

      {/* Slide-out Cart Drawer Overlay */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end" style={{ background: "rgba(15, 25, 18, 0.5)" }}>
          <div
            className="w-full max-w-md h-full flex flex-col p-5 shadow-2xl"
            style={{ background: "var(--surface)", borderLeft: "1px solid var(--border-strong)" }}
          >
            <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: "var(--border)" }}>
              <div className="flex items-center gap-2 font-bold text-lg">
                <ShoppingBag size={20} style={{ color: "var(--primary)" }} /> My Cart ({cartTotalCount})
              </div>
              <button onClick={() => setIsCartOpen(false)} aria-label="Close cart">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-3 agri-scroll">
              {cart.length === 0 ? (
                <div className="text-center py-12 text-sm" style={{ color: "var(--text-muted)" }}>
                  <Package size={36} className="mx-auto mb-2 opacity-40" />
                  Your cart is empty.
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.listing_id}
                    className="p-3 border rounded flex items-center justify-between gap-3"
                    style={{ borderColor: "var(--border)", background: "#FBFBF8" }}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-sm truncate">
                        {item.category === "produce" ? `${beanShort(item.variety)} Beans` : item.title}
                      </div>
                      <div className="text-xs mono" style={{ color: "var(--text-muted)" }}>
                        {fmtKES(item.price_per_unit)} each
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateCartQuantity(item.listing_id, -1)}
                        className="w-6 h-6 rounded flex items-center justify-center border font-bold text-sm"
                        style={{ borderColor: "var(--border-strong)" }}
                      >
                        -
                      </button>
                      <span className="mono text-sm font-semibold">{item.cartQuantity}</span>
                      <button
                        onClick={() => updateCartQuantity(item.listing_id, 1)}
                        className="w-6 h-6 rounded flex items-center justify-center border font-bold text-sm"
                        style={{ borderColor: "var(--border-strong)" }}
                      >
                        +
                      </button>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="mono font-bold text-sm">
                        {fmtKES(Number(item.price_per_unit) * item.cartQuantity)}
                      </div>
                      <button
                        onClick={() => removeFromCart(item.listing_id)}
                        className="text-xs hover:underline mt-1"
                        style={{ color: "var(--red)" }}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div className="pt-4 border-t space-y-3" style={{ borderColor: "var(--border)" }}>
                <div className="flex items-center justify-between text-base font-bold">
                  <span>Total</span>
                  <span className="mono">{fmtKES(cartTotalPrice)}</span>
                </div>
                <div className="space-y-2">
                  {cart.map((item) => (
                    <Button
                      key={item.listing_id}
                      className="agri-btn-block"
                      size="sm"
                      onClick={() => startCheckout(item)}
                    >
                      Pay {fmtKES(Number(item.price_per_unit) * item.cartQuantity)} for{" "}
                      {item.category === "produce" ? `${beanShort(item.variety)} Beans` : item.title}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Payment Modal Triggered from Cart */}
      {checkoutItem && (
        <PaymentModal
          open={paymentOpen}
          listing={checkoutItem}
          quantity={checkoutQty}
          goto={goto}
          onClose={() => setPaymentOpen(false)}
         onSuccess={() => {
  removeFromCart(checkoutItem.listing_id, { silent: true });
  setCheckoutItem(null);
  setPaymentOpen(false);
  push("Payment completed!", "green");
  goto("orders");
}}
        />
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

  const wheat = INPUT_CATEGORIES.find((c) => c.id === fresh.category)?.icon || Package;
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
          {React.createElement(wheat, { size: 48, color: "var(--primary)" })}
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
   ORDER DETAIL — full post-payment tracking and fulfillment
   ========================================================================== */
function OrderDetail({ orderId, goto, user }) {
  const { push } = useToast();
  const { confirm, open } = useModal();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pickupInput, setPickupInput] = useState("");
  const [working, setWorking] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getOrder(orderId);
      setOrder(data.order);
    } catch (err) {
      push(err.message || "Failed to load order", "red");
    } finally {
      setLoading(false);
    }
  }, [orderId, push]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <PageSkeleton rows={2} />;
  if (!order) return null;

  const isBuyer = order.buyer_id === user.user_id;
  const isSeller = order.seller_id === user.user_id;

  const methodLabel = order.fulfillment_method === "delivery" ? "Delivery" : "Pickup";
  const statusLabels = {
    awaiting_seller: "Awaiting seller",
    ready_for_pickup: "Ready for pickup",
    dispatched: "Dispatched",
    delivered: "Delivered",
    issue: "Issue reported",
  };
  const statusLabel = statusLabels[order.fulfillment_status] || order.fulfillment_status;

  const sellerAction = async (action, label, confirmOpts) => {
    const ok = await confirm(confirmOpts || {
      tone: "info",
      title: label,
      body: "Are you sure?",
      confirmLabel: "Yes",
      cancelLabel: "Cancel",
    });
    if (!ok) return;
    setWorking(true);
    try {
      await sellerAdvance(order.txn_id, action);
      push(`Order marked as ${action.replace(/_/g, " ")}`, "green");
      load();
    } catch (err) {
      push(err.message || "Failed to update", "red");
    } finally {
      setWorking(false);
    }
  };

  const confirmReceipt = async () => {
    setWorking(true);
    try {
      await buyerConfirm(order.txn_id, order.fulfillment_method === "pickup" ? pickupInput : null);
      open({
        tone: "success",
        title: "Receipt confirmed",
        body: "Order marked as delivered. Thank you for using BeanLink.",
        confirmLabel: "Done",
      });
      load();
    } catch (err) {
      push(err.message || "Failed to confirm receipt", "red");
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <button
        className="flex items-center gap-1 text-sm mb-5"
        style={{ color: "var(--text-muted)" }}
        onClick={() => goto("orders")}
      >
        <ArrowLeft size={15} /> Back to Orders
      </button>

      <SectionHeading
        eyebrow={`ORD-${order.txn_id}`}
        title={order.title || beanLabel(order.variety)}
        subtitle={`Placed ${fmtDate(order.created_at)}`}
      />

      {/* Payment summary */}
      <div className="agri-card p-5 mb-4">
        <h3 className="font-semibold mb-4">Payment</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-xs mb-1" style={{ color: "var(--text-faint)" }}>Amount</div>
            <div className="mono font-bold">{fmtKES(order.total_amount)}</div>
          </div>
          <div>
            <div className="text-xs mb-1" style={{ color: "var(--text-faint)" }}>Status</div>
            <Badge tone={order.payment_status === "paid" ? "green" : "amber"}>
              {order.payment_status || order.status}
            </Badge>
          </div>
          <div>
            <div className="text-xs mb-1" style={{ color: "var(--text-faint)" }}>Quantity</div>
            <div className="font-semibold">{Number(order.quantity)}</div>
          </div>
          <div>
            <div className="text-xs mb-1" style={{ color: "var(--text-faint)" }}>M-Pesa receipt</div>
            <div className="mono font-semibold">{order.mpesa_receipt || "—"}</div>
          </div>
        </div>
      </div>

      {/* Fulfillment summary */}
      <div className="agri-card p-5 mb-4">
        <h3 className="font-semibold mb-4">Fulfillment</h3>

        <div className="grid grid-cols-2 gap-4 text-sm mb-4">
          <div>
            <div className="text-xs mb-1" style={{ color: "var(--text-faint)" }}>Method</div>
            <div className="font-semibold">{methodLabel}</div>
          </div>
          <div>
            <div className="text-xs mb-1" style={{ color: "var(--text-faint)" }}>Status</div>
            <Badge tone={order.fulfillment_status === "delivered" ? "green" : "blue"}>
              {statusLabel}
            </Badge>
          </div>
          {order.fulfillment_method === "pickup" && (
            <div className="col-span-2">
              <div className="text-xs mb-1" style={{ color: "var(--text-faint)" }}>Pickup from</div>
              <div className="font-semibold flex items-center gap-1">
                <MapPin size={13} />{order.location || "—"}
              </div>
            </div>
          )}
          {order.fulfillment_method === "delivery" && (
            <>
              <div className="col-span-2">
                <div className="text-xs mb-1" style={{ color: "var(--text-faint)" }}>Delivery address</div>
                <div className="font-semibold">{order.delivery_address || "—"}</div>
              </div>
              {order.delivery_landmark && (
                <div className="col-span-2">
                  <div className="text-xs mb-1" style={{ color: "var(--text-faint)" }}>Landmark</div>
                  <div>{order.delivery_landmark}</div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Counterparty */}
        <div className="p-3 rounded mb-4"
             style={{ background: "var(--surface-alt)", fontSize: 13 }}>
          <div className="text-xs mb-0.5" style={{ color: "var(--text-faint)" }}>
            {isBuyer ? "Seller" : "Buyer"}
          </div>
          <div className="font-semibold">
            {isBuyer ? order.seller_name : order.buyer_name}
          </div>
          <div className="mono text-xs" style={{ color: "var(--text-muted)" }}>
            {isBuyer ? order.seller_phone : order.buyer_phone || "—"}
          </div>
        </div>

        {/* Pickup code display for buyer */}
        {order.fulfillment_method === "pickup"
          && order.pickup_code
          && isBuyer
          && order.fulfillment_status !== "delivered" && (
          <div className="p-4 rounded mb-4"
               style={{ background: "var(--primary-soft)", border: "1px solid var(--primary-soft-border)" }}>
            <div className="text-xs font-semibold uppercase tracking-wide mb-1"
                 style={{ color: "var(--primary)" }}>
              Pickup code — show this to the seller
            </div>
            <div className="mono text-3xl font-bold" style={{ color: "var(--primary-dark)", letterSpacing: 4 }}>
              {order.pickup_code}
            </div>
          </div>
        )}

        {/* Seller actions */}
        {isSeller && order.fulfillment_status === "awaiting_seller" && (
          <div className="flex gap-2">
            {order.fulfillment_method === "pickup" ? (
              <Button
                className="agri-btn-block"
                disabled={working}
                onClick={() => sellerAction("ready_for_pickup", "Mark ready for pickup?", {
                  tone: "info",
                  title: "Mark ready for pickup?",
                  body: "The buyer will see a pickup code they'll show you on collection.",
                  confirmLabel: "Mark ready",
                  cancelLabel: "Cancel",
                })}
              >
                Mark ready for pickup
              </Button>
            ) : (
              <Button
                className="agri-btn-block"
                disabled={working}
                onClick={() => sellerAction("dispatched", "Mark as dispatched?", {
                  tone: "info",
                  title: "Mark as dispatched?",
                  body: "The buyer will be notified that the order is on the way.",
                  confirmLabel: "Mark dispatched",
                  cancelLabel: "Cancel",
                })}
              >
                Mark as dispatched
              </Button>
            )}
          </div>
        )}

        {/* Buyer confirmation */}
        {isBuyer && order.fulfillment_status !== "delivered" && (
          <div className="space-y-3 mt-4">
            {order.fulfillment_method === "pickup" && order.fulfillment_status === "ready_for_pickup" && (
              <>
                <Field label="Enter the pickup code to confirm collection">
                  <input
                    className="agri-input mono"
                    value={pickupInput}
                    onChange={(e) => setPickupInput(e.target.value.toUpperCase())}
                    placeholder="e.g. A3K9P2"
                    maxLength={6}
                  />
                </Field>
                <Button className="agri-btn-block" disabled={working || pickupInput.length < 4} onClick={confirmReceipt}>
                  {working ? "Confirming…" : "Confirm receipt"}
                </Button>
              </>
            )}
            {order.fulfillment_method === "delivery" && order.fulfillment_status === "dispatched" && (
              <Button className="agri-btn-block" disabled={working} onClick={confirmReceipt}>
                {working ? "Confirming…" : "Confirm delivery received"}
              </Button>
            )}
            {order.fulfillment_status === "awaiting_seller" && (
              <div className="text-xs text-center" style={{ color: "var(--text-faint)" }}>
                {order.fulfillment_method === "pickup"
                  ? "Waiting for the seller to prepare your order."
                  : "Waiting for the seller to dispatch your order."}
              </div>
            )}
          </div>
        )}

        {order.fulfillment_status === "delivered" && (
          <div className="p-3 rounded text-sm flex items-center gap-2 mt-4"
               style={{ background: "var(--primary-soft)", border: "1px solid var(--primary-soft-border)", color: "var(--primary-dark)" }}>
            <CheckCircle2 size={16} />
            Delivered {fmtDate(order.delivered_at)}
          </div>
        )}
      </div>
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
            const wheat = isProduce ? Wheat : (INPUT_CATEGORIES.find((c) => c.id === p.category)?.icon || Package);
            return (
              <div key={p.listing_id} className="agri-card p-4 flex flex-wrap items-center gap-4">
                <div
                  className="w-11 h-11 rounded flex items-center justify-center shrink-0"
                  style={{ background: "var(--primary-soft)" }}
                >
                  <Wheat size={20} color="var(--primary)" />
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
function Orders({ goto, user }) {
  const { push } = useToast();
  const { confirm } = useModal();
  const [filter, setFilter] = useState("all");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(null);

  // Farmers and suppliers see orders for their products (they're the seller).
  // Buyers see orders they placed (they're the buyer).
const myRole = user?.role === "buyer" ? "buyer" : user?.role === "admin" ? "all" : "seller";
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { role: myRole };
      if (filter !== "all") params.status = filter.toLowerCase();
      const data = await getOrders(params);
      setRows(data.orders || []);
    } catch (err) {
      push(err.message || "Failed to load orders", "red");
    } finally {
      setLoading(false);
    }
  }, [filter, myRole, push]);

  useEffect(() => { load(); }, [load]);

  const advance = async (row, action) => {
    const label = action === "ready_for_pickup" ? "ready for pickup" : "dispatched";
    const ok = await confirm({
      tone: "info",
      title: `Mark as ${label}?`,
      body: action === "ready_for_pickup"
        ? "The buyer will see a pickup code to show you on collection."
        : "The buyer will be notified that the order is on the way.",
      confirmLabel: `Mark ${label}`,
      cancelLabel: "Cancel",
    });
    if (!ok) return;

    setWorking(row.rawId);
    try {
      await sellerAdvance(row.rawId, action);
      push(`Order marked as ${label}`, "green");
      load();
    } catch (err) {
      push(err.message || "Failed to update order", "red");
    } finally {
      setWorking(null);
    }
  };

  const fulfillmentLabel = (s) => ({
    awaiting_seller: "Awaiting seller",
    ready_for_pickup: "Ready for pickup",
    dispatched: "Dispatched",
    delivered: "Delivered",
    issue: "Issue",
  }[s] || s || "—");

  const fulfillmentTone = (s) => ({
    awaiting_seller: "amber",
    ready_for_pickup: "blue",
    dispatched: "blue",
    delivered: "green",
    issue: "red",
  }[s] || "gray");

  return (
    <div>
      <SectionHeading title="Orders" subtitle="Manage orders involving your produce and purchased inputs." />

      <div className="flex gap-2 mb-5 overflow-x-auto agri-scroll pb-1">
        {["all", "Pending", "Confirmed", "Processing", "Completed", "Cancelled"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className="agri-btn agri-btn-sm"
            style={{
              background: filter === s ? "var(--primary)" : "var(--surface)",
              color: filter === s ? "#fff" : "var(--text)",
              border: "1px solid var(--border-strong)",
            }}
          >
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
                <tr>
                  <th>Order</th>
                  <th>Item</th>
                  <th>Counterparty</th>
                  <th>Location</th>
                  <th>Qty</th>
                  <th>Amount</th>
                  <th>Date</th>
                  <th>Payment</th>
                  <th>Fulfillment</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((o) => {
                  const isSeller = o.myRole === "seller";
                  const needsAction =
                    isSeller &&
                    o.fulfillmentStatus === "awaiting_seller" &&
                    o.fulfillmentMethod;

                  // What location to show: buyer location for the seller,
                  // seller/listing location for the buyer.
                  const locationText = isSeller
                    ? o.deliveryAddress
                      ? `${o.deliveryAddress}${o.deliveryLandmark ? ` · ${o.deliveryLandmark}` : ""}`
                      : o.counterpartyLocation
                    : o.counterpartyLocation;

                  return (
                    <tr
                      key={o.id}
                      style={{ cursor: "pointer" }}
                      onClick={() => goto("order-detail", { orderId: o.rawId })}
                    >
                      <td className="mono">{o.id}</td>
                      <td className="font-medium">{o.item}</td>
                      <td>
                        {o.counterpartyName}
                        {o.counterpartyPhone && (
                          <div className="text-xs mono" style={{ color: "var(--text-faint)" }}>
                            {o.counterpartyPhone}
                          </div>
                        )}
                      </td>
                      <td className="text-xs">
                        <div className="flex items-start gap-1">
                          <MapPin size={11} style={{ marginTop: 3, flexShrink: 0 }} />
                          <span>{locationText || "—"}</span>
                        </div>
                      </td>
                      <td className="mono">{o.quantity}</td>
                      <td className="mono font-semibold">{fmtKES(o.amount)}</td>
                      <td>{fmtDate(o.date)}</td>
                      <td><Badge tone={statusTone(o.status)}>{o.status}</Badge></td>
                      <td>
                        {o.fulfillmentMethod ? (
                          <Badge tone={fulfillmentTone(o.fulfillmentStatus)}>
                            {fulfillmentLabel(o.fulfillmentStatus)}
                          </Badge>
                        ) : (
                          <span className="text-xs" style={{ color: "var(--text-faint)" }}>—</span>
                        )}
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        {needsAction && o.fulfillmentMethod === "pickup" && (
                          <Button
                            size="sm"
                            disabled={working === o.rawId}
                            onClick={() => advance(o, "ready_for_pickup")}
                          >
                            Ready for pickup
                          </Button>
                        )}
                        {needsAction && o.fulfillmentMethod === "delivery" && (
                          <Button
                            size="sm"
                            disabled={working === o.rawId}
                            onClick={() => advance(o, "dispatched")}
                          >
                            Dispatch
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
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
  const [stats, setStats] = useState({
    farmers: 0,
    buyers: 0,
    suppliers: 0,
    active_listings: 0,
    completed_orders: 0,
    pending_verifications: 0,
    total_listings: 0,
    total_orders: 0,
    users: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [statsRes, usersRes] = await Promise.all([
          adminGetStats(),
          adminListUsers(),
        ]);
        if (cancelled) return;
        setStats({
          ...statsRes,
          users: usersRes.users || [],
        });
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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
        <StatCard label="Total Farmers" value={stats.farmers ?? 0} icon={Sprout} />
        <StatCard label="Total Buyers" value={stats.buyers ?? 0} icon={Users} />
        <StatCard label="Suppliers" value={stats.suppliers ?? 0} icon={Package} />
        <StatCard label="Active Listings" value={stats.active_listings ?? 0} icon={Package} />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-7">
        <StatCard label="Pending Verifications" value={stats.pending_verifications ?? 0} icon={ShieldCheck} />
        <StatCard label="Total Listings" value={stats.total_listings ?? 0} icon={Package} />
        <StatCard label="Completed Orders" value={stats.completed_orders ?? 0} icon={Receipt} />
        <StatCard label="Total Orders" value={stats.total_orders ?? 0} icon={ClipboardList} />
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <div className="agri-card p-5">
          <h3 className="font-semibold mb-4">Pending Verifications</h3>
          {pending.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--text-faint)" }}>
              No pending verifications.
            </p>
          ) : (
            <div className="space-y-3">
              {pending.slice(0, 5).map((u) => (
                <div key={u.user_id} className="flex items-center justify-between text-sm">
                  <div>
                    <div className="font-medium">{u.full_name}</div>
                    <div className="text-xs" style={{ color: "var(--text-faint)" }}>
                      {u.role} · {u.county || "—"}
                    </div>
                  </div>
                  <Button size="sm" icon={ShieldCheck} onClick={() => goto("admin-users")}>
                    Review
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="agri-card p-5">
          <h3 className="font-semibold mb-4">Quick Actions</h3>
          <div className="space-y-2">
            <Button className="agri-btn-block" onClick={() => goto("admin-prices")}>
              Manage Market Price Data
            </Button>
            <Button className="agri-btn-block" variant="secondary" onClick={() => goto("admin-users")}>
              Manage Users
            </Button>
            <Button className="agri-btn-block" variant="secondary" onClick={() => goto("marketplace")}>
              Review Produce Listings
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

  function AdminUsers() {
  const { push } = useToast();
  const { confirm } = useModal();
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
  // If moving away from a page into a detail/marketplace, remember the origin
  // so the destination can offer a "back" that actually returns here.
  if (p === "marketplace" || p === "input-detail" || p === "produce-detail") {
    setReturnTo({ page, item: selectedItem });
  }

  if (p === "register") {
    setAuthMode("register");
    setPage("login");
  } else if (p === "login") {
    setAuthMode("login");
    setPage("login");
  } else {
    setPage(p);
  }
  setSelectedItem(item || null);
  window.scrollTo?.(0, 0);
};

const goBack = () => {
  if (returnTo) {
    setPage(returnTo.page);
    setSelectedItem(returnTo.item);
    setReturnTo(null);
  } else {
    setPage("dashboard");
  }
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

  // --- UNAUTHENTICATED / GUEST FLOW ---
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

  // --- AUTHENTICATED USER FLOW ---
  const role = session.role;

  const renderPage = () => {
    switch (page) {
      case "dashboard":
        if (role === "farmer") return <FarmerDashboard goto={goto} user={session} />;
        if (role === "buyer") return <BuyerDashboard goto={goto} user={session} />;
        if (role === "supplier") return <SupplierDashboard goto={goto} user={session} />;
        return <AdminDashboard goto={goto} />;
      case "recommendation":
  return (
    <InputRecommendation
      goto={goto}
    />
  );
case "marketplace":
  return (
    <Marketplace
      goto={goto}
      goBack={goBack}
      initialSearch={selectedItem?.search || ""}
    />
  );
      case "input-detail":
        return <InputDetail item={selectedItem} goto={goto} />;
      case "produce-detail":
        return <ProduceDetail item={selectedItem} goto={goto} />;
      case "my-listings":
        return <MyListings goto={goto} role={role} />;
      case "list-produce":
        return <ListForm goto={goto} role="farmer" />;
      case "list-input":
        return <ListForm goto={goto} role="supplier" />;
      case "prices":
        return <MarketPrices goto={goto} />;
      case "orders":
        return <Orders goto={goto} user={session} />;
      case "transactions":
        return <Transactions user={session} />;
      case "profile":
        return <Profile user={session} onUserUpdate={handleUserUpdate} />;
      case "admin-users":
        return <AdminUsers />;
      case "admin-prices":
        return <AdminMarketPrices />;
      case "admin-reports":
        return <AdminReports />;
      case "order-detail":
        return <OrderDetail orderId={selectedItem?.orderId} goto={goto} user={session} />;
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