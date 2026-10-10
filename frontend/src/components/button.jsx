import React from "react";

export default function Button({
  variant = "primary",
  size = "md",
  icon: Icon,
  className = "",
  ...props
}) {
  return (
    <button
      className={`agri-btn agri-btn-${variant} ${size === "sm" ? "agri-btn-sm" : ""} ${className}`}
      {...props}
    >
      {Icon && <Icon size={16} />}
      {props.children}
    </button>
  );
}