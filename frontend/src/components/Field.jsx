import React from "react";

export default function Field({ label, hint, children }) {
  return (
    <div>
      <label className="agri-label">{label}</label>
      {children}
      {hint && <p className="agri-hint">{hint}</p>}
    </div>
  );
}