import React from "react";

export default function StatCard({ label, value, icon: Icon, mono = true }) {
  return (
    <div className="agri-stat p-4">
      <div className="flex items-center justify-between mb-2">
        <span
          className="text-xs font-semibold uppercase tracking-wide"
          style={{ color: "var(--text-faint)" }}
        >
          {label}
        </span>
        {Icon && <Icon size={16} style={{ color: "var(--primary)" }} />}
      </div>
      <div className={`text-2xl font-bold ${mono ? "mono" : ""}`}>{value}</div>
    </div>
  );
}