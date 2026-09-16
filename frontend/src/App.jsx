import React, { useState, useMemo } from "react";
import {
  Home, ShoppingBag, Sprout, Package, TrendingUp, ClipboardList, Receipt,
  User, Search, Bell, Menu, X, ChevronRight, ChevronLeft, ChevronDown,
  MapPin, Calendar, CheckCircle2, Clock, AlertCircle, Plus, SlidersHorizontal,
  ArrowLeft, LogOut, Users, BarChart3, ShieldCheck, Flag, Leaf, Wheat,
  Beaker, Tractor, ShieldAlert, PauseCircle, Trash2, Pencil, ArrowUpRight,
  Info, ChevronUp
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

/* ============================================================================
   DESIGN TOKENS
   Practical Kenyan agricultural platform: white/light neutral surfaces,
   restrained agricultural green, dark text, subtle borders, moderate radius,
   rectangular buttons, monospace used only for figures (prices, quantities,
   IDs) as a small signature that reinforces the "transparent market data"
   idea without adding decoration.
   ========================================================================== */
const GlobalStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');

    .agri-root {
      --bg: #FAFAF8;
      --surface: #FFFFFF;
      --surface-alt: #F2F1EB;
      --border: #DEDBD1;
      --border-strong: #C6C1B4;
      --text: #1E1E1A;
      --text-muted: #67675D;
      --text-faint: #93907F;
      --primary: #2E5339;
      --primary-dark: #1F3B28;
      --primary-soft: #E7EEE6;
      --primary-soft-border: #C6D8C4;
      --amber: #92640E;
      --amber-soft: #F4ECD9;
      --amber-border: #DFC98F;
      --blue: #3A5A80;
      --blue-soft: #E6ECF2;
      --blue-border: #BDCEDD;
      --red: #A23C3C;
      --red-soft: #F5E7E6;
      --red-border: #E0BDBB;
      font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif;
      background: var(--bg);
      color: var(--text);
    }
    .agri-root .mono { font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace; }

    .agri-btn {
      display: inline-flex; align-items: center; justify-content: center; gap: 8px;
      padding: 10px 18px; border-radius: 4px; font-size: 14px; font-weight: 600;
      border: 1px solid transparent; cursor: pointer; transition: background 0.12s ease, border-color 0.12s ease;
      white-space: nowrap;
    }
    .agri-btn:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
    .agri-btn-primary { background: var(--primary); color: #fff; }
    .agri-btn-primary:hover { background: var(--primary-dark); }
    .agri-btn-secondary { background: var(--surface); color: var(--text); border-color: var(--border-strong); }
    .agri-btn-secondary:hover { background: var(--surface-alt); }
    .agri-btn-ghost { background: transparent; color: var(--text-muted); border-color: transparent; }
    .agri-btn-ghost:hover { background: var(--surface-alt); color: var(--text); }
    .agri-btn-danger { background: var(--surface); color: var(--red); border-color: var(--red-border); }
    .agri-btn-danger:hover { background: var(--red-soft); }
    .agri-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .agri-btn-sm { padding: 6px 12px; font-size: 13px; }
    .agri-btn-block { width: 100%; }

    .agri-card { background: var(--surface); border: 1px solid var(--border); border-radius: 6px; }
    .agri-input, .agri-select, .agri-textarea {
      width: 100%; border: 1px solid var(--border-strong); border-radius: 4px; padding: 9px 11px;
      font-size: 14px; font-family: inherit; color: var(--text); background: var(--surface);
    }
    .agri-input:focus, .agri-select:focus, .agri-textarea:focus { outline: 2px solid var(--primary); outline-offset: 0; border-color: var(--primary); }
    .agri-label { font-size: 13px; font-weight: 600; color: var(--text); margin-bottom: 6px; display: block; }
    .agri-hint { font-size: 12.5px; color: var(--text-faint); margin-top: 4px; }

    .agri-badge {
      display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600;
      padding: 3px 8px 3px 6px; border-radius: 3px; border-left: 3px solid;
    }
    .agri-badge-green { background: var(--primary-soft); border-color: var(--primary); color: var(--primary-dark); }
    .agri-badge-amber { background: var(--amber-soft); border-color: var(--amber); color: var(--amber); }
    .agri-badge-blue { background: var(--blue-soft); border-color: var(--blue); color: var(--blue); }
    .agri-badge-red { background: var(--red-soft); border-color: var(--red); color: var(--red); }
    .agri-badge-gray { background: var(--surface-alt); border-color: var(--border-strong); color: var(--text-muted); }

    .agri-nav-link { display: flex; align-items: center; gap: 12px; padding: 9px 14px; border-radius: 4px; font-size: 14px; font-weight: 500; color: var(--text-muted); cursor: pointer; border-left: 3px solid transparent; }
    .agri-nav-link:hover { background: var(--surface-alt); color: var(--text); }
    .agri-nav-link.active { background: var(--primary-soft); color: var(--primary-dark); border-left-color: var(--primary); font-weight: 600; }

    .agri-table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
    .agri-table th { text-align: left; padding: 10px 14px; font-weight: 600; color: var(--text-muted); border-bottom: 1px solid var(--border); white-space: nowrap; font-size: 12.5px; text-transform: uppercase; letter-spacing: 0.03em; }
    .agri-table td { padding: 12px 14px; border-bottom: 1px solid var(--border); vertical-align: middle; }
    .agri-table tr:last-child td { border-bottom: none; }
    .agri-table-wrap { overflow-x: auto; }

    .agri-step { width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12.5px; font-weight: 700; border: 1.5px solid var(--border-strong); color: var(--text-faint); background: var(--surface); flex-shrink: 0; }
    .agri-step.active { border-color: var(--primary); background: var(--primary); color: #fff; }
    .agri-step.done { border-color: var(--primary); background: var(--primary-soft); color: var(--primary-dark); }

    .agri-bar-track { height: 8px; background: var(--surface-alt); border-radius: 3px; overflow: hidden; }
    .agri-bar-fill { height: 100%; background: var(--primary); border-radius: 3px; }

    a.agri-plain { text-decoration: none; color: inherit; }
    .agri-scroll::-webkit-scrollbar { height: 6px; width: 6px; }
    .agri-scroll::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius: 3px; }
  `}</style>
);

/* ============================================================================
   MOCK DATA — shaped so each block maps cleanly to a future API/DB response.
   ========================================================================== */
const currentUser = {
  farmer: { name: "Josephine Mwangi", location: "Machakos County", role: "farmer" },
  buyer: { name: "Daniel Otieno", location: "Nairobi", role: "buyer" },
  admin: { name: "Grace Wambui", location: "Nairobi HQ", role: "admin" },
};

const inputCategories = [
  { id: "seeds", label: "Certified Seeds", icon: Sprout },
  { id: "fertilizers", label: "Fertilizers", icon: Beaker },
  { id: "amendments", label: "Soil Amendments", icon: Leaf },
  { id: "protection", label: "Crop Protection", icon: ShieldAlert },
  { id: "equipment", label: "Farm Equipment", icon: Tractor },
  { id: "other", label: "Other Inputs", icon: Package },
];

const inputProducts = [
  { id: "IN-101", name: "Certified Rosecoco Bean Seed", category: "seeds", seller: "Machakos Agrovet Ltd", verified: true, price: 220, unit: "kg", available: true, location: "Machakos" },
  { id: "IN-102", name: "Certified Wairimu Bean Seed", category: "seeds", seller: "Kirinyaga Farm Supplies", verified: true, price: 240, unit: "kg", available: true, location: "Kirinyaga" },
  { id: "IN-103", name: "DAP Fertilizer 50kg", category: "fertilizers", seller: "Machakos Agrovet Ltd", verified: true, price: 3600, unit: "50kg bag", available: true, location: "Machakos" },
  { id: "IN-104", name: "CAN Top Dressing Fertilizer", category: "fertilizers", seller: "Meru Agri Supplies", verified: false, price: 3200, unit: "50kg bag", available: true, location: "Meru" },
  { id: "IN-105", name: "Agricultural Lime (Soil Amendment)", category: "amendments", seller: "Nakuru Soil Solutions", verified: true, price: 900, unit: "50kg bag", available: true, location: "Nakuru" },
  { id: "IN-106", name: "Well-Rotted Farmyard Manure", category: "amendments", seller: "Kajiado Organic Farm", verified: true, price: 600, unit: "50kg bag", available: false, location: "Kajiado" },
  { id: "IN-107", name: "Bean Fly Crop Protection Spray", category: "protection", seller: "Machakos Agrovet Ltd", verified: true, price: 1450, unit: "1L", available: true, location: "Machakos" },
  { id: "IN-108", name: "Manual Knapsack Sprayer 16L", category: "equipment", seller: "Kirinyaga Farm Supplies", verified: false, price: 2800, unit: "unit", available: true, location: "Kirinyaga" },
];

const produceListings = [
  { id: "PL-201", variety: "Rosecoco", quantity: 500, unit: "kg", price: 145, county: "Machakos", farmer: "Josephine Mwangi", harvestDate: "2026-06-14", grade: "Grade A", status: "active", description: "Well-dried Rosecoco beans, cleaned and sorted, stored in a dry store." },
  { id: "PL-202", variety: "Wairimu", quantity: 280, unit: "kg", price: 168, county: "Kirinyaga", farmer: "Peter Kamau", harvestDate: "2026-06-02", grade: "Grade A", status: "active", description: "Fresh Wairimu harvest, large uniform seed size." },
  { id: "PL-203", variety: "Mwitemania", quantity: 150, unit: "kg", price: 132, county: "Nakuru", farmer: "Alice Chebet", harvestDate: "2026-05-28", grade: "Grade B", status: "active", description: "Good quality beans, minor colour variation." },
  { id: "PL-204", variety: "Rosecoco", quantity: 90, unit: "kg", price: 150, county: "Kajiado", farmer: "Josephine Mwangi", harvestDate: "2026-06-20", grade: "Grade A", status: "active", description: "Small batch, freshly threshed." },
  { id: "PL-205", variety: "Canadian Wonder", quantity: 400, unit: "kg", price: 155, county: "Meru", farmer: "Samuel Mutiso", harvestDate: "2026-05-30", grade: "Grade A", status: "active", description: "Bulk lot available, can arrange transport within Meru." },
  { id: "PL-206", variety: "Rosecoco", quantity: 60, unit: "kg", price: 140, county: "Machakos", farmer: "Josephine Mwangi", harvestDate: "2026-04-10", grade: "Grade B", status: "sold", description: "Sold to a buyer in Nairobi." },
];

const myProduceExtra = [
  { id: "PL-207", variety: "Wairimu", quantity: 120, unit: "kg", price: 160, county: "Machakos", farmer: "Josephine Mwangi", harvestDate: "2026-07-01", grade: "Grade A", status: "draft", description: "Draft listing, pending photos." },
  { id: "PL-208", variety: "Rosecoco", quantity: 200, unit: "kg", price: 148, county: "Machakos", farmer: "Josephine Mwangi", harvestDate: "2026-03-20", grade: "Grade A", status: "unavailable", description: "Paused while renegotiating price." },
];

const marketPriceHistory = [
  { date: "2026-05-04", variety: "Rosecoco", market: "Nairobi", county: "Nairobi", price: 138, source: "WFP" },
  { date: "2026-05-11", variety: "Rosecoco", market: "Nairobi", county: "Nairobi", price: 141, source: "WFP" },
  { date: "2026-05-18", variety: "Rosecoco", market: "Nairobi", county: "Nairobi", price: 137, source: "WFP" },
  { date: "2026-05-25", variety: "Rosecoco", market: "Nairobi", county: "Nairobi", price: 143, source: "WFP" },
  { date: "2026-06-01", variety: "Rosecoco", market: "Nairobi", county: "Nairobi", price: 146, source: "WFP" },
  { date: "2026-06-08", variety: "Rosecoco", market: "Nairobi", county: "Nairobi", price: 144, source: "NCPB" },
  { date: "2026-06-15", variety: "Rosecoco", market: "Nairobi", county: "Nairobi", price: 149, source: "WFP" },
  { date: "2026-06-22", variety: "Rosecoco", market: "Nairobi", county: "Nairobi", price: 145, source: "WFP" },
  { date: "2026-06-08", variety: "Wairimu", market: "Kutus", county: "Kirinyaga", price: 162, source: "NCPB" },
  { date: "2026-06-15", variety: "Wairimu", market: "Kutus", county: "Kirinyaga", price: 165, source: "NCPB" },
  { date: "2026-06-22", variety: "Wairimu", market: "Kutus", county: "Kirinyaga", price: 168, source: "NCPB" },
  { date: "2026-06-08", variety: "Mwitemania", market: "Nakuru", county: "Nakuru", price: 128, source: "WFP" },
  { date: "2026-06-15", variety: "Mwitemania", market: "Nakuru", county: "Nakuru", price: 130, source: "WFP" },
  { date: "2026-06-22", variety: "Mwitemania", market: "Nakuru", county: "Nakuru", price: 132, source: "WFP" },
];

const orders = [
  { id: "ORD-3301", item: "500kg Rosecoco Beans", counterparty: "Daniel Otieno (Buyer)", quantity: "500 kg", amount: 72500, date: "2026-07-28", status: "Pending" },
  { id: "ORD-3298", item: "DAP Fertilizer 50kg", counterparty: "Machakos Agrovet Ltd (Seller)", quantity: "2 bags", amount: 7200, date: "2026-07-25", status: "Confirmed" },
  { id: "ORD-3290", item: "280kg Wairimu Beans", counterparty: "FreshGrain Traders (Buyer)", quantity: "280 kg", amount: 47040, date: "2026-07-20", status: "Processing" },
  { id: "ORD-3271", item: "Certified Rosecoco Seed", counterparty: "Machakos Agrovet Ltd (Seller)", quantity: "10 kg", amount: 2200, date: "2026-07-10", status: "Completed" },
  { id: "ORD-3260", item: "60kg Rosecoco Beans", counterparty: "Nairobi Grain Co.", quantity: "60 kg", amount: 8400, date: "2026-06-02", status: "Cancelled" },
];

const transactions = [
  { id: "TXN-9081", date: "2026-07-28", type: "Produce Sale", description: "500kg Rosecoco Beans to Daniel Otieno", amount: 72500, status: "Pending" },
  { id: "TXN-9075", date: "2026-07-25", type: "Input Purchase", description: "DAP Fertilizer 50kg x2 from Machakos Agrovet", amount: -7200, status: "Completed" },
  { id: "TXN-9060", date: "2026-07-20", type: "Produce Sale", description: "280kg Wairimu Beans to FreshGrain Traders", amount: 47040, status: "Processing" },
  { id: "TXN-9042", date: "2026-07-10", type: "Input Purchase", description: "Certified Rosecoco Seed 10kg", amount: -2200, status: "Completed" },
  { id: "TXN-9015", date: "2026-06-02", type: "Produce Sale", description: "60kg Rosecoco Beans", amount: 0, status: "Cancelled" },
];

const adminUsers = [
  { id: "U-501", name: "Josephine Mwangi", role: "Farmer", location: "Machakos", status: "Verified", joined: "2025-11-02" },
  { id: "U-502", name: "Peter Kamau", role: "Farmer", location: "Kirinyaga", status: "Verified", joined: "2025-12-14" },
  { id: "U-503", name: "Samuel Mutiso", role: "Farmer", location: "Meru", status: "Pending", joined: "2026-06-30" },
  { id: "U-504", name: "Daniel Otieno", role: "Buyer", location: "Nairobi", status: "Verified", joined: "2026-01-20" },
  { id: "U-505", name: "FreshGrain Traders", role: "Buyer", location: "Nairobi", status: "Verified", joined: "2026-02-11" },
  { id: "U-506", name: "Machakos Agrovet Ltd", role: "Seller", location: "Machakos", status: "Verified", joined: "2025-10-05" },
  { id: "U-507", name: "Meru Agri Supplies", role: "Seller", location: "Meru", status: "Pending", joined: "2026-07-02" },
];

const adminStats = [
  { label: "Total Farmers", value: 1284, icon: Sprout },
  { label: "Total Buyers", value: 356, icon: Users },
  { label: "Active Listings", value: 612, icon: Package },
  { label: "Total Transactions", value: 4130, icon: Receipt },
  { label: "Farm Inputs Listed", value: 218, icon: Beaker },
  { label: "Market Price Records", value: 1975, icon: BarChart3 },
];

// Structured to mirror the eventual Random Forest recommendation API response.
function buildRecommendationResult(formData) {
  return {
    recommendation: {
      seed: "Rosecoco Bean Seed (Certified)",
      fertilizer: "DAP at planting, CAN as top dressing",
      soilAmendment: "Agricultural lime, 500kg per acre",
    },
    confidence: "High",
    explanation: [
      { factor: "Soil pH", value: formData.soilPh || "5.6", weight: 0.34 },
      { factor: "Agro-ecological zone", value: formData.agroZone || "Upper Midland 4", weight: 0.27 },
      { factor: "Soil type", value: formData.soilType || "Sandy loam", weight: 0.21 },
      { factor: "Bean variety", value: formData.beanVariety || "Rosecoco", weight: 0.11 },
      { factor: "Previous crop", value: formData.previousCrop || "Maize", weight: 0.07 },
    ],
    summary: "Recommended because the selected soil conditions and agro-ecological zone are associated with this input requirement.",
  };
}

/* ============================================================================
   SHARED UI PRIMITIVES
   ========================================================================== */
const Badge = ({ tone = "gray", icon: Icon, children }) => (
  <span className={`agri-badge agri-badge-${tone}`}>{Icon && <Icon size={12} />}{children}</span>
);

const statusTone = (status) => ({
  Pending: "amber", Confirmed: "blue", Processing: "amber", Completed: "green",
  Cancelled: "red", active: "green", sold: "gray", draft: "amber", unavailable: "red",
  Verified: "green", "Not Verified": "red",
}[status] || "gray");

const Button = ({ variant = "primary", size = "md", icon: Icon, className = "", ...props }) => (
  <button
    className={`agri-btn agri-btn-${variant} ${size === "sm" ? "agri-btn-sm" : ""} ${className}`}
    {...props}
  >
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
      <h2 className="text-xl font-bold" style={{ color: "var(--text)" }}>{title}</h2>
      {subtitle && <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>{subtitle}</p>}
    </div>
    {action}
  </div>
);

const StatCard = ({ label, value, icon: Icon, mono = true }) => (
  <div className="agri-card p-4">
    <div className="flex items-center justify-between mb-2">
      <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-faint)" }}>{label}</span>
      {Icon && <Icon size={16} style={{ color: "var(--primary)" }} />}
    </div>
    <div className={`text-2xl font-bold ${mono ? "mono" : ""}`}>{value}</div>
  </div>
);

const fmtKES = (n) => `KES ${Number(n).toLocaleString("en-KE")}`;
const fmtDate = (d) => new Date(d).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });

/* ============================================================================
   LANDING PAGE
   ========================================================================== */
function Landing({ goto }) {
  return (
    <div className="agri-root min-h-screen">
      <header className="border-b" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
        <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-lg">
            <div className="w-8 h-8 flex items-center justify-center rounded" style={{ background: "var(--primary)" }}>
              <Sprout size={18} color="#fff" />
            </div>
            Bean<span style={{ color: "var(--primary)" }}>Link</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium" style={{ color: "var(--text-muted)" }}>
            <button className="agri-plain" onClick={() => goto("landing")}>Home</button>
            <button className="agri-plain" onClick={() => goto("guest-produce")}>Marketplace</button>
            <button className="agri-plain" onClick={() => goto("guest-prices")}>Market Prices</button>
            <button className="agri-plain" onClick={() => goto("landing")}>About</button>
          </nav>
          <div className="flex items-center gap-3">
            <button className="text-sm font-semibold" style={{ color: "var(--text)" }} onClick={() => goto("login")}>Login</button>
            <Button size="sm" onClick={() => goto("login")}>Register</Button>
          </div>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-5 pt-14 pb-16 grid md:grid-cols-2 gap-10 items-center">
        <div>
          <h1 className="text-4xl md:text-[2.6rem] leading-tight font-bold mb-5">
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
        <div className="agri-card p-2">
          <img
            alt="Farmer inspecting a bean field in Kenya"
            className="w-full h-72 object-cover rounded"
            src="annie-spratt-QYcSeY7vuZM-unsplash.jpg"
          />
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-5 pb-16 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: ShoppingBag, title: "Access Farm Inputs", desc: "Find agricultural inputs from verified sellers near you." },
          { icon: Sprout, title: "Smart Input Recommendations", desc: "Get recommendations based on farm and soil conditions using a Random Forest model." },
          { icon: Wheat, title: "Sell Your Bean Produce", desc: "List harvested beans and connect with potential buyers." },
          { icon: TrendingUp, title: "View Market Prices", desc: "Access current and historical bean market prices from recorded market data." },
        ].map((f, i) => (
          <div key={i} className="agri-card p-5">
            <div className="w-9 h-9 rounded flex items-center justify-center mb-3" style={{ background: "var(--primary-soft)" }}>
              <f.icon size={18} style={{ color: "var(--primary)" }} />
            </div>
            <h3 className="font-semibold mb-1.5">{f.title}</h3>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>{f.desc}</p>
          </div>
        ))}
      </section>

      <footer className="border-t py-6 text-center text-xs" style={{ borderColor: "var(--border)", color: "var(--text-faint)" }}>
        BeanLink — Agricultural Marketplace and Decision Support for Smallholder Bean Farmers
      </footer>
    </div>
  );
}

/* ============================================================================
   LOGIN / REGISTER (mock)
   ========================================================================== */
function Login({ goto, onLogin, mode, setMode }) {
  const [selectedRole, setSelectedRole] = useState("farmer");
  return (
    <div className="agri-root min-h-screen flex items-center justify-center px-5">
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
            <Field label="I am a...">
              <div className="grid grid-cols-3 gap-2">
                {["farmer", "buyer", "admin"].map((r) => (
                  <button
                    key={r}
                    onClick={() => setSelectedRole(r)}
                    className="agri-btn agri-btn-sm"
                    style={{
                      background: selectedRole === r ? "var(--primary-soft)" : "var(--surface)",
                      border: `1px solid ${selectedRole === r ? "var(--primary)" : "var(--border-strong)"}`,
                      color: selectedRole === r ? "var(--primary-dark)" : "var(--text-muted)",
                      textTransform: "capitalize",
                    }}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Phone number or email">
              <input className="agri-input" placeholder="e.g. 0712 345 678" defaultValue="0712 345 678" />
            </Field>
            <Field label="Password">
              <input className="agri-input" type="password" defaultValue="••••••••" />
            </Field>
            <Button className="agri-btn-block" onClick={() => onLogin(selectedRole)}>
              {mode === "login" ? "Log In" : "Create Account"}
            </Button>
          </div>

          <p className="text-sm text-center mt-5" style={{ color: "var(--text-muted)" }}>
            {mode === "login" ? "New to BeanLink?" : "Already have an account?"}{" "}
            <button className="font-semibold" style={{ color: "var(--primary)" }} onClick={() => setMode(mode === "login" ? "register" : "login")}>
              {mode === "login" ? "Register" : "Log In"}
            </button>
          </p>
        </div>
        <p className="text-xs text-center mt-4" style={{ color: "var(--text-faint)" }}>
          Demo build — select a role above to preview that experience.
        </p>
      </div>
    </div>
  );
}

/* ============================================================================
   APP SHELL (sidebar + top bar + mobile nav)
   ========================================================================== */
const NAV_BY_ROLE = {
  farmer: [
    { id: "dashboard", label: "Dashboard", icon: Home },
    { id: "input-marketplace", label: "Marketplace", icon: ShoppingBag },
    { id: "recommendation", label: "Input Recommendations", icon: Sprout },
    { id: "my-produce", label: "My Produce", icon: Wheat },
    { id: "prices", label: "Market Prices", icon: TrendingUp },
    { id: "orders", label: "Orders", icon: ClipboardList },
    { id: "transactions", label: "Transactions", icon: Receipt },
    { id: "profile", label: "Profile", icon: User },
  ],
  buyer: [
    { id: "dashboard", label: "Dashboard", icon: Home },
    { id: "produce-marketplace", label: "Marketplace", icon: Wheat },
    { id: "prices", label: "Market Prices", icon: TrendingUp },
    { id: "orders", label: "Orders", icon: ClipboardList },
    { id: "transactions", label: "Transactions", icon: Receipt },
    { id: "profile", label: "Profile", icon: User },
  ],
  admin: [
    { id: "dashboard", label: "Dashboard", icon: Home },
    { id: "admin-users", label: "Users", icon: Users },
    { id: "input-marketplace", label: "Farm Inputs", icon: Beaker },
    { id: "produce-marketplace", label: "Produce Listings", icon: Wheat },
    { id: "admin-prices", label: "Market Prices", icon: TrendingUp },
    { id: "transactions", label: "Transactions", icon: Receipt },
    { id: "admin-reports", label: "Reports", icon: Flag },
  ],
};

function AppShell({ role, page, goto, onLogout, children }) {
  const [mobileMenu, setMobileMenu] = useState(false);
  const nav = NAV_BY_ROLE[role];
  const user = currentUser[role];
  const mobilePrimary = nav.slice(0, 4);

  return (
    <div className="agri-root min-h-screen flex">
      {/* Desktop sidebar */}
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
          <div className="agri-nav-link" onClick={onLogout}>
            <LogOut size={17} /> Log Out
          </div>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top bar */}
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
              {user.name.split(" ").map((p) => p[0]).join("").slice(0, 2)}
            </div>
            <span className="hidden md:block text-sm font-medium">{user.name}</span>
          </button>
        </header>

        <main className="flex-1 p-4 md:p-7 pb-20 md:pb-7">{children}</main>
      </div>

      {/* Mobile bottom nav */}
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

      {/* Mobile slide-over menu */}
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
              <div className="agri-nav-link" onClick={onLogout}><LogOut size={17} /> Log Out</div>
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
function FarmerDashboard({ goto }) {
  const latest = marketPriceHistory.filter((p) => p.variety === "Rosecoco" && p.market === "Nairobi").slice(-1)[0];
  const chartData = marketPriceHistory
    .filter((p) => p.variety === "Rosecoco" && p.market === "Nairobi")
    .map((p) => ({ date: p.date.slice(5), price: p.price }));

  return (
    <div>
      <SectionHeading title="Good morning, Josephine" subtitle="Here is an overview of your farming and marketplace activity." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-7">
        <StatCard label="Active Listings" value="3" icon={Wheat} />
        <StatCard label="Pending Orders" value="1" icon={ClipboardList} />
        <StatCard label="Completed Sales" value="14" icon={CheckCircle2} />
        <StatCard label="Latest Bean Price" value={fmtKES(latest.price)} icon={TrendingUp} />
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
          <div className="flex items-center justify-between p-3 rounded mb-4" style={{ background: "var(--surface-alt)" }}>
            <div>
              <div className="font-semibold text-sm">Rosecoco Beans</div>
              <div className="text-xs" style={{ color: "var(--text-muted)" }}>Nairobi Market</div>
            </div>
            <div className="text-right">
              <div className="mono font-bold">{fmtKES(latest.price)} / kg</div>
              <div className="text-xs" style={{ color: "var(--text-faint)" }}>Updated: {fmtDate(latest.date)}</div>
            </div>
          </div>
          <div style={{ width: "100%", height: 160 }}>
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

        <div className="agri-card p-5">
          <h3 className="font-semibold mb-4">Quick Actions</h3>
          <div className="space-y-2">
            <Button className="agri-btn-block" variant="primary" onClick={() => goto("recommendation")}>Get Input Recommendation</Button>
            <Button className="agri-btn-block" variant="secondary" onClick={() => goto("input-marketplace")}>Buy Farm Inputs</Button>
            <Button className="agri-btn-block" variant="secondary" onClick={() => goto("list-produce")}>List Produce</Button>
            <Button className="agri-btn-block" variant="secondary" onClick={() => goto("prices")}>View Market Prices</Button>
          </div>
        </div>
      </div>

      <div className="agri-card p-5">
        <h3 className="font-semibold mb-4">Recent Activity</h3>
        <div className="space-y-3">
          {[
            { icon: ClipboardList, text: "New order received for 500kg Rosecoco Beans", time: "2 days ago" },
            { icon: Wheat, text: "You listed 90kg of Rosecoco Beans", time: "5 days ago" },
            { icon: ShoppingBag, text: "You purchased DAP Fertilizer, 2 bags", time: "1 week ago" },
            { icon: Receipt, text: "Transaction completed: 280kg Wairimu Beans", time: "2 weeks ago" },
          ].map((a, i) => (
            <div key={i} className="flex items-center gap-3 text-sm">
              <div className="w-8 h-8 rounded flex items-center justify-center shrink-0" style={{ background: "var(--surface-alt)" }}>
                <a.icon size={15} style={{ color: "var(--primary)" }} />
              </div>
              <div className="flex-1">{a.text}</div>
              <div className="text-xs shrink-0" style={{ color: "var(--text-faint)" }}>{a.time}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   BUYER DASHBOARD (simple)
   ========================================================================== */
function BuyerDashboard({ goto }) {
  return (
    <div>
      <SectionHeading title="Welcome back, Daniel" subtitle="Here is an overview of your marketplace activity." />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-7">
        <StatCard label="Open Orders" value="2" icon={ClipboardList} />
        <StatCard label="Completed Orders" value="21" icon={CheckCircle2} />
        <StatCard label="Saved Listings" value="6" icon={Wheat} />
        <StatCard label="Total Spent" value={fmtKES(318400)} icon={Receipt} />
      </div>
      <div className="grid lg:grid-cols-3 gap-5">
        <div className="agri-card p-5 lg:col-span-2">
          <h3 className="font-semibold mb-4">Recommended Listings</h3>
          <div className="space-y-3">
            {produceListings.filter((p) => p.status === "active").slice(0, 3).map((p) => (
              <ProduceRow key={p.id} p={p} onClick={() => goto("produce-detail", p)} />
            ))}
          </div>
        </div>
        <div className="agri-card p-5">
          <h3 className="font-semibold mb-4">Quick Actions</h3>
          <div className="space-y-2">
            <Button className="agri-btn-block" onClick={() => goto("produce-marketplace")}>Browse Bean Produce</Button>
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
        <div className="font-semibold text-sm truncate">{p.variety} Beans</div>
        <div className="text-xs flex items-center gap-1" style={{ color: "var(--text-muted)" }}><MapPin size={11} /> {p.county} County</div>
      </div>
    </div>
    <div className="text-right shrink-0">
      <div className="mono font-bold text-sm">{fmtKES(p.price)}/kg</div>
      <div className="text-xs" style={{ color: "var(--text-faint)" }}>{p.quantity} kg available</div>
    </div>
  </div>
);

/* ============================================================================
   INPUT RECOMMENDATION (multi-step ML form)
   ========================================================================== */
function InputRecommendation() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [form, setForm] = useState({
    location: "Machakos County", agroZone: "Upper Midland 4", soilType: "Sandy loam",
    soilPh: "5.6", nitrogen: "Medium", farmSize: "2", beanVariety: "Rosecoco", previousCrop: "Maize",
  });
  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const totalSteps = 3;

  const submit = () => {
    setLoading(true);
    setTimeout(() => {
      setResult(buildRecommendationResult(form));
      setLoading(false);
    }, 900);
  };

  if (result) {
    return (
      <div className="max-w-2xl">
        <SectionHeading eyebrow="Random Forest Model" title="Recommended Farm Inputs" subtitle="Based on the farm information you provided." />
        <div className="grid sm:grid-cols-3 gap-3 mb-6">
          {[
            { label: "Recommended Seed", value: result.recommendation.seed, icon: Sprout },
            { label: "Recommended Fertilizer", value: result.recommendation.fertilizer, icon: Beaker },
            { label: "Recommended Soil Amendment", value: result.recommendation.soilAmendment, icon: Leaf },
          ].map((r, i) => (
            <div key={i} className="agri-card p-4">
              <r.icon size={17} style={{ color: "var(--primary)" }} className="mb-2" />
              <div className="text-xs font-semibold uppercase mb-1" style={{ color: "var(--text-faint)" }}>{r.label}</div>
              <div className="text-sm font-semibold">{r.value}</div>
            </div>
          ))}
        </div>

        <div className="agri-card p-5 mb-5">
          <div className="flex items-center gap-2 mb-2">
            <Info size={15} style={{ color: "var(--primary)" }} />
            <span className="text-sm font-semibold">Why was this recommended?</span>
          </div>
          <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>{result.summary}</p>
          <div className="space-y-3">
            {result.explanation.map((e, i) => (
              <div key={i}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium">{e.factor} <span style={{ color: "var(--text-faint)" }}>({e.value})</span></span>
                  <span className="mono" style={{ color: "var(--text-muted)" }}>{Math.round(e.weight * 100)}%</span>
                </div>
                <div className="agri-bar-track"><div className="agri-bar-fill" style={{ width: `${e.weight * 100}%` }} /></div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => { setResult(null); setStep(1); }}>Start New Recommendation</Button>
          <Button icon={ShoppingBag}>Buy Recommended Inputs</Button>
        </div>
      </div>
    );
  }

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
            <Field label="Bean variety">
              <select className="agri-select" value={form.beanVariety} onChange={(e) => update("beanVariety", e.target.value)}>
                {["Rosecoco", "Wairimu", "Mwitemania", "Canadian Wonder", "Mwezi Moja"].map((z) => <option key={z}>{z}</option>)}
              </select>
            </Field>
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
            <Button onClick={submit} disabled={loading}>{loading ? "Analysing Farm Conditions..." : "Get Recommendation"}</Button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   FARM INPUT MARKETPLACE + DETAIL
   ========================================================================== */
function InputMarketplace({ goto }) {
  const [category, setCategory] = useState("all");
  const filtered = category === "all" ? inputProducts : inputProducts.filter((p) => p.category === category);

  return (
    <div>
      <SectionHeading title="Farm Input Marketplace" subtitle="Browse certified seeds, fertilizers, soil amendments and equipment from local sellers." />
      <div className="flex gap-2 mb-5 overflow-x-auto agri-scroll pb-1">
        <button onClick={() => setCategory("all")} className="agri-btn agri-btn-sm" style={{ background: category === "all" ? "var(--primary)" : "var(--surface)", color: category === "all" ? "#fff" : "var(--text)", border: "1px solid var(--border-strong)" }}>All</button>
        {inputCategories.map((c) => (
          <button key={c.id} onClick={() => setCategory(c.id)} className="agri-btn agri-btn-sm" style={{ background: category === c.id ? "var(--primary)" : "var(--surface)", color: category === c.id ? "#fff" : "var(--text)", border: "1px solid var(--border-strong)" }}>
            <c.icon size={13} /> {c.label}
          </button>
        ))}
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((p) => (
          <div key={p.id} className="agri-card p-4 flex flex-col">
            <div className="w-full h-28 rounded mb-3 flex items-center justify-center" style={{ background: "var(--surface-alt)" }}>
              {React.createElement(inputCategories.find((c) => c.id === p.category)?.icon || Package, { size: 30, color: "var(--primary)" })}
            </div>
            <div className="font-semibold text-sm mb-1">{p.name}</div>
            <div className="text-xs mb-2 flex items-center gap-1" style={{ color: "var(--text-muted)" }}><MapPin size={11} /> {p.location}</div>
            <div className="mb-3">
              {p.verified ? <Badge tone="green" icon={ShieldCheck}>Verified Seller</Badge> : <Badge tone="gray">Unverified Seller</Badge>}
            </div>
            <div className="flex items-center justify-between mb-3">
              <div className="mono font-bold">{fmtKES(p.price)} <span className="text-xs font-normal" style={{ color: "var(--text-faint)" }}>/ {p.unit}</span></div>
              <Badge tone={p.available ? "green" : "red"}>{p.available ? "Available" : "Out of Stock"}</Badge>
            </div>
            <div className="mt-auto flex gap-2">
              <Button variant="secondary" size="sm" className="agri-btn-block" onClick={() => goto("input-detail", p)}>View Details</Button>
              <Button size="sm" className="agri-btn-block" disabled={!p.available}>Add to Cart</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function InputDetail({ item, goto }) {
  if (!item) return null;
  return (
    <div className="max-w-2xl">
      <button className="flex items-center gap-1 text-sm mb-5" style={{ color: "var(--text-muted)" }} onClick={() => goto("input-marketplace")}>
        <ArrowLeft size={15} /> Back to Marketplace
      </button>
      <div className="agri-card p-6">
        <div className="w-full h-48 rounded mb-4 flex items-center justify-center" style={{ background: "var(--surface-alt)" }}>
          {React.createElement(inputCategories.find((c) => c.id === item.category)?.icon || Package, { size: 48, color: "var(--primary)" })}
        </div>
        <h2 className="text-xl font-bold mb-2">{item.name}</h2>
        <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
          Quality-checked {item.name.toLowerCase()}, sourced from a registered agro-dealer. Suitable for smallholder bean production in most agro-ecological zones.
        </p>
        <div className="grid grid-cols-2 gap-4 mb-5 text-sm">
          <div><div className="text-xs mb-1" style={{ color: "var(--text-faint)" }}>Seller</div><div className="font-semibold">{item.seller}</div></div>
          <div><div className="text-xs mb-1" style={{ color: "var(--text-faint)" }}>Verification</div>{item.verified ? <Badge tone="green" icon={ShieldCheck}>Verified Seller</Badge> : <Badge tone="gray">Unverified</Badge>}</div>
          <div><div className="text-xs mb-1" style={{ color: "var(--text-faint)" }}>Price</div><div className="mono font-bold">{fmtKES(item.price)} / {item.unit}</div></div>
          <div><div className="text-xs mb-1" style={{ color: "var(--text-faint)" }}>Available Quantity</div><div className="font-semibold">{item.available ? "In stock" : "Out of stock"}</div></div>
          <div><div className="text-xs mb-1" style={{ color: "var(--text-faint)" }}>Location</div><div className="font-semibold flex items-center gap-1"><MapPin size={13} />{item.location}</div></div>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" className="agri-btn-block" disabled={!item.available}>Add to Cart</Button>
          <Button className="agri-btn-block" disabled={!item.available}>Buy Now</Button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   BEAN PRODUCE MARKETPLACE + DETAIL
   ========================================================================== */
function ProduceMarketplace({ goto }) {
  const [variety, setVariety] = useState("all");
  const [county, setCounty] = useState("all");
  const [sort, setSort] = useState("recent");
  const active = produceListings.filter((p) => p.status === "active");
  const varieties = ["all", ...new Set(active.map((p) => p.variety))];
  const counties = ["all", ...new Set(active.map((p) => p.county))];

  let filtered = active.filter((p) => (variety === "all" || p.variety === variety) && (county === "all" || p.county === county));
  if (sort === "price-low") filtered = [...filtered].sort((a, b) => a.price - b.price);
  if (sort === "price-high") filtered = [...filtered].sort((a, b) => b.price - a.price);
  if (sort === "quantity") filtered = [...filtered].sort((a, b) => b.quantity - a.quantity);

  return (
    <div>
      <SectionHeading title="Bean Produce Marketplace" subtitle="Browse harvested bean produce listed by farmers across Kenya." />
      <div className="agri-card p-4 mb-5 grid sm:grid-cols-4 gap-3">
        <Field label="Bean variety">
          <select className="agri-select" value={variety} onChange={(e) => setVariety(e.target.value)}>
            {varieties.map((v) => <option key={v} value={v}>{v === "all" ? "All varieties" : v}</option>)}
          </select>
        </Field>
        <Field label="County">
          <select className="agri-select" value={county} onChange={(e) => setCounty(e.target.value)}>
            {counties.map((v) => <option key={v} value={v}>{v === "all" ? "All counties" : v}</option>)}
          </select>
        </Field>
        <Field label="Sort by">
          <select className="agri-select" value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="recent">Most recent</option>
            <option value="price-low">Price: low to high</option>
            <option value="price-high">Price: high to low</option>
            <option value="quantity">Quantity available</option>
          </select>
        </Field>
        <Field label="Price range"><input className="agri-input" placeholder="e.g. 100 - 200 KES/kg" /></Field>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((p) => (
          <div key={p.id} className="agri-card p-4 flex flex-col">
            <div className="w-full h-28 rounded mb-3 flex items-center justify-center" style={{ background: "var(--surface-alt)" }}>
              <Wheat size={30} color="var(--primary)" />
            </div>
            <div className="font-bold text-sm uppercase mb-1">{p.variety} Beans</div>
            <div className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>{p.quantity} kg available</div>
            <div className="mono font-bold mb-2">{fmtKES(p.price)} <span className="text-xs font-normal" style={{ color: "var(--text-faint)" }}>/ kg</span></div>
            <div className="flex items-center gap-1 text-xs mb-1" style={{ color: "var(--text-muted)" }}><MapPin size={12} />{p.county} County</div>
            <div className="flex items-center gap-1 text-xs mb-3" style={{ color: "var(--text-muted)" }}><Calendar size={12} />Harvested: {fmtDate(p.harvestDate)}</div>
            <div className="mb-3"><Badge tone="green">Grade: {p.grade}</Badge></div>
            <Button variant="secondary" size="sm" className="agri-btn-block mt-auto" onClick={() => goto("produce-detail", p)}>View Listing</Button>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-sm col-span-full" style={{ color: "var(--text-faint)" }}>No listings match these filters.</p>}
      </div>
    </div>
  );
}

function ProduceDetail({ item, goto }) {
  if (!item) return null;
  return (
    <div className="max-w-2xl">
      <button className="flex items-center gap-1 text-sm mb-5" style={{ color: "var(--text-muted)" }} onClick={() => goto("produce-marketplace")}>
        <ArrowLeft size={15} /> Back to Marketplace
      </button>
      <div className="agri-card p-6">
        <div className="w-full h-48 rounded mb-4 flex items-center justify-center" style={{ background: "var(--surface-alt)" }}>
          <Wheat size={48} color="var(--primary)" />
        </div>
        <h2 className="text-xl font-bold mb-1 uppercase">{item.variety} Beans</h2>
        <div className="flex items-center gap-1 text-sm mb-4" style={{ color: "var(--text-muted)" }}><MapPin size={13} />{item.county} County · Listed by {item.farmer}</div>
        <p className="text-sm mb-5" style={{ color: "var(--text-muted)" }}>{item.description}</p>
        <div className="grid grid-cols-2 gap-4 mb-5 text-sm">
          <div><div className="text-xs mb-1" style={{ color: "var(--text-faint)" }}>Quantity Available</div><div className="font-semibold mono">{item.quantity} kg</div></div>
          <div><div className="text-xs mb-1" style={{ color: "var(--text-faint)" }}>Price</div><div className="font-semibold mono">{fmtKES(item.price)} / kg</div></div>
          <div><div className="text-xs mb-1" style={{ color: "var(--text-faint)" }}>Harvest Date</div><div className="font-semibold">{fmtDate(item.harvestDate)}</div></div>
          <div><div className="text-xs mb-1" style={{ color: "var(--text-faint)" }}>Quality / Grade</div><Badge tone="green">{item.grade}</Badge></div>
        </div>
        <div className="p-3 rounded mb-5 text-sm flex items-center gap-2" style={{ background: "var(--primary-soft)", color: "var(--primary-dark)" }}>
          <ShieldCheck size={16} /> Listed by a verified farmer on BeanLink
        </div>
        <div className="flex gap-3">
          <Field label="Quantity to order (kg)"><input className="agri-input" type="number" defaultValue={Math.min(50, item.quantity)} /></Field>
        </div>
        <Button className="agri-btn-block mt-4">Place Order</Button>
      </div>
    </div>
  );
}

/* ============================================================================
   MY PRODUCE + LIST PRODUCE FORM
   ========================================================================== */
function MyProduce({ goto }) {
  const [tab, setTab] = useState("active");
  const mine = [...produceListings.filter((p) => p.farmer === "Josephine Mwangi"), ...myProduceExtra];
  const grouped = { active: mine.filter((p) => p.status === "active"), sold: mine.filter((p) => p.status === "sold"), draft: mine.filter((p) => p.status === "draft"), unavailable: mine.filter((p) => p.status === "unavailable") };

  return (
    <div>
      <SectionHeading title="My Produce" subtitle="Manage your bean produce listings." action={<Button icon={Plus} onClick={() => goto("list-produce")}>List Produce</Button>} />
      <div className="flex gap-1 mb-5 border-b" style={{ borderColor: "var(--border)" }}>
        {[["active", "Active"], ["sold", "Sold"], ["draft", "Draft"], ["unavailable", "Unavailable"]].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className="px-4 py-2 text-sm font-semibold" style={{ color: tab === k ? "var(--primary)" : "var(--text-faint)", borderBottom: tab === k ? "2px solid var(--primary)" : "2px solid transparent" }}>
            {l} <span className="mono">({grouped[k].length})</span>
          </button>
        ))}
      </div>
      <div className="space-y-3">
        {grouped[tab].length === 0 && <p className="text-sm" style={{ color: "var(--text-faint)" }}>No listings in this category yet.</p>}
        {grouped[tab].map((p) => (
          <div key={p.id} className="agri-card p-4 flex flex-wrap items-center gap-4">
            <div className="w-11 h-11 rounded flex items-center justify-center shrink-0" style={{ background: "var(--primary-soft)" }}>
              <Wheat size={20} color="var(--primary)" />
            </div>
            <div className="flex-1 min-w-[160px]">
              <div className="font-semibold text-sm">{p.variety} Beans · {p.quantity} kg</div>
              <div className="text-xs flex items-center gap-1" style={{ color: "var(--text-muted)" }}><MapPin size={11} />{p.county} · Harvested {fmtDate(p.harvestDate)}</div>
            </div>
            <div className="mono font-bold text-sm">{fmtKES(p.price)}/kg</div>
            <Badge tone={statusTone(p.status)}>{p.status}</Badge>
            <div className="flex gap-2 ml-auto">
              <Button size="sm" variant="ghost" icon={Pencil}>Edit</Button>
              {p.status === "active" && <Button size="sm" variant="ghost" icon={PauseCircle}>Pause</Button>}
              {p.status === "active" && <Button size="sm" variant="ghost" icon={CheckCircle2}>Mark as Sold</Button>}
              <Button size="sm" variant="danger" icon={Trash2}>Delete</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ListProduceForm({ goto }) {
  const [submitted, setSubmitted] = useState(false);
  if (submitted) {
    return (
      <div className="max-w-lg agri-card p-8 text-center">
        <CheckCircle2 size={38} color="var(--primary)" className="mx-auto mb-3" />
        <h3 className="font-bold text-lg mb-1">Produce Listing Published</h3>
        <p className="text-sm mb-5" style={{ color: "var(--text-muted)" }}>Your bean produce is now visible to buyers on the marketplace.</p>
        <Button onClick={() => goto("my-produce")}>Go to My Produce</Button>
      </div>
    );
  }
  return (
    <div className="max-w-lg">
      <SectionHeading title="List Bean Produce" subtitle="Share details about your harvest so buyers can find it." />
      <div className="agri-card p-5 space-y-4">
        <Field label="Bean variety">
          <select className="agri-select" defaultValue="Rosecoco">
            {["Rosecoco", "Wairimu", "Mwitemania", "Canadian Wonder", "Mwezi Moja"].map((v) => <option key={v}>{v}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Quantity available (kg)"><input className="agri-input" type="number" placeholder="e.g. 300" /></Field>
          <Field label="Price per kg (KES)"><input className="agri-input" type="number" placeholder="e.g. 145" /></Field>
        </div>
        <Field label="Location (County)"><input className="agri-input" placeholder="e.g. Machakos" /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Harvest date"><input className="agri-input" type="date" /></Field>
          <Field label="Quality / grade">
            <select className="agri-select" defaultValue="Grade A">
              <option>Grade A</option><option>Grade B</option><option>Grade C</option>
            </select>
          </Field>
        </div>
        <Field label="Description"><textarea className="agri-textarea" rows={3} placeholder="Describe the beans — cleaning, sorting, storage condition..." /></Field>
        <Field label="Images"><input className="agri-input" type="file" multiple /></Field>
        <Button className="agri-btn-block" onClick={() => setSubmitted(true)}>Publish Produce Listing</Button>
      </div>
    </div>
  );
}

/* ============================================================================
   MARKET PRICE DASHBOARD (recorded data — never a forecast)
   ========================================================================== */
function MarketPrices({ guest, goto }) {
  const [variety, setVariety] = useState("Rosecoco");
  const [county, setCounty] = useState("all");
  const varieties = [...new Set(marketPriceHistory.map((p) => p.variety))];
  const counties = [...new Set(marketPriceHistory.map((p) => p.county))];

  const rows = marketPriceHistory
    .filter((p) => p.variety === variety && (county === "all" || p.county === county))
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  const chartData = rows.map((r) => ({ date: r.date.slice(5), price: r.price }));
  const latest = rows[rows.length - 1];
  const prev = rows[rows.length - 2];

  return (
    <div>
      <SectionHeading title="Bean Market Prices" subtitle="View recorded bean prices across selected markets and time periods." />
      {guest && (
        <div className="p-3 rounded mb-5 text-sm flex items-center gap-2" style={{ background: "var(--amber-soft)", color: "var(--amber)" }}>
          <Info size={15} /> You're viewing public market data. <button className="font-semibold underline" onClick={() => goto("login")}>Log in</button> to access your farmer or buyer dashboard.
        </div>
      )}

      <div className="agri-card p-4 mb-5 grid sm:grid-cols-4 gap-3">
        <Field label="Bean variety">
          <select className="agri-select" value={variety} onChange={(e) => setVariety(e.target.value)}>
            {varieties.map((v) => <option key={v}>{v}</option>)}
          </select>
        </Field>
        <Field label="County">
          <select className="agri-select" value={county} onChange={(e) => setCounty(e.target.value)}>
            <option value="all">All counties</option>
            {counties.map((v) => <option key={v}>{v}</option>)}
          </select>
        </Field>
        <Field label="Market"><input className="agri-input" placeholder="All markets" disabled /></Field>
        <Field label="Date range"><input className="agri-input" placeholder="Last 8 weeks" disabled /></Field>
      </div>

      {latest && (
        <div className="grid sm:grid-cols-4 gap-3 mb-6">
          <StatCard label="Current Recorded Price" value={`${fmtKES(latest.price)}/kg`} icon={TrendingUp} />
          <StatCard label="Previous Recorded Price" value={prev ? `${fmtKES(prev.price)}/kg` : "—"} icon={Clock} />
          <StatCard label="Market" value={latest.market} icon={MapPin} mono={false} />
          <StatCard label="Last Updated" value={fmtDate(latest.date)} icon={Calendar} mono={false} />
        </div>
      )}

      <div className="agri-card p-5 mb-6">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold">Price History</h3>
          <Badge tone="gray">Recorded Market Prices</Badge>
        </div>
        <p className="text-xs mb-4" style={{ color: "var(--text-faint)" }}>Historical prices recorded in the database — this is not a price prediction.</p>
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
            <thead><tr><th>Market</th><th>Bean Variety</th><th>Price/kg</th><th>Date</th><th>Source</th><th>Last Updated</th></tr></thead>
            <tbody>
              {[...rows].reverse().map((r, i) => (
                <tr key={i}>
                  <td>{r.market}</td>
                  <td>{r.variety}</td>
                  <td className="mono font-semibold">{fmtKES(r.price)}</td>
                  <td>{fmtDate(r.date)}</td>
                  <td><Badge tone="gray">{r.source}</Badge></td>
                  <td>{fmtDate(r.date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   ORDERS / TRANSACTIONS
   ========================================================================== */
function Orders() {
  const [filter, setFilter] = useState("all");
  const rows = filter === "all" ? orders : orders.filter((o) => o.status === filter);
  return (
    <div>
      <SectionHeading title="Orders" subtitle="Manage orders involving your produce and purchased inputs." />
      <div className="flex gap-2 mb-5 overflow-x-auto agri-scroll pb-1">
        {["all", "Pending", "Confirmed", "Processing", "Completed", "Cancelled"].map((s) => (
          <button key={s} onClick={() => setFilter(s)} className="agri-btn agri-btn-sm" style={{ background: filter === s ? "var(--primary)" : "var(--surface)", color: filter === s ? "#fff" : "var(--text)", border: "1px solid var(--border-strong)" }}>{s === "all" ? "All" : s}</button>
        ))}
      </div>
      <div className="agri-card">
        <div className="agri-table-wrap">
          <table className="agri-table">
            <thead><tr><th>Order ID</th><th>Item</th><th>Counterparty</th><th>Quantity</th><th>Amount</th><th>Date</th><th>Status</th></tr></thead>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Transactions() {
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const rows = transactions.filter((t) => (type === "all" || t.type === type) && (status === "all" || t.status === status));
  return (
    <div>
      <SectionHeading title="Transactions" subtitle="A record of your marketplace transactions." />
      <div className="agri-card p-4 mb-5 grid sm:grid-cols-3 gap-3">
        <Field label="Transaction type">
          <select className="agri-select" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="all">All types</option><option>Produce Sale</option><option>Input Purchase</option>
          </select>
        </Field>
        <Field label="Status">
          <select className="agri-select" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All statuses</option><option>Pending</option><option>Processing</option><option>Completed</option><option>Cancelled</option>
          </select>
        </Field>
        <Field label="Date"><input className="agri-input" type="date" /></Field>
      </div>
      <div className="agri-card">
        <div className="agri-table-wrap">
          <table className="agri-table">
            <thead><tr><th>Transaction ID</th><th>Date</th><th>Type</th><th>Description</th><th>Amount</th><th>Status</th></tr></thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id}>
                  <td className="mono">{t.id}</td>
                  <td>{fmtDate(t.date)}</td>
                  <td>{t.type}</td>
                  <td>{t.description}</td>
                  <td className="mono font-semibold" style={{ color: t.amount < 0 ? "var(--red)" : "var(--primary)" }}>{t.amount === 0 ? "—" : `${t.amount < 0 ? "-" : "+"}${fmtKES(Math.abs(t.amount))}`}</td>
                  <td><Badge tone={statusTone(t.status)}>{t.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   PROFILE
   ========================================================================== */
function Profile({ role }) {
  const user = currentUser[role];
  return (
    <div className="max-w-lg">
      <SectionHeading title="Profile" subtitle="Manage your account information." />
      <div className="agri-card p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold" style={{ background: "var(--primary-soft)", color: "var(--primary-dark)" }}>
            {user.name.split(" ").map((p) => p[0]).join("").slice(0, 2)}
          </div>
          <div>
            <div className="font-bold">{user.name}</div>
            <div className="text-sm capitalize" style={{ color: "var(--text-muted)" }}>{user.role} · {user.location}</div>
          </div>
        </div>
        <div className="space-y-4">
          <Field label="Full name"><input className="agri-input" defaultValue={user.name} /></Field>
          <Field label="Phone number"><input className="agri-input" defaultValue="0712 345 678" /></Field>
          <Field label="Location"><input className="agri-input" defaultValue={user.location} /></Field>
          <Button>Save Changes</Button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   ADMIN: DASHBOARD, USERS, MARKET PRICE DATA MANAGEMENT, REPORTS
   ========================================================================== */
function AdminDashboard({ goto }) {
  return (
    <div>
      <SectionHeading title="Admin Dashboard" subtitle="Platform overview and management." />
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-7">
        {adminStats.map((s) => <StatCard key={s.label} {...s} />)}
      </div>
      <div className="grid lg:grid-cols-2 gap-5">
        <div className="agri-card p-5">
          <h3 className="font-semibold mb-4">Pending Verifications</h3>
          <div className="space-y-3">
            {adminUsers.filter((u) => u.status === "Pending").map((u) => (
              <div key={u.id} className="flex items-center justify-between text-sm">
                <div>
                  <div className="font-medium">{u.name}</div>
                  <div className="text-xs" style={{ color: "var(--text-faint)" }}>{u.role} · {u.location}</div>
                </div>
                <Button size="sm" icon={ShieldCheck} onClick={() => goto("admin-users")}>Review</Button>
              </div>
            ))}
          </div>
        </div>
        <div className="agri-card p-5">
          <h3 className="font-semibold mb-4">Quick Actions</h3>
          <div className="space-y-2">
            <Button className="agri-btn-block" onClick={() => goto("admin-prices")}>Manage Market Price Data</Button>
            <Button className="agri-btn-block" variant="secondary" onClick={() => goto("admin-users")}>Manage Users</Button>
            <Button className="agri-btn-block" variant="secondary" onClick={() => goto("produce-marketplace")}>Review Produce Listings</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminUsers() {
  const [filter, setFilter] = useState("all");
  const rows = filter === "all" ? adminUsers : adminUsers.filter((u) => u.role === filter);
  return (
    <div>
      <SectionHeading title="Manage Users" subtitle="View and verify farmers, buyers, and sellers on the platform." />
      <div className="flex gap-2 mb-5">
        {["all", "Farmer", "Buyer", "Seller"].map((r) => (
          <button key={r} onClick={() => setFilter(r)} className="agri-btn agri-btn-sm" style={{ background: filter === r ? "var(--primary)" : "var(--surface)", color: filter === r ? "#fff" : "var(--text)", border: "1px solid var(--border-strong)" }}>{r === "all" ? "All" : r + "s"}</button>
        ))}
      </div>
      <div className="agri-card">
        <div className="agri-table-wrap">
          <table className="agri-table">
            <thead><tr><th>ID</th><th>Name</th><th>Role</th><th>Location</th><th>Joined</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id}>
                  <td className="mono">{u.id}</td>
                  <td className="font-medium">{u.name}</td>
                  <td>{u.role}</td>
                  <td>{u.location}</td>
                  <td>{fmtDate(u.joined)}</td>
                  <td><Badge tone={statusTone(u.status)}>{u.status}</Badge></td>
                  <td>{u.status === "Pending" ? <Button size="sm" icon={ShieldCheck}>Verify</Button> : <Button size="sm" variant="ghost">Manage</Button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AdminMarketPrices() {
  const [rows, setRows] = useState(marketPriceHistory);
  const [form, setForm] = useState({ market: "", county: "", variety: "Rosecoco", price: "", unit: "Per kg", date: "", source: "", notes: "" });
  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const addRecord = () => {
    if (!form.market || !form.price || !form.date) return;
    setRows((r) => [...r, { date: form.date, variety: form.variety, market: form.market, county: form.county, price: Number(form.price), source: form.source || "Manual entry" }]);
    setForm({ market: "", county: "", variety: "Rosecoco", price: "", unit: "Per kg", date: "", source: "", notes: "" });
  };

  return (
    <div>
      <SectionHeading title="Market Price Data Management" subtitle="Add and manage recorded bean market prices. This data feeds the public Market Price Dashboard." />
      <div className="grid lg:grid-cols-3 gap-5">
        <div className="agri-card p-5 lg:col-span-1 h-fit">
          <h3 className="font-semibold mb-4">Record a New Price</h3>
          <div className="space-y-3">
            <Field label="Market"><input className="agri-input" placeholder="e.g. Nairobi" value={form.market} onChange={(e) => update("market", e.target.value)} /></Field>
            <Field label="County"><input className="agri-input" placeholder="e.g. Nairobi" value={form.county} onChange={(e) => update("county", e.target.value)} /></Field>
            <Field label="Bean variety">
              <select className="agri-select" value={form.variety} onChange={(e) => update("variety", e.target.value)}>
                {["Rosecoco", "Wairimu", "Mwitemania", "Canadian Wonder", "Mwezi Moja"].map((v) => <option key={v}>{v}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Price (KES)"><input className="agri-input" type="number" value={form.price} onChange={(e) => update("price", e.target.value)} /></Field>
              <Field label="Unit">
                <select className="agri-select" value={form.unit} onChange={(e) => update("unit", e.target.value)}><option>Per kg</option><option>Per 90kg bag</option></select>
              </Field>
            </div>
            <Field label="Date"><input className="agri-input" type="date" value={form.date} onChange={(e) => update("date", e.target.value)} /></Field>
            <Field label="Data source"><input className="agri-input" placeholder="e.g. WFP, NCPB, field survey" value={form.source} onChange={(e) => update("source", e.target.value)} /></Field>
            <Field label="Notes"><textarea className="agri-textarea" rows={2} value={form.notes} onChange={(e) => update("notes", e.target.value)} /></Field>
            <Button className="agri-btn-block" onClick={addRecord}>Save Price Record</Button>
          </div>
        </div>
        <div className="agri-card lg:col-span-2">
          <div className="agri-table-wrap">
            <table className="agri-table">
              <thead><tr><th>Market</th><th>County</th><th>Variety</th><th>Price/kg</th><th>Date</th><th>Source</th></tr></thead>
              <tbody>
                {[...rows].reverse().slice(0, 14).map((r, i) => (
                  <tr key={i}>
                    <td>{r.market}</td>
                    <td>{r.county}</td>
                    <td>{r.variety}</td>
                    <td className="mono font-semibold">{fmtKES(r.price)}</td>
                    <td>{fmtDate(r.date)}</td>
                    <td><Badge tone="gray">{r.source}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminReports() {
  const reports = [
    { id: "RPT-01", listing: "PL-203 · Mwitemania Beans", reason: "Price mismatch with description", status: "Open" },
    { id: "RPT-02", listing: "IN-104 · CAN Top Dressing Fertilizer", reason: "Unverified seller flagged by buyer", status: "Open" },
    { id: "RPT-03", listing: "PL-190 · Rosecoco Beans", reason: "Duplicate listing", status: "Resolved" },
  ];
  return (
    <div>
      <SectionHeading title="Reports" subtitle="Review listings flagged by farmers, buyers, or the platform." />
      <div className="space-y-3">
        {reports.map((r) => (
          <div key={r.id} className="agri-card p-4 flex items-center gap-4 flex-wrap">
            <Flag size={17} style={{ color: "var(--red)" }} />
            <div className="flex-1 min-w-[180px]">
              <div className="font-semibold text-sm">{r.listing}</div>
              <div className="text-xs" style={{ color: "var(--text-muted)" }}>{r.reason}</div>
            </div>
            <Badge tone={r.status === "Open" ? "amber" : "green"}>{r.status}</Badge>
            <Button size="sm" variant="secondary">Review Listing</Button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============================================================================
   GUEST WRAPPER (public marketplace/prices preview before login)
   ========================================================================== */
function GuestPage({ children, goto }) {
  return (
    <div className="agri-root min-h-screen">
      <header className="border-b px-5 py-3.5 flex items-center justify-between sticky top-0 z-10" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
        <button className="flex items-center gap-2 font-bold" onClick={() => goto("landing")}>
          <div className="w-7 h-7 flex items-center justify-center rounded" style={{ background: "var(--primary)" }}><Sprout size={15} color="#fff" /></div>
          BeanLink
        </button>
        <div className="flex items-center gap-3">
          <button className="text-sm font-semibold" onClick={() => goto("login")}>Login</button>
          <Button size="sm" onClick={() => goto("login")}>Register</Button>
        </div>
      </header>
      <div className="max-w-6xl mx-auto p-4 md:p-7">{children}</div>
    </div>
  );
}

/* ============================================================================
   ROOT APP
   ========================================================================== */
export default function App() {
  const [session, setSession] = useState(null); // 'farmer' | 'buyer' | 'admin' | null
  const [page, setPage] = useState("landing");
  const [authMode, setAuthMode] = useState("login");
  const [selectedItem, setSelectedItem] = useState(null);

  const goto = (p, item) => {
    setPage(p);
    setSelectedItem(item || null);
    window.scrollTo?.(0, 0);
  };

  const handleLogin = (role) => {
    setSession(role);
    setPage("dashboard");
  };
  const handleLogout = () => {
    setSession(null);
    setPage("landing");
  };

  if (!session) {
    if (page === "login") return <><GlobalStyle /><Login goto={goto} onLogin={handleLogin} mode={authMode} setMode={setAuthMode} /></>;
    if (page === "guest-produce") return <><GlobalStyle /><GuestPage goto={goto}><ProduceMarketplace goto={goto} /></GuestPage></>;
    if (page === "guest-prices") return <><GlobalStyle /><GuestPage goto={goto}><MarketPrices guest goto={goto} /></GuestPage></>;
    return <><GlobalStyle /><Landing goto={goto} /></>;
  }

  const role = session;

  const renderPage = () => {
    switch (page) {
      case "dashboard":
        if (role === "farmer") return <FarmerDashboard goto={goto} />;
        if (role === "buyer") return <BuyerDashboard goto={goto} />;
        return <AdminDashboard goto={goto} />;
      case "recommendation": return <InputRecommendation />;
      case "input-marketplace": return <InputMarketplace goto={goto} />;
      case "input-detail": return <InputDetail item={selectedItem} goto={goto} />;
      case "produce-marketplace": return <ProduceMarketplace goto={goto} />;
      case "produce-detail": return <ProduceDetail item={selectedItem} goto={goto} />;
      case "my-produce": return <MyProduce goto={goto} />;
      case "list-produce": return <ListProduceForm goto={goto} />;
      case "prices": return <MarketPrices goto={goto} />;
      case "orders": return <Orders />;
      case "transactions": return <Transactions />;
      case "profile": return <Profile role={role} />;
      case "admin-users": return <AdminUsers />;
      case "admin-prices": return <AdminMarketPrices />;
      case "admin-reports": return <AdminReports />;
      default:
        if (role === "farmer") return <FarmerDashboard goto={goto} />;
        if (role === "buyer") return <BuyerDashboard goto={goto} />;
        return <AdminDashboard goto={goto} />;
    }
  };

  return (
    <>
      <GlobalStyle />
      <AppShell role={role} page={page} goto={goto} onLogout={handleLogout}>
        {renderPage()}
      </AppShell>
    </>
  );
}