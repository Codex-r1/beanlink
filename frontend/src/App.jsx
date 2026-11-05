import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Home, ShoppingBag, Sprout, Package, TrendingUp, ClipboardList, Receipt,
  User, Search, Bell, Menu, X, ChevronRight, ChevronLeft,
  MapPin, Calendar, CheckCircle2, Clock, AlertCircle, Plus,
  ArrowLeft, LogOut, Users, ShieldCheck, Flag, Leaf, Wheat,
  Beaker, Tractor, ShieldAlert, PauseCircle, Trash2, Pencil, Info, ChevronDown, ChevronUp
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  registerUser, loginUser,verifyLoginOTP,googleLogin,
  getDashboardSummary, getDashboardActivity,
  getMyListings, getMarketplace, getListing,
  createListing, updateListingStatus, deleteListing,
  getOrders, createOrder, updateOrderStatus,getOrderReview, createReview, getSellerRating,
  getPrices, getLatestPrice,
  getProfile, updateProfile,
  getRecommendation,getRecommendationHistory,completeOnboarding,
  adminListUsers, adminVerifyUser,
  adminListPrices, adminCreatePrice,
  adminListReports,
  initiateMpesaPush, getPaymentStatus,getOrder, setFulfillment, sellerAdvance, buyerConfirm,
  adminGetStats, adminBatchImportPrices
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
import NotificationBell from "./components/NotificationBell";
import { GoogleLogin } from '@react-oauth/google';

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
    { id: "faq", label: "FAQ" },
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
            Grow smarter. Sell with confidence.
          </h1>
          <p className="text-base mb-7" style={{ color: "var(--text-muted)" }}>
            One platform for Kenyan bean farmers to explore farm inputs, receive data-driven recommendations, and check recorded market prices.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => goto("guest-produce")}>Explore Marketplace</Button>
            <Button variant="secondary" onClick={() => goRegister()}>Get Recommendations</Button>
            <Button variant="ghost" onClick={() => goto("guest-prices")}>View Prices</Button>
          </div>
        </div>
        <HeroSlideshow />
      </section>
      <section className="max-w-6xl mx-auto px-5 pb-14 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: ShoppingBag, title: "Access Farm Inputs", desc: "Find agricultural inputs from verified sellers near you." },
          { icon: Sprout, title: "Smart Input Recommendations", desc: "Get recommendations based on historical field trials using a Random Forest model." },
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
      <footer className="border-t py-6 text-center text-xs" style={{ borderColor: "var(--border)", color: "var(--text-faint)" }}>
        BeanLink: Agricultural Marketplace and Decision Support for Smallholder Bean Farmers
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
          Our recommendation engine uses a Random Forest model trained on historical Kenyan bean field-trial data to rank candidate input packages by predicted yield gain. <strong>The recommendations are experimental decision-support estimates, not guaranteed yield improvements, and actual outcomes may differ across farms and growing conditions.</strong>
        </p>
        <p className="text-base mb-8" style={{ color: "var(--text-muted)" }}>
          Market prices displayed on the platform are recorded observations with source and update information where available. They are intended to help farmers compare prices, not to guarantee the price they will receive when selling their produce.
        </p>
        <div className="grid sm:grid-cols-3 gap-4 mb-10">
          {[
            { icon: Wheat, title: "Market access", desc: "Sell produce directly to verified buyers across Kenya." },
            { icon: Sprout, title: "Decision support", desc: "Input recommendations based on historical trial data." },
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
function FAQPage({ goto, goLogin, goRegister, isAuthenticated = false ,guest = false }) {
  const [openIndex, setOpenIndex] = useState(null);

  const toggleAccordion = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

 const faqData = [
    {
      topic: "Land Preparation & Planting",
      icon: Sprout,
      questions: [
        {
          q: "When is the best time to plant beans in Kenya?",
          a: "Beans are best planted at the onset of the rains. For the Long Rains (March-May), plant in mid-to-late March. For the Short Rains (October-December), plant in mid-October. Ensure the soil is well-drained and has adequate moisture before planting."
        },
        {
          q: "What is the recommended spacing for beans?",
          a: "For most bean varieties in Kenya, a spacing of 50 cm between rows and 10-15 cm between plants is recommended. This gives a plant population of roughly 200,000 to 250,000 plants per hectare. Plant 2 seeds per hole to ensure good germination, then thin to 1 plant."
        },
            {
      q: "When is the best time to plant beans in Kenya?",
      a: "Beans are traditionally planted at the onset of the rains: Long Rains (March-May) and Short Rains (October-December). However, due to climate variability, farmers should verify actual soil moisture and local weather forecasts before planting, as rainfall patterns are increasingly unpredictable."
    },
        {
          q: "How deep should I plant my bean seeds?",
          a: "Plant seeds at a depth of 2.5 to 5 cm. Deeper planting can lead to poor emergence, especially in heavy soils. Ensure good soil contact with the seed for optimal moisture absorption."
        }
      ]
    },
    {
      topic: "Fertilizer & Soil Health",
      icon: Beaker,
      questions: [
        {
          q: "What fertilizer should I use for beans?",
          a: "Beans generally respond well to phosphorus. Apply DAP (Diammonium Phosphate) or TSP (Triple Super Phosphate) at planting time, placing it in the planting hole and mixing it with soil before dropping the seed to avoid burning the seedling. A common recommendation is 50 kg of DAP per acre."
        },
        {
          q: "Do I need to apply lime?",
          a: "If your soil is highly acidic (pH below 5.5), liming is recommended. Beans prefer a pH of 5.8 to 6.5. Apply agricultural lime 2-3 months before planting, based on soil test results, to allow it time to react with the soil."
        },
        {
          q: "Is seed inoculation necessary?",
          a: "If beans have not been grown in the field recently, seed inoculation with the right Rhizobium strain can improve nitrogen fixation. However, if the field has a history of beans, the native bacteria are usually sufficient."
        }
      ]
    },
    {
      topic: "Pest & Disease Management",
      icon: ShieldAlert,
      questions: [
        {
          q: "How do I control Bean Fly?",
          a: "Bean fly is a major pest during the seedling stage. Use treated seeds (e.g., with imidacloprid or thiamethoxam) if available. Practice crop rotation and destroy crop residues. Foliar sprays may be needed if pest pressure is high, but early planting helps the crop escape severe damage."
        },
        {
          q: "What are the common bean diseases and how do I manage them?",
          a: "Common diseases include Bean Rust, Angular Leaf Spot, and Anthracnose. Use resistant varieties (like Kenya Umoja or Wairimu types). Practice crop rotation, use certified disease-free seeds, and maintain field hygiene by removing infected debris. Fungicides should only be used when symptoms are spotted early and in favorable weather conditions."
        },
        {
          q: "How do I manage weeds?",
          a: "Beans are poor competitors against weeds in the first 4-6 weeks. Keep the field weed-free during this critical period. One or two hand weedings are usually sufficient for smallholders. Avoid deep cultivation near the base of the plant to prevent root damage."
        }
      ]
    },
    {
      topic: "Harvesting & Storage",
      icon: Wheat,
      questions: [
        {
          q: "How do I know my beans are ready for harvest?",
          a: "Beans are ready for harvest when the pods turn yellow/brown and the seeds inside rattle. If harvesting for dry beans, uproot the plants and dry them in the field (or a shaded, dry area) for a few days before threshing. Avoid leaving them in the hot sun for too long to prevent seed splitting."
        },
        {
          q: "What moisture content is safe for storage?",
          a: "Dry beans should be stored at a moisture content of 12-14% to prevent mold and insect damage. Store in clean, dry bags (e.g., PICS bags) in a cool, dry place. Add a natural preservative like wood ash or neem leaves if commercial insecticides are not used."
        },
        {
          q: "How do I prevent weevils in storage?",
          a: "Ensure the beans are completely dry before storage. Use hermetic storage bags (like PICS bags) which deprive weevils of oxygen. Alternatively, use approved storage insecticides carefully following the manufacturer's instructions."
        }
      ]
    }
  ];

  // 1. Create the main content block (the accordion list)
  const content = (
    <div className={isAuthenticated ? "max-w-4xl" : "max-w-4xl mx-auto px-5 py-10"}>
      <SectionHeading
        title="Farmer Knowledge Base"
        subtitle="Agronomic guidance compiled from KALRO bean production guidelines to help you improve your yield."
      />

      <div className="space-y-6">
        {faqData.map((section, sectionIdx) => (
          <div key={sectionIdx} className="agri-card overflow-hidden">
            <div className="bg-gray-50 border-b border-gray-200 p-4 flex items-center gap-3" style={{ background: "var(--surface-alt)", borderColor: "var(--border)" }}>
              <section.icon className="text-emerald-600" size={20} style={{ color: "var(--primary)" }} />
              <h2 className="text-lg font-semibold text-gray-800">{section.topic}</h2>
            </div>
            
            <div className="divide-y divide-gray-100">
              {section.questions.map((item, qIdx) => {
                const globalIdx = `${sectionIdx}-${qIdx}`;
                const isOpen = openIndex === globalIdx;

                return (
                  <div key={qIdx} className="bg-white">
                    <button
                      onClick={() => toggleAccordion(globalIdx)}
                      className="w-full text-left px-5 py-4 flex justify-between items-center hover:bg-gray-50 transition-colors focus:outline-none"
                      style={{ background: "var(--surface)" }}
                    >
                      <span className="font-medium text-gray-800 pr-4" style={{ color: "var(--text)" }}>{item.q}</span>
                      {isOpen ? (
                        <ChevronUp className="text-gray-400 shrink-0" size={18} style={{ color: "var(--text-faint)" }} />
                      ) : (
                        <ChevronDown className="text-gray-400 shrink-0" size={18} style={{ color: "var(--text-faint)" }} />
                      )}
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-4 text-sm text-gray-600 leading-relaxed" style={{ background: "var(--surface)", color: "var(--text-muted)" }}>
                        {item.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // 2. If logged in, return ONLY the content. AppShell provides the layout.
  if (isAuthenticated) {
    return content;
  }

  // 3. If a guest, wrap the content in the Guest layout.
  return (
    <div className="agri-root min-h-screen">
      <GuestHeader page="faq" goto={goto} goLogin={goLogin} goRegister={goRegister} />
      {content}
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
  
  // New states for 2FA
  const [otpMode, setOtpMode] = useState(false);
  const [otp, setOtp] = useState("");
  const [userId, setUserId] = useState(null);

   const handleSubmit = async () => {
    setError("");
    setLoading(true);
    try {
      let data;

      // 1. IF WE ARE IN OTP MODE, VERIFY THE CODE
      if (otpMode) {
        data = await verifyLoginOTP(userId, otp);
      } 
      // 2. OTHERWISE, HANDLE NORMAL LOGIN / REGISTER
      else if (mode === "login") {
        data = await loginUser({ email, password });
        
        if (data.requires2FA) {
          setUserId(data.userId);
          setOtpMode(true);
          setLoading(false);
          return; 
        }
      } else {
        // Registration flow
        const safeRole = ["farmer", "buyer", "supplier"].includes(role) ? role : "farmer";
        data = await registerUser({
          full_name: fullName, email, password,
          role: safeRole, phone_number: phone, county,
        });
      }

      // If we get here, we either registered successfully or passed 2FA
      localStorage.setItem("beanlink_token", data.token);
      localStorage.setItem("beanlink_user", JSON.stringify(data.user));
      onLogin(data.user);
      
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };
    const handleGoogleSuccess = async (credentialResponse) => {
    setError("");
    setLoading(true);
    try {
      const data = await googleLogin(credentialResponse.credential);
      
      // 1. Check if the backend requires 2FA
      if (data.requires2FA) {
        setUserId(data.userId);
        setOtpMode(true);
        setLoading(false);
        return; 
      }
      localStorage.setItem("beanlink_token", data.token);
      localStorage.setItem("beanlink_user", JSON.stringify(data.user));
      onLogin(data.user); 
      
    } catch (err) {
      setError(err.message || "Google login failed.");
    } finally {
      setLoading(false);
    }
  };
  const handleBackToLogin = () => {
    setOtpMode(false);
    setOtp("");
    setUserId(null);
    setError("");
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
            {otpMode 
              ? "Enter the 6-digit code sent to your email." 
              : mode === "login" ? "Log in to your account." : "Create a new account."}
          </p>
          
          <div className="space-y-4">
            {/* --- OTP INPUT VIEW --- */}
            {otpMode ? (
              <>
                <Field label="Verification Code">
                  <input 
                    className="agri-input text-center text-xl tracking-[0.5em] font-mono" 
                    value={otp} 
                    onChange={(e) => setOtp(e.target.value)} 
                    placeholder="000000" 
                    maxLength={6}
                    autoFocus
                  />
                </Field>
                {error && (
                  <div className="text-sm p-2.5 rounded" style={{ background: "var(--red-soft)", color: "var(--red)", border: "1px solid var(--red-border)" }}>
                    {error}
                  </div>
                )}
                <Button className="agri-btn-block" onClick={handleSubmit} disabled={loading || otp.length < 6}>
                  {loading ? "Verifying..." : "Verify & Log In"}
                </Button>
                <p className="text-sm text-center mt-4">
                  <button className="font-semibold text-gray-500 hover:text-gray-800" onClick={handleBackToLogin}>
                    Back to login
                  </button>
                </p>
              </>
            ) : (
              /* --- STANDARD LOGIN/REGISTER VIEW --- */
              <>
                {mode === "register" && (
                  <>
           
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
                  <input className="agri-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@gmail.com" />
                </Field>
                <Field label="Password">
                  <input className="agri-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)}/>
                </Field>
                
                {error && (
                  <div className="text-sm p-2.5 rounded" style={{ background: "var(--red-soft)", color: "var(--red)", border: "1px solid var(--red-border)" }}>
                    {error}
                  </div>
                )}
                
                <Button className="agri-btn-block" onClick={handleSubmit} disabled={loading}>
                  {loading ? "Please wait..." : mode === "login" ? "Log In" : "Create Account"}
                </Button>
                     <div className="flex items-center gap-2 my-2">
                  <hr className="flex-1 border-gray-300" />
                  <span className="text-xs text-gray-400 uppercase">Or</span>
                  <hr className="flex-1 border-gray-300" />
                </div>
                
                <div className="flex justify-center">
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={() => setError("Google Sign-In was cancelled or failed")}
                    theme="outline"
                    size="large"
                    width="300"
                  />
                </div>
                <p className="text-sm text-center mt-5" style={{ color: "var(--text-muted)" }}>
                  {mode === "login" ? "New to BeanLink?" : "Already have an account?"}{" "}
                  <button className="font-semibold" style={{ color: "var(--primary)" }}
                    onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}>
                    {mode === "login" ? "Register" : "Log In"}
                  </button>
                </p>
              </>
            )}
          </div>
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
const loadOrders = async () => (await getOrders()).orders;
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
          
               <NotificationBell user={user} loadOrders={loadOrders} goto={goto} />
            
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
const [showAllActivity, setShowAllActivity] = useState(false);
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
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Recent Activity</h3>
          {activity.length > 5 && (
            <button 
              onClick={() => setShowAllActivity(!showAllActivity)}
              className="text-xs font-semibold"
              style={{ color: "var(--primary)" }}
            >
              {showAllActivity ? "Show Less" : "Show All"}
            </button>
          )}
        </div>

        {activity.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text-faint)" }}>No activity yet.</p>
        ) : (
          <div className="space-y-3">
            {(showAllActivity ? activity : activity.slice(0, 5)).map((a, i) => {
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
  const [result, setResult] = useState(initialResult);
  const [marketplaceListings, setMarketplaceListings] = useState([]);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState("");
  const [form, setForm] = useState({
    beanVariety: "Kenya Umoja",
    season: "Long Rains",
    locality: "",
    challenge: "",
    // Soil test fields
    hasSoilTest: false,
    ph: "",
    tot_carbon: "",
  });
  
  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const isUnsupported = form.beanVariety === "Other";

  // Load history
  useEffect(() => {
  let cancelled = false;

  async function loadHistory() {
    try {
      const data = await getRecommendationHistory();

      if (!Array.isArray(data.recommendations)) {
        throw new Error(
          "Unexpected history response: expected a recommendations array."
        );
      }

      if (!cancelled) {
        setHistory(data.recommendations);
        setHistoryError("");
      }
    } catch (err) {
      console.error("Recommendation history failed:", err);

      if (!cancelled) {
        setHistoryError(
          err.message || "Could not load your saved recommendations."
        );
      }
    } finally {
      if (!cancelled) setHistoryLoading(false);
    }
  }

  loadHistory();

  return () => {
    cancelled = true;
  };
}, []);

  const refreshHistory = async () => {
    try {
      const data = await getRecommendationHistory();
      setHistory(data.recommendations || []);
    } catch {}
  };

  const submit = async () => {
    if (isUnsupported) return; 
    
    setLoading(true);
    try {
      const data = await getRecommendation({
        variety: form.beanVariety,
        season: form.season,
        locality: form.locality || null,
        challenge: form.challenge || null,
        // Only send soil data if they checked the box and entered values
        ph: form.hasSoilTest && form.ph ? Number(form.ph) : null,
        tot_carbon: form.hasSoilTest && form.tot_carbon ? Number(form.tot_carbon) : null,
      });
      setResult(data);
      if (onResult) onResult(data);
      refreshHistory(); 
    } catch (err) {
      open({
        tone: "error",
        title: "Recommendation failed",
        body: err.message || "The recommendation service is unavailable.",
        confirmLabel: "Close",
      });
    } finally {
      setLoading(false);
    }
  };

  // Rebuild from history
  const openFromHistory = (h) => {
    setResult({
      recommendation: {
        seed: h.recommended_seed || h.variety,
        fertilizer: h.recommended_fertilizer,
        soilAmendment: h.recommended_lime,
        inoculation: h.recommended_inoculation,
      },
      explanation: Array.isArray(h.shap_values) ? h.shap_values : [],
      summary: h.summary || "",
      disclaimer: "This is a saved recommendation from your history. Absolute yields vary by site.",
    });
    if (onResult) onResult(null);
  };

  // Fetch marketplace
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

  // Reusable History UI
  const historyUI = (
  <section
    className="mt-10 pt-6 border-t"
    style={{ borderColor: "var(--border)" }}
  >
    <h3
      className="font-bold text-lg mb-4"
      style={{ color: "var(--text)" }}
    >
      Past recommendations
    </h3>

    {historyLoading ? (
      <p className="text-sm" role="status">
        Loading your saved recommendations…
      </p>
    ) : historyError ? (
      <p
        className="text-sm p-4 rounded"
        role="alert"
        style={{
          background: "var(--red-soft)",
          color: "var(--red)",
        }}
      >
        {historyError}
      </p>
    ) : history.length === 0 ? (
      <p className="text-sm" style={{ color: "var(--text-muted)" }}>
        No saved recommendations were returned for your account.
      </p>
    ) : (
      <div className="grid sm:grid-cols-2 gap-3">
        {history.map((h) => (
          <button
            key={h.rec_id}
            type="button"
            onClick={() => {
              openFromHistory(h);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="agri-card text-left p-4 flex items-center justify-between gap-3"
          >
            <div>
              <div
                className="font-semibold text-sm"
                style={{ color: "var(--primary-dark)" }}
              >
                {beanLabel(h.variety) || h.variety || "Variety not recorded"}
              </div>

              <div
                className="text-xs mt-1"
                style={{ color: "var(--text-muted)" }}
              >
                {h.season || "Season not recorded"} ·{" "}
                {h.recommended_fertilizer || "Fertilizer not recorded"}
              </div>

              <div
                className="text-xs mt-2"
                style={{ color: "var(--text-faint)" }}
              >
                {h.created_at ? fmtDate(h.created_at) : "Date not recorded"}
              </div>
            </div>

            <ChevronRight size={18} className="shrink-0" />
          </button>
        ))}
      </div>
    )}
  </section>
);

  // 1. LOADING STATE
  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-4">
        <SectionHeading
          eyebrow="Input Advisory"
          title="Running trial comparison..."
          subtitle="Analyzing historical field trials to find your best input package."
        />
        <div className="agri-card p-8 space-y-6 mt-8 shadow-sm">
          <div className="agri-skel h-8 w-1/3" />
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="agri-skel h-20" />
            <div className="agri-skel h-20" />
            <div className="agri-skel h-20" />
            <div className="agri-skel h-20" />
          </div>
          <div className="agri-skel h-12 w-full mt-4" />
        </div>
      </div>
    );
  }

  // 2. RESULT STATE
  if (result) {
    const rec = result.recommendation || {};
    const explanation = Array.isArray(result.explanation) ? result.explanation : [];
    const alternatives = Array.isArray(result.alternatives) ? result.alternatives : [];
 
    const weights = explanation.map((e) => Math.abs(Number(e.weight) || 0));
    const maxWeight = Math.max(1e-6, ...weights);
 
    const seedTerms = [beanShort(rec.seed), rec.seed].filter(Boolean);
    const fertilizerTerms = [rec.fertilizer].filter(Boolean);
    const limeTerms = rec.soilAmendment === "With lime" ? ["lime", "agricultural lime"] : [];
    const inocTerms = rec.inoculation === "Inoculated" ? ["biofix", "inoculant", "rhizobium"] : [];
    const limeAndInocTerms = [...limeTerms, ...inocTerms]; 
 
    return (
      <div className="max-w-2xl mx-auto py-4">
        <SectionHeading
          eyebrow="Input Advisory"
          title="Your Best Match"
        />
 
        <div className="grid sm:grid-cols-3 gap-3 mb-6 mt-6">
          <RecommendedInputCard
            icon={Sprout}
            label="Your bean variety"
            value={beanLabel(rec.seed) || "—"}
            note="Make sure this is the seed you have."
            searchTerms={seedTerms}
            marketplaceListings={marketplaceListings}
            goto={goto}
          />
          <RecommendedInputCard
            icon={Beaker}
            label="Fertilizer in the ranked package"
            value={rec.fertilizerDisplay || rec.fertilizer || "—"}
            searchTerms={fertilizerTerms}
            marketplaceListings={marketplaceListings}
            goto={goto}
          />
          <RecommendedInputCard
            icon={Leaf}
            label="Soil treatment & seed prep"
            value={`${rec.soilAmendmentDisplay || rec.soilAmendment || "—"} · ${
              rec.inoculationDisplay || rec.inoculation || "—"
            }`}
            searchTerms={limeAndInocTerms}
            marketplaceListings={marketplaceListings}
            goto={goto}
          />
        </div>
 
        {/* ML Summary */}
        {result.summary && (
          <div className="mb-5 p-4 rounded-lg" style={{ background: "var(--surface-alt)" }}>
            <div className="flex items-center gap-2 mb-2">
              <Info size={16} style={{ color: "var(--primary)" }} />
              <span className="text-sm font-bold" style={{ color: "var(--primary-dark)" }}>Model Comparison</span>
            </div>
            <p className="text-sm" style={{ color: "var(--text)" }}>
              {result.summary}
            </p>
          </div>
        )}

        {/* Context Messages */}
        {result.contextMessages && result.contextMessages.length > 0 && (
          <div className="p-4 rounded-lg mb-5 space-y-3" style={{ background: "var(--amber-soft)", border: "1px solid var(--amber-border)" }}>
            <div className="flex items-center gap-2 mb-1">
              <AlertCircle size={16} style={{ color: "var(--amber)" }} />
              <span className="text-sm font-bold" style={{ color: "var(--amber)" }}>Your Farm Context</span>
            </div>
            {result.contextMessages.map((msg, i) => (
              <div key={i} className="text-sm flex items-start gap-2" style={{ color: "var(--amber)" }}>
                <span className="mt-1">•</span>
                <span>{msg.message}</span>
              </div>
            ))}
          </div>
        )}

        {/* SHAP Explanation */}
        {explanation.length > 0 && (
          <div className="agri-card p-6 mb-5">
            <div className="flex items-center gap-2 mb-4">
              <Info size={18} style={{ color: "var(--primary)" }} />
              <span className="text-base font-bold" style={{ color: "var(--primary-dark)" }}>Why this is a good choice</span>
            </div>
            
            {/* CORRECTED: Removed the false hardcoded claim */}
            <p className="text-sm mb-4 font-medium" style={{ color: "var(--text)" }}>
              The model ranked these inputs highest for the selected variety and historical season. Its suitability for your specific field has not been established.
            </p>
 
            <div className="space-y-4 mt-6">
              {explanation.map((e, i) => {
                const pct = Math.round((weights[i] / maxWeight) * 100);
                return (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="font-semibold" style={{ color: "var(--text)" }}>{e.factor}</span>
                      <span className="mono font-bold" style={{ color: "var(--primary)" }}>
                        {pct}%
                      </span>
                    </div>
                    <div className="agri-bar-track h-2">
                      <div className="agri-bar-fill" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
 
        {alternatives.length > 0 && (
          <div className="agri-card p-6 mb-5">
            <h3 className="font-bold text-base mb-4" style={{ color: "var(--text)" }}>Other options to consider</h3>
            <div className="agri-table-wrap">
              <table className="agri-table">
                <thead>
                  <tr>
                    <th>Fertilizer</th>
                    <th>Lime</th>
                    <th>Seed preparation</th>
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
 
        <div
          className="p-4 rounded-lg mb-6 text-sm flex items-start gap-2"
          style={{ background: "var(--amber-soft)", color: "var(--amber)", border: "1px solid var(--amber-border)" }}
        >
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>
            <strong>Remember:</strong> Your actual harvest depends on your soil, rainfall, and how well you manage the crop. This is a guide based on past research, not a guarantee.
          </span>
        </div>

        <div className="flex gap-3">
          <Button
            variant="secondary"
            className="flex-1"
            onClick={() => {
              setResult(null);
              if (onResult) onResult(null);
            }}
          >
            Get new recommendation
          </Button>
          <Button className="flex-1" icon={ShoppingBag} onClick={() => goto("marketplace")}>
            Browse all inputs
          </Button>
        </div>

        {historyUI}
      </div>
    );
  }

  // 3. FORM STATE
  return (
    <div className="max-w-2xl mx-auto py-4">
      <div className="mb-8">
        <SectionHeading
          eyebrow="Input Advisory"
          title="Compare trial packages"
          subtitle="Select your context to see which input package performs best."
        />
      </div>
      
      <div className="agri-card p-6 md:p-8 space-y-8 shadow-sm">

        {/* Step 1: Variety */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-gray-100 text-gray-600">1</div>
            <label className="text-sm font-bold" style={{ color: "var(--text)" }}>
              Which beans are you planting?
            </label>
          </div>
          
          <div className="grid sm:grid-cols-2 gap-3">
            {BEAN_VARIETIES.map((v) => {
              const active = form.beanVariety === v.value;
              return (
                <button
                  key={v.value}
                  type="button"
                  onClick={() => update("beanVariety", v.value)}
                  className="w-full text-left p-3 rounded border transition-all flex items-center gap-3"
                  style={{
                    borderColor: active ? "var(--primary)" : "var(--border)",
                    background: active ? "var(--primary-soft)" : "var(--surface)",
                    boxShadow: active ? "0 0 0 1px var(--primary)" : "none"
                  }}
                >
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${active ? 'border-[var(--primary)]' : 'border-gray-400'}`}>
                    {active && <div className="w-2 h-2 rounded-full bg-[var(--primary)]" />}
                  </div>
                  <div>
                    <div className="font-semibold text-sm" style={{ color: active ? "var(--primary-dark)" : "var(--text)" }}>
                      {v.label}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                      Code: {v.code}
                    </div>
                  </div>
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => update("beanVariety", "Other")}
              className="w-full text-left p-3 rounded border transition-all flex items-center gap-3"
              style={{
                borderColor: isUnsupported ? "var(--amber)" : "var(--border)",
                background: isUnsupported ? "var(--amber-soft)" : "var(--surface)",
                boxShadow: isUnsupported ? "0 0 0 1px var(--amber)" : "none"
              }}
            >
              <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${isUnsupported ? 'border-[var(--amber)]' : 'border-gray-400'}`}>
                {isUnsupported && <div className="w-2 h-2 rounded-full bg-[var(--amber)]" />}
              </div>
              <div>
                <div className="font-semibold text-sm" style={{ color: isUnsupported ? "var(--amber)" : "var(--text)" }}>
                  Other variety
                </div>
                <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                  My variety isn't listed
                </div>
              </div>
            </button>
          </div>
        </div>

        {isUnsupported ? (
          <div className="p-5 rounded-lg border animate-in fade-in slide-in-from-top-2 duration-300" style={{ background: "var(--amber-soft)", borderColor: "var(--amber-border)" }}>
            <div className="flex items-start gap-3">
              <AlertCircle size={22} className="shrink-0 mt-0.5" style={{ color: "var(--amber)" }} />
              <div>
                <h4 className="font-bold text-base mb-1" style={{ color: "var(--amber)" }}>
                  We don't have research on this variety yet
                </h4>
                <p className="text-sm mb-4" style={{ color: "var(--amber)" }}>
                  Our advice is currently based on past research for Rosecoco, Wairimu, and Mwitemania beans. Because we don't have trial data for this variety, we cannot give you a reliable recommendation for it.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button size="sm" onClick={() => goto("marketplace")}>Browse available seeds</Button>
                  <Button variant="secondary" size="sm" onClick={() => goto("faq")}>Read Farming Tips</Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-in fade-in duration-300">
            <hr style={{ borderColor: "var(--border)" }} />
            
            {/* Step 2: Season */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-gray-100 text-gray-600">2</div>
                <label className="text-sm font-bold" style={{ color: "var(--text)" }}>
                  When did you plant? (or plan to plant)
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {["Long Rains", "Short Rains"].map((s) => {
                  const active = form.season === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => update("season", s)}
                      className="w-full text-center py-3 rounded border font-semibold text-sm transition-all"
                      style={{
                        borderColor: active ? "var(--primary)" : "var(--border)",
                        background: active ? "var(--primary-soft)" : "var(--surface)",
                        color: active ? "var(--primary-dark)" : "var(--text-muted)",
                      }}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 3: Farm Context (Locality + Soil + Challenge) */}
            <div className="bg-gray-50 p-4 rounded-lg border" style={{ borderColor: "var(--border)", background: "var(--surface-alt)" }}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-white text-gray-600 shadow-sm">3</div>
                <label className="text-sm font-bold" style={{ color: "var(--text)" }}>
                  Farm Context <span className="font-normal text-gray-500">(Optional)</span>
                </label>
              </div>

              <div className="space-y-4">
                {/* Locality */}
                <Field label="Where is your farm? (Village or nearest town)">
                  <input
                    className="agri-input"
                    placeholder="e.g. Kerugoya"
                    value={form.locality}
                    onChange={(e) => update("locality", e.target.value)}
                  />
                </Field>

                {/* Soil Test Toggle */}
                <div className="pt-2 border-t" style={{ borderColor: "var(--border)" }}>
                  <label className="flex items-center gap-2 cursor-pointer mb-3">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded border-gray-300 text-[var(--primary)] focus:ring-[var(--primary)]"
                      checked={form.hasSoilTest}
                      onChange={(e) => update("hasSoilTest", e.target.checked)}
                    />
                    <span className="text-sm font-medium" style={{ color: "var(--text)" }}>
                      I have the following soil information
                    </span>
                  </label>

                  {form.hasSoilTest && (
                    <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2">
                      <Field label="Soil pH" hint="e.g. 5.5">
                        <input className="agri-input" type="number" step="0.1" value={form.ph} onChange={(e) => update("ph", e.target.value)} />
                      </Field>
                      <Field label="Organic Carbon (%)" hint="e.g. 1.8">
                        <input className="agri-input" type="number" step="0.1" value={form.tot_carbon} onChange={(e) => update("tot_carbon", e.target.value)} />
                      </Field>
                    </div>
                  )}
                </div>

                {/* Challenge */}
                <Field label="What is your biggest farming challenge right now?">
                  <select
                    className="agri-select"
                    value={form.challenge}
                    onChange={(e) => update("challenge", e.target.value)}
                  >
                    <option value="">Select a challenge (optional)</option>
                    <option value="rain">Not enough rain / Drought</option>
                    <option value="pests">Pests and diseases</option>
                    <option value="weeds">Too many weeds</option>
                    <option value="budget">Limited budget for inputs</option>
                  </select>
                </Field>
              </div>
            </div>

            <Button className="agri-btn-block h-12 text-base shadow-sm mt-4" onClick={submit} disabled={loading}>
              {loading ? "Running trial comparison..." : "Get Recommendations"}
            </Button>
          </div>
        )}
      </div>

      {historyUI}
    </div>
  );
}
function Marketplace({ goto, guest = false, initialSearch = "", goBack, user}) {
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
  const cartKey = guest ? "beanlink_cart_guest" : `beanlink_cart_${user?.user_id}`;

  const [cart, setCart] = useState(() => {
    try {
      const raw = localStorage.getItem(cartKey);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // Save to the user-specific key whenever cart changes
  useEffect(() => {
    try {
      localStorage.setItem(cartKey, JSON.stringify(cart));
    } catch {
      // storage unavailable
    }
  }, [cart, cartKey]);
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
            {goBack && initialSearch && (
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
            // 1. Remove the item from the cart state
            setCart((prevCart) => prevCart.filter((i) => i.listing_id !== checkoutItem.listing_id));
            
            // 2. Clear the checkout selection
            setCheckoutItem(null);
            setPaymentOpen(false);
            
            // 3. Notify the user and navigate
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
 const [sellerRating, setSellerRating] = useState(null); 
   useEffect(() => {
    if (!item?.listing_id) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const data = await getListing(item.listing_id);
        if (!cancelled) {
          setFresh(data.listing);
          
          // Fetch the rating for this seller
          if (data.listing.seller_id) {
            const ratingData = await getSellerRating(data.listing.seller_id);
            setSellerRating(ratingData);
          }
        }
      } catch (err) {
        push(err.message || "Failed to load listing", "red");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [item?.listing_id, push]);
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
    <div className="max-w-2xl mx-auto py-4">
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
            <div className="text-xs mb-1" style={{ color: "var(--text-faint)" }}>Seller Rating</div>
            {sellerRating && sellerRating.count > 0 ? (
              <div className="flex items-center gap-1 font-semibold">
                <span style={{ color: "var(--amber)" }}>★</span>
                {sellerRating.average} ({sellerRating.count} reviews)
              </div>
            ) : (
              <div className="text-gray-500">No ratings yet</div>
            )}
          </div>
          
          <div>
            <div className="text-xs mb-1" style={{ color: "var(--text-faint)" }}>Price</div>
            <div className="mono font-bold">{fmtKES(fresh.price_per_unit)}</div>
          </div>
          <div>
            <div className="text-xs mb-1" style={{ color: "var(--text-faint)" }}>Unit</div>
            <div className="mono font-bold">{fresh.unit || "—"}</div>
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
    <div className="max-w-2xl mx-auto py-4">
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
  
  // Review states
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [hasReviewed, setHasReviewed] = useState(false);

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

  const isBuyer = order?.buyer_id === user.user_id;
  const isSeller = order?.seller_id === user.user_id;

  // Check if this order has already been reviewed by the buyer
  useEffect(() => {
    if (!order || order.fulfillment_status !== "delivered" || !isBuyer) return;
    
    const checkReview = async () => {
      try {
        const data = await getOrderReview(order.txn_id); 
        if (data.review) setHasReviewed(true);
      } catch (err) {
        // Ignore errors
      }
    };
    checkReview();
  }, [order, isBuyer]);

  if (loading) return <PageSkeleton rows={2} />;
  if (!order) return null;

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
  const submitReview = async () => {
    setWorking(true);
    try {
      // Notice we pass order.txn_id as the first argument now
      await createReview(order.txn_id, {
        reviewee_id: order.seller_id, 
        rating: Number(rating),
        comment: comment || null
      });
      push("Review submitted. Thank you!", "green");
      setHasReviewed(true);
    } catch (err) {
      push(err.message || "Failed to submit review", "red");
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-4">
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
        
        {/* SELLER confirmation for pickup */}
        {isSeller && order.fulfillment_status === "ready_for_pickup" && (
          <div className="space-y-3 mt-4 p-4 rounded-lg border" style={{ borderColor: "var(--primary-soft-border)", background: "var(--primary-soft)" }}>
            <h4 className="font-bold text-sm" style={{ color: "var(--primary-dark)" }}>Confirm Handover</h4>
            <p className="text-xs" style={{ color: "var(--primary-dark)" }}>
              Ask the buyer for their 6-digit pickup code and enter it below to complete the order.
            </p>
            <Field label="Enter Buyer's Pickup Code">
              <input
                className="agri-input mono"
                value={pickupInput}
                onChange={(e) => setPickupInput(e.target.value.toUpperCase())}
                placeholder="e.g. A3K9P2"
                maxLength={6}
              />
            </Field>
            <Button className="agri-btn-block" disabled={working || pickupInput.length < 4} onClick={confirmReceipt}>
              {working ? "Confirming…" : "Confirm Handover"}
            </Button>
          </div>
        )}
        
        {/* Buyer confirmation */}
        {isBuyer && order.fulfillment_method === "pickup" && order.pickup_code && order.fulfillment_status !== "delivered" && (
          <div className="p-4 rounded mb-4" style={{ background: "var(--primary-soft)", border: "1px solid var(--primary-soft-border)" }}>
            <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "var(--primary)" }}>
              Show this code to the seller when you collect your order
            </div>
            <div className="mono text-3xl font-bold" style={{ color: "var(--primary-dark)", letterSpacing: 4 }}>
              {order.pickup_code}
            </div>
          </div>
        )}

        {/* Delivered status */}
        {order.fulfillment_status === "delivered" && (
          <div className="p-3 rounded text-sm flex items-center gap-2 mt-4"
               style={{ background: "var(--primary-soft)", border: "1px solid var(--primary-soft-border)", color: "var(--primary-dark)" }}>
            <CheckCircle2 size={16} />
            Delivered {fmtDate(order.delivered_at)}
          </div>
        )}

        {/* RATING / REVIEWS SECTION (Buyer only, after delivery) */}
        {isBuyer && order.fulfillment_status === "delivered" && (
          <div className="mt-6 pt-6 border-t" style={{ borderColor: "var(--border)" }}>
            <h4 className="font-semibold mb-3">Rate this Seller</h4>
            
            {hasReviewed ? (
              <div className="p-3 rounded text-sm flex items-center gap-2" 
                   style={{ background: "var(--surface-alt)", color: "var(--text-muted)" }}>
                <CheckCircle2 size={16} style={{ color: "var(--primary)" }} />
                You have already submitted a review for this order.
              </div>
            ) : (
              <div className="space-y-3">
                <Field label="Rating (1-5 stars)">
                  <select 
                    className="agri-select" 
                    value={rating} 
                    onChange={(e) => setRating(e.target.value)}
                  >
                    <option value="5">5 - Excellent</option>
                    <option value="4">4 - Good</option>
                    <option value="3">3 - Average</option>
                    <option value="2">2 - Poor</option>
                    <option value="1">1 - Terrible</option>
                  </select>
                </Field>
                
                <Field label="Comment (optional)">
                  <textarea
                    className="agri-textarea"
                    rows={2}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="How was the quality of the produce/inputs?"
                  />
                </Field>
                
                <Button className="agri-btn-block" onClick={submitReview} disabled={working}>
                  {working ? "Submitting..." : "Submit Review"}
                </Button>
              </div>
            )}
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
     <div className="w-full max-w-lg mx-auto">
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
   MARKET PRICES (KAMIS Format)
   ========================================================================== */
const PAGE_SIZES = [10, 25, 50, 100];
const MUTED = { color: "var(--text-muted)" };
const FAINT = { color: "var(--text-faint)" };

const rowTime = (r) => {
  const t = new Date(r.recorded_date).getTime();
  return Number.isNaN(t) ? 0 : t;
};

const isoDay = (v) => {
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

// Missing or invalid values show a dash instead of "KES NaN"
const money = (v) =>
  v === null || v === undefined || v === "" || Number.isNaN(Number(v)) ? "—" : fmtKES(v);
const dateText = (v) => (isoDay(v) ? fmtDate(v) : "—");

// Page numbers with gaps: 1 … 4 5 6 … 20
function pageWindow(current, total) {
  const keep = [...new Set([1, total, current - 1, current, current + 1])]
    .filter((p) => p >= 1 && p <= total)
    .sort((a, b) => a - b);
  const out = [];
  keep.forEach((p, i) => {
    if (i > 0 && p - keep[i - 1] > 1) out.push("…");
    out.push(p);
  });
  return out;
}

// Quote every cell, escape quotes, and stop spreadsheet formulas from running
function csvCell(v) {
  if (v === null || v === undefined) return "";
  let s = String(v);
  if (/^[=+\-@]/.test(s) && Number.isNaN(Number(s))) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

function exportCsv(rows) {
  const header = [
    "Variety", "Market", "County", "Retail price (KES/kg)",
    "Wholesale price (KES/kg)", "Supply volume", "Date", "Source",
  ];
  const lines = rows.map((r) =>
    [
      r.bean_variety, r.market_name, r.county, r.price_per_kg,
      r.wholesale_price, r.supply_volume, isoDay(r.recorded_date), r.source,
    ].map(csvCell).join(",")
  );
  // The BOM makes Excel read the file as UTF-8
  const csv = "\uFEFF" + [header.map(csvCell).join(","), ...lines].join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `bean_prices_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function MarketPrices({ guest, goto }) {
  const [rawRows, setRawRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const [variety, setVariety] = useState("all");
  const [county, setCounty] = useState("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  // Load prices. A failed request shows an error with a retry button,
  // not an empty table that looks like "no data".
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    (async () => {
      try {
        const data = await getPrices({});
        if (!cancelled) setRawRows(data.prices || []);
      } catch (err) {
        if (!cancelled) setError(err.message || "Couldn't load prices.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [reloadKey]);

  // Filter options come from the data, so every option has records behind it
  const varietyOptions = useMemo(
    () => [...new Set(rawRows.map((r) => r.bean_variety).filter(Boolean))].sort(),
    [rawRows]
  );
  const countyOptions = useMemo(
    () => [...new Set(rawRows.map((r) => r.county).filter(Boolean))].sort(),
    [rawRows]
  );

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const out = rawRows.filter(
      (r) =>
        (variety === "all" || r.bean_variety === variety) &&
        (county === "all" || r.county === county) &&
        (!q || [r.market_name, r.bean_variety, r.county].some((v) => v && String(v).toLowerCase().includes(q)))
    );
    const price = (r) => Number(r.price_per_kg) || 0;
    out.sort(
      sort === "price-low" ? (a, b) => price(a) - price(b)
      : sort === "price-high" ? (a, b) => price(b) - price(a)
      : (a, b) => rowTime(b) - rowTime(a)
    );
    return out;
  }, [rawRows, variety, county, search, sort]);

  // Optional columns only appear when at least one row has a value
  const has = useMemo(() => {
    const some = (key) => rows.some((r) => r[key] !== null && r[key] !== undefined && r[key] !== "");
    return {
      classification: some("classification"),
      grade: some("grade"),
      wholesale: some("wholesale_price"),
      supply: some("supply_volume"),
    };
  }, [rows]);

  const summary = useMemo(() => {
    if (rows.length === 0) return null;
    const latest = rows.reduce((m, r) => Math.max(m, rowTime(r)), 0);
    const onLatest = rows.filter((r) => rowTime(r) === latest && Number(r.price_per_kg) > 0);
    const avg = onLatest.length
      ? onLatest.reduce((s, r) => s + Number(r.price_per_kg), 0) / onLatest.length
      : null;
    return {
      latest,
      avg,
      n: onLatest.length,
      markets: new Set(rows.map((r) => r.market_name).filter(Boolean)).size,
      count: rows.length,
    };
  }, [rows]);

  const sources = useMemo(
    () => [...new Set(rows.map((r) => r.source).filter(Boolean))],
    [rows]
  );

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const current = Math.min(page, totalPages);
  const start = (current - 1) * pageSize;
  const pageRows = rows.slice(start, start + pageSize);

  const filtersActive = variety !== "all" || county !== "all" || search.trim() !== "";
  const clearFilters = () => { setVariety("all"); setCounty("all"); setSearch(""); setPage(1); };
  const onFilter = (setter) => (e) => { setter(e.target.value); setPage(1); };

  const stats = summary && [
    { label: "Latest record", value: summary.latest > 0 ? dateText(summary.latest) : "—" },
    {
      label: "Average retail price",
      value: summary.avg === null ? "—" : `${fmtKES(Math.round(summary.avg))}/kg`,
      mono: true,
      note: summary.avg === null ? "" : `${summary.n} ${summary.n === 1 ? "record" : "records"} on that date`,
    },
    { label: "Markets", value: summary.markets, mono: true },
    { label: "Records", value: summary.count, mono: true },
  ];

  return (
    <div className="space-y-5">
      <SectionHeading
        title="Bean Market Prices"
        subtitle="Recorded bean prices from market observations."
      />
 {/* --- ADD THIS BANNER --- */}
      <div className="p-3.5 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm" 
           style={{ background: "var(--blue-soft)", border: "1px solid var(--blue-border)", color: "var(--blue)" }}>
        <div className="flex items-start gap-2">
          <Info size={16} className="shrink-0 mt-0.5" />
          <span>
            Prices are updated periodically from the official KAMIS portal. For the absolute latest daily prices, check the live source.
          </span>
        </div>
        <a 
          href="https://kamis.kilimo.go.ke" 
          target="_blank" 
          rel="noreferrer"
          className="shrink-0 font-semibold underline hover:opacity-80 flex items-center gap-1"
        >
          Visit KAMIS <ChevronRight size={14} />
        </a>
      </div>
      {guest && (
        <div
          className="p-3 rounded text-sm flex items-center gap-2"
          style={{ background: "var(--amber-soft)", color: "var(--amber)", border: "1px solid var(--amber-border)" }}
        >
          <Info size={15} className="shrink-0" />
          <span>
            You're viewing public market data.{" "}
            <button type="button" className="font-semibold underline" onClick={() => goto("register")}>Register</button> or{" "}
            <button type="button" className="font-semibold underline" onClick={() => goto("login")}>Log in</button>{" "}
            to access your dashboard.
          </span>
        </div>
      )}

      {/* Summary */}
      {stats && !loading && !error && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {stats.map((s) => (
            <div key={s.label} className="agri-stat p-4">
              <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={FAINT}>{s.label}</div>
              <div className={`text-xl font-bold ${s.mono ? "mono" : ""}`}>{s.value}</div>
              {s.note && <div className="text-xs mt-0.5" style={MUTED}>{s.note}</div>}
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="agri-card p-4">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Field label="Bean variety">
            <select className="agri-select" value={variety} onChange={onFilter(setVariety)}>
              <option value="all">All varieties</option>
              {varietyOptions.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </Field>
          <Field label="County">
            <select className="agri-select" value={county} onChange={onFilter(setCounty)}>
              <option value="all">All counties</option>
              {countyOptions.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Search">
            <input
              type="text"
              className="agri-input"
              placeholder="Market, variety or county"
              value={search}
              onChange={onFilter(setSearch)}
            />
          </Field>
          <Field label="Sort by">
            <select className="agri-select" value={sort} onChange={onFilter(setSort)}>
              <option value="newest">Newest first</option>
              <option value="price-low">Price: low to high</option>
              <option value="price-high">Price: high to low</option>
            </select>
          </Field>
        </div>
        {filtersActive && (
          <div className="mt-3">
            <button type="button" className="text-sm font-semibold underline" style={{ color: "var(--primary)" }} onClick={clearFilters}>
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* Results */}
      {loading ? (
        <PageSkeleton rows={5} />
      ) : error ? (
        <EmptyState
          icon={AlertCircle}
          title="Couldn't load prices"
          body={error}
          action={<Button variant="secondary" onClick={() => setReloadKey((k) => k + 1)}>Try again</Button>}
        />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={TrendingUp}
          title="No price records found"
          body={filtersActive ? "Nothing matches these filters. Try a different variety, county or search." : "No prices have been recorded yet. Check back soon."}
          action={filtersActive ? <Button variant="secondary" onClick={clearFilters}>Clear filters</Button> : undefined}
        />
      ) : (
        <div className="agri-card overflow-hidden">
          <div
            className="px-4 py-3 flex flex-wrap items-center justify-between gap-3 border-b"
            style={{ borderColor: "var(--border)", background: "var(--surface-alt)" }}
          >
            <div>
              <h3 className="font-semibold text-sm">Price records</h3>
              <p className="text-xs" style={MUTED} aria-live="polite">
                {rows.length} {rows.length === 1 ? "record" : "records"}{filtersActive ? " match your filters" : ""}
              </p>
            </div>
            <button type="button" className="agri-btn agri-btn-secondary agri-btn-sm" onClick={() => exportCsv(rows)}>
              Download CSV
            </button>
          </div>

          {/* Table: tablets and larger */}
          <div className="hidden md:block agri-table-wrap">
            <table className="agri-table">
              <thead>
                <tr>
                  <th>Variety</th>
                  <th>Market</th>
                  <th>County</th>
                  {has.classification && <th>Classification</th>}
                  {has.grade && <th>Grade</th>}
                  <th style={{ textAlign: "right" }}>Retail / kg</th>
                  {has.wholesale && <th style={{ textAlign: "right" }}>Wholesale / kg</th>}
                  {has.supply && <th style={{ textAlign: "right" }}>Supply</th>}
                  <th>Date</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((r, i) => (
                  <tr key={r.price_id ?? `${r.market_name}-${r.recorded_date}-${start + i}`}>
                    <td className="font-medium">{beanLabel(r.bean_variety) || r.bean_variety || "—"}</td>
                    <td>{r.market_name || "—"}</td>
                    <td>{r.county || "—"}</td>
                    {has.classification && <td>{r.classification || "—"}</td>}
                    {has.grade && <td>{r.grade || "—"}</td>}
                    <td className="mono font-semibold" style={{ textAlign: "right", color: "var(--primary)" }}>{money(r.price_per_kg)}</td>
                    {has.wholesale && <td className="mono" style={{ textAlign: "right" }}>{money(r.wholesale_price)}</td>}
                    {has.supply && <td className="mono" style={{ textAlign: "right" }}>{r.supply_volume || "—"}</td>}
                    <td style={MUTED}>{dateText(r.recorded_date)}</td>
                    <td>{r.source ? <span className="agri-badge agri-badge-gray">{r.source}</span> : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cards: phones */}
          <div className="md:hidden">
            {pageRows.map((r, i) => (
              <div
                key={r.price_id ?? `${r.market_name}-${r.recorded_date}-${start + i}`}
                className="p-4 border-b last:border-b-0"
                style={{ borderColor: "var(--border)" }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-sm">{r.bean_variety || "—"}</div>
                    <div className="text-xs flex items-center gap-1 mt-0.5" style={MUTED}>
                      <MapPin size={11} className="shrink-0" />
                      <span className="truncate">{[r.market_name, r.county].filter(Boolean).join(", ") || "—"}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="mono font-bold" style={{ color: "var(--primary)" }}>
                      {money(r.price_per_kg)}<span className="text-xs font-normal" style={MUTED}> /kg</span>
                    </div>
                    {has.wholesale && r.wholesale_price ? (
                      <div className="text-xs" style={MUTED}>Wholesale {money(r.wholesale_price)}</div>
                    ) : null}
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2 text-xs" style={FAINT}>
                  <span className="flex items-center gap-1"><Calendar size={11} />{dateText(r.recorded_date)}</span>
                  {r.source && <span className="agri-badge agri-badge-gray">{r.source}</span>}
                </div>
              </div>
            ))}
          </div>

          {/* Footer: sources, rows per page, pagination */}
          <div
            className="px-4 py-3 border-t flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
            style={{ borderColor: "var(--border)", background: "var(--surface-alt)" }}
          >
            <div className="text-xs space-y-1" style={MUTED}>
              <div>Showing {start + 1} to {Math.min(start + pageSize, rows.length)} of {rows.length}</div>
              {sources.length > 0 && <div>Source: {sources.join(", ")}</div>}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-xs" style={MUTED}>
                Rows per page
                <select
                  className="agri-select"
                  style={{ width: "auto", padding: "5px 8px" }}
                  value={pageSize}
                  onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                >
                  {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>

              {totalPages > 1 && (
                <nav aria-label="Pagination" className="flex items-center gap-1">
                  <button
                    type="button"
                    className="agri-btn agri-btn-secondary agri-btn-sm"
                    aria-label="Previous page"
                    disabled={current === 1}
                    onClick={() => setPage(current - 1)}
                  >
                    <ChevronLeft size={14} />
                  </button>
                  {pageWindow(current, totalPages).map((p, i) =>
                    p === "…" ? (
                      <span key={`gap-${i}`} className="px-1 text-sm" style={FAINT}>…</span>
                    ) : (
                      <button
                        key={p}
                        type="button"
                        className={`agri-btn agri-btn-sm ${p === current ? "agri-btn-primary" : "agri-btn-secondary"}`}
                        aria-label={`Page ${p}`}
                        aria-current={p === current ? "page" : undefined}
                        onClick={() => setPage(p)}
                      >
                        {p}
                      </button>
                    )
                  )}
                  <button
                    type="button"
                    className="agri-btn agri-btn-secondary agri-btn-sm"
                    aria-label="Next page"
                    disabled={current === totalPages}
                    onClick={() => setPage(current + 1)}
                  >
                    <ChevronRight size={14} />
                  </button>
                </nav>
              )}
            </div>
          </div>
        </div>
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
  const myRole = "all";
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
        
        // Transform the orders into transaction records
        let list = (data.orders || []).map((o) => {
          const isSeller = o.myRole === "seller";
          
          return {
            id: `TXN-${o.id.replace("ORD-", "")}`,
            date: o.date,
            type: isSeller ? "Produce Sale" : "Input Purchase",
            description: `${o.item} · ${isSeller ? "Sold to" : "Bought from"} ${o.counterpartyName}`,
            // If I sold, money comes in (+). If I bought, money goes out (-).
            amount: isSeller ? o.amount : -o.amount,
            status: o.status,
          };
        });
        
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
      push("Profile updated successfully", "green");
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

  if (loading) return <PageSkeleton rows={2} />;
  if (!profile) return null;

  // Check if the profile is missing crucial info
  const isIncomplete = !profile.phone_number || !profile.county;

  return (
     <div className="w-full max-w-lg mx-auto">
      <SectionHeading title="Profile" subtitle="Manage your account information." />
      
      {/* Incomplete Profile Prompt */}
      {isIncomplete && (
        <div 
          className="p-4 rounded-lg mb-5 flex items-start gap-3 animate-in fade-in slide-in-from-top-2"
          style={{ background: "var(--amber-soft)", border: "1px solid var(--amber-border)" }}
        >
          <AlertCircle size={20} className="shrink-0 mt-0.5" style={{ color: "var(--amber)" }} />
          <div>
            <h4 className="font-semibold text-sm mb-1" style={{ color: "var(--amber)" }}>
              Complete your profile
            </h4>
            <p className="text-xs" style={{ color: "var(--amber)" }}>
              Please add your phone number and county. This helps us provide better localized market data and ensures buyers/sellers can contact you.
            </p>
          </div>
        </div>
      )}

      <div className="agri-card p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold" style={{ background: "var(--primary-soft)", color: "var(--primary-dark)" }}>
            {profile.full_name.split(" ").map((p) => p[0]).join("").slice(0, 2)}
          </div>
          <div>
            <div className="font-bold">{profile.full_name}</div>
            <div className="text-sm capitalize" style={{ color: "var(--text-muted)" }}>
              {profile.role} · {profile.county || "Location missing"}
            </div>
          </div>
        </div>
        
        <div className="space-y-4">
          <Field label="Full name">
            <input className="agri-input" value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} />
          </Field>
          
          <Field label="Phone number" hint={!profile.phone_number ? "Required for order fulfillment" : ""}>
            <input 
              className="agri-input" 
              value={form.phone_number} 
              onChange={(e) => setForm((f) => ({ ...f, phone_number: e.target.value }))} 
              placeholder="e.g. 0712 345 678"
            />
          </Field>
          
          <Field label="County">
            <input 
              className="agri-input" 
              value={form.county} 
              onChange={(e) => setForm((f) => ({ ...f, county: e.target.value }))} 
              placeholder="e.g. Machakos"
            />
          </Field>
          
          <Button onClick={save} disabled={saving} className="mt-2">
            {saving ? "Saving…" : "Save Changes"}
          </Button>
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

/* ============================================================================
   ADMIN MARKET PRICES DATA MANAGEMENT (Bulk KAMIS Upload + Manual Entry)
   ========================================================================== */
function AdminMarketPrices() {
  const { push } = useToast();
  const { open } = useModal();
  
  // State for Price Records Table
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Bulk Upload States
  const [csvFile, setCsvFile] = useState(null);
  const [bulkPreviewCount, setBulkPreviewCount] = useState(0);

  // Manual Form State
  const [form, setForm] = useState({
    market_name: "",
    county: "",
    bean_variety: "Kenya Umoja",
    price_per_kg: "",
    recorded_date: "",
    source: "KAMIS",
  });

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // Fetch all price records
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

  useEffect(() => {
    load();
  }, [load]);

  // Handle Single Record Manual Save
  const addRecord = async () => {
    if (!form.market_name || !form.price_per_kg || !form.recorded_date) {
      push("Please fill market, price, and date fields", "amber");
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
        source: form.source || "KAMIS Manual",
      });
      open({
        tone: "success",
        title: "Price record saved",
        body: "The new market price is now live on the public KAMIS dashboard.",
        confirmLabel: "Done",
      });
      setForm({
        market_name: "",
        county: "",
        bean_variety: "Kenya Umoja",
        price_per_kg: "",
        recorded_date: "",
        source: "KAMIS",
      });
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

  // Handle Bulk CSV Selection & Parsing
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setCsvFile(file);

    // Simple line counter for preview
    const reader = new FileReader();
    reader.onload = (evt) => {
      const lines = evt.target.result.split("\n").filter((l) => l.trim().length > 0);
      setBulkPreviewCount(Math.max(0, lines.length - 1)); // subtract header line
    };
    reader.readAsText(file);
  };

  // Handle Bulk Import Upload Action
  const handleBulkImport = async () => {
    if (!csvFile) {
      push("Please select a KAMIS CSV or Excel export file first", "amber");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", csvFile);

      // Call batch import API endpoint
      await adminBatchImportPrices(formData);

      open({
        tone: "success",
        title: "KAMIS Bulk Import Successful",
        body: `Processed and imported ${bulkPreviewCount} price records.`,
        confirmLabel: "Great",
      });

      setCsvFile(null);
      setBulkPreviewCount(0);
      load();
    } catch (err) {
      open({
        tone: "error",
        title: "Bulk Import Failed",
        body: err.message || "Ensure the CSV file columns match the KAMIS export format.",
        confirmLabel: "Close",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-5">
      <SectionHeading
        title="Market Price Data Management"
        subtitle="Upload bulk KAMIS CSV spreadsheets or manually add price records to feed the public Market Price Dashboard."
      />

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Left Column: Management Tools */}
        <div className="space-y-5 lg:col-span-1 h-fit">
          
          {/* BULK KAMIS CSV IMPORT CARD */}
                   {/* BULK KAMIS CSV IMPORT CARD */}
          <div className="agri-card p-5 border-emerald-200 bg-emerald-50/30">
            <div className="flex items-center gap-2 mb-3">
              <h3 className="font-semibold text-gray-900">Periodic KAMIS Import</h3>
            </div>
            <p className="text-xs text-gray-600 mb-4">
              Download the latest CSV export from the{" "}
              <a 
                href="https://kamis.kilimo.go.ke" 
                target="_blank" 
                rel="noreferrer"
                className="text-emerald-700 underline font-semibold"
              >
                official KAMIS portal
              </a>{" "}
              and upload it here to update the public dashboard.
            </p>

            <div className="space-y-3">
              <Field label="Select KAMIS File">
                <input
                  type="file"
                  accept=".csv"
                  className="agri-input text-xs"
                  onChange={handleFileSelect}
                />
              </Field>

              {bulkPreviewCount > 0 && (
                <div className="p-2.5 rounded bg-emerald-100 text-emerald-900 text-xs font-medium flex justify-between">
                  <span>Detected Records:</span>
                  <span className="font-bold">{bulkPreviewCount} rows</span>
                </div>
              )}

              <Button
                className="agri-btn-block bg-emerald-700 hover:bg-emerald-800 text-white"
                onClick={handleBulkImport}
                disabled={uploading || !csvFile}
              >
                {uploading ? "Importing Records..." : "Upload & Update Dashboard"}
              </Button>
            </div>
          </div>

          {/* SINGLE RECORD MANUAL ADD FORM */}
          <div className="agri-card p-5">
            <h3 className="font-semibold mb-3 text-gray-900">Manual Quick-Add</h3>
            <p className="text-xs text-gray-500 mb-4">
              Manually record a single price observation.
            </p>

            <div className="space-y-3">
              <Field label="Market Name">
                <input
                  className="agri-input"
                  value={form.market_name}
                  onChange={(e) => update("market_name", e.target.value)}
                  placeholder="e.g. Wakulima, Kerugoya"
                />
              </Field>

              <Field label="County">
                <input
                  className="agri-input"
                  value={form.county}
                  onChange={(e) => update("county", e.target.value)}
                  placeholder="e.g. Kirinyaga, Nairobi"
                />
              </Field>

              <Field label="Bean Variety">
                <select
                  className="agri-select"
                  value={form.bean_variety}
                  onChange={(e) => update("bean_variety", e.target.value)}
                >
                  {BEAN_VARIETIES.map((v) => (
                    <option key={v.value} value={v.value}>
                      {v.label} · {v.code}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Price (KES/kg)">
                <input
                  className="agri-input"
                  type="number"
                  placeholder="e.g. 140"
                  value={form.price_per_kg}
                  onChange={(e) => update("price_per_kg", e.target.value)}
                />
              </Field>

              <Field label="Recorded Date">
                <input
                  className="agri-input"
                  type="date"
                  value={form.recorded_date}
                  onChange={(e) => update("recorded_date", e.target.value)}
                />
              </Field>

              <Field label="Data Source">
                <input
                  className="agri-input"
                  placeholder="e.g. KAMIS, Field Survey"
                  value={form.source}
                  onChange={(e) => update("source", e.target.value)}
                />
              </Field>

              <Button
                className="agri-btn-block"
                onClick={addRecord}
                disabled={saving}
              >
                {saving ? "Saving…" : "Save Single Record"}
              </Button>
            </div>
          </div>

        </div>

        {/* Right Column: Existing Price Records Database Table */}
        <div className="agri-card lg:col-span-2 overflow-hidden">
          <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
            <h3 className="font-bold text-gray-800 text-sm">
              Live Database Price Records
            </h3>
            <Badge tone="gray">{rows.length} Total Records</Badge>
          </div>

          {loading ? (
            <div className="p-5">
              <PageSkeleton rows={3} />
            </div>
          ) : rows.length === 0 ? (
            <div className="p-5">
              <EmptyState
                icon={TrendingUp}
                title="No price records in database"
                body="Import a KAMIS CSV file or manually add a record using the forms on the left."
              />
            </div>
          ) : (
            <div className="agri-table-wrap">
              <table className="agri-table">
                <thead>
                  <tr>
                    <th>Market</th>
                    <th>County</th>
                    <th>Variety</th>
                    <th>Price/kg</th>
                    <th>Date</th>
                    <th>Source</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 50).map((r) => (
                    <tr key={r.price_id}>
                      <td className="font-semibold text-gray-900">{r.market_name}</td>
                      <td>{r.county || "—"}</td>
                      <td>{beanShort(r.bean_variety)}</td>
                      <td className="mono font-semibold text-emerald-800">
                        {fmtKES(r.price_per_kg)}
                      </td>
                      <td className="text-gray-500">{fmtDate(r.recorded_date)}</td>
                      <td>
                        <Badge tone={r.source && r.source.includes("KAMIS") ? "green" : "gray"}>
                          {r.source || "KAMIS"}
                        </Badge>
                      </td>
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
function Onboarding({ user, onComplete }) {
  const [loading, setLoading] = useState(false);

  const handleSelect = async (selectedRole) => {
    setLoading(true);
    try {
      const data = await completeOnboarding(selectedRole); 
      onComplete(data);
    } catch (err) {
      alert("Failed to save your selection. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="agri-root min-h-screen flex items-center justify-center px-5 bg-gray-50 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 flex items-center justify-center rounded mx-auto mb-4" style={{ background: "var(--primary)" }}>
            <Sprout size={24} color="#fff" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Welcome, {user.full_name.split(" ")[0]}!</h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Let's personalize your experience. What do you want to achieve on BeanLink?
          </p>
        </div>

        <div className="space-y-3">
          {[
            { role: "farmer", icon: Sprout, title: "I want to grow and sell beans", desc: "Get AI recommendations, list harvests, and track market prices." },
            { role: "buyer", icon: ShoppingBag, title: "I want to purchase produce and farm inputs", desc: "Browse high-quality produce and connect directly with farmers and suppliers." },
            { role: "supplier", icon: Package, title: "I want to supply farm inputs", desc: "List and sell seeds, fertilizers, and equipment to farmers." }
          ].map((opt) => (
            <button
              key={opt.role}
              disabled={loading}
              onClick={() => handleSelect(opt.role)}
              className="w-full text-left p-4 rounded border transition-all hover:border-green-600 hover:shadow-md disabled:opacity-50 agri-card"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: "var(--primary-soft)" }}>
                  <opt.icon size={20} style={{ color: "var(--primary)" }} />
                </div>
                <div>
                  <div className="font-bold text-sm" style={{ color: "var(--text)" }}>{opt.title}</div>
                  <div className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>{opt.desc}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
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
  const [returnTo, setReturnTo] = useState(null); 
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
    
    // Check if they have completed onboarding
    if (user.onboarding_completed === false) {
      setPage("onboarding");
    } else {
      setPage("dashboard");
    }
  };
 const handleOnboardingComplete = ({ user: updatedUser, token }) => {
  if (!updatedUser || updatedUser.onboarding_completed !== true) {
    throw new Error("Onboarding was not completed successfully.");
  }

  const newSession = { ...session, ...updatedUser };

  if (token) {
    localStorage.setItem("beanlink_token", token);
  }

  localStorage.setItem("beanlink_user", JSON.stringify(newSession));
  setSession(newSession);
  setSelectedItem(null);
  setReturnTo(null);
  setPage("dashboard");
};
  const handleUserUpdate = (user) => {
    const merged = { ...session, ...user };
    localStorage.setItem("beanlink_user", JSON.stringify(merged));
    setSession(merged);
  };
  const handleLogout = () => {
    // Clear auth tokens
    localStorage.removeItem("beanlink_token");
    localStorage.removeItem("beanlink_user");
    
    // Clear the user's cart
    if (session?.user_id) {
      localStorage.removeItem(`beanlink_cart_${session.user_id}`);
    }
    localStorage.removeItem("beanlink_cart_guest");

    setSession(null);
    setPage("landing");
  };
if (session && session.onboarding_completed !== true) {
  return (
    <ToastHost>
      <ModalHost>
        <GlobalStyle />
        <Onboarding
          user={session}
          onComplete={handleOnboardingComplete}
        />
      </ModalHost>
    </ToastHost>
  );
}
  // --- UNAUTHENTICATED / GUEST FLOW ---
  if (!session) {
    let guestContent = null;

    if (page === "landing") {
      guestContent = <Landing goto={goto} goLogin={goLogin} goRegister={goRegister} />;
    } else if (page === "login") {
      guestContent = (
        <GuestPage page="login" goto={goto} goLogin={goLogin} goRegister={goRegister}>
          <Login goto={goto} onLogin={handleLogin} mode={authMode} setMode={setAuthMode} />
        </GuestPage>
      );
    } else if (page === "about") {
      guestContent = <AboutPage goto={goto} goLogin={goLogin} goRegister={goRegister} />;
    }else if (page === "faq") {
      guestContent = <FAQPage goto={goto} goLogin={goLogin} goRegister={goRegister} />;
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
      if (page === "onboarding") {
    return <Onboarding user={session} onComplete={handleOnboardingComplete} />;
  }
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
      user={session}
    />
  );
        case "onboarding":
        return <Onboarding user={session} onComplete={handleOnboardingComplete} />;
      case "faq":
        return <FAQPage goto={goto} goLogin={goLogin} goRegister={goRegister} isAuthenticated={true} />;
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
