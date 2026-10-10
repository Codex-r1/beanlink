import React from "react";
import { Package } from "lucide-react";

export default function EmptyState({
  icon: Icon = Package,
  title,
  body,
  action,
}) {
  return (
    <div className="agri-card p-10 text-center max-w-md mx-auto">
      <Icon size={32} style={{ color: "var(--text-faint)" }} className="mx-auto mb-3" />
      <h3 className="font-semibold mb-1">{title}</h3>
      {body && (
        <p className="text-sm mb-5" style={{ color: "var(--text-muted)" }}>
          {body}
        </p>
      )}
      {action}
    </div>
  );
}