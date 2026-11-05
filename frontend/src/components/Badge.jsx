import React from "react";

export default function Badge({ tone = "gray", icon: Icon, children }) {
  return (
    <span className={`agri-badge agri-badge-${tone}`}>
      {Icon && <Icon size={12} />}
      {children}
    </span>
  );
}