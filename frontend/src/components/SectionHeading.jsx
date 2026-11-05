import React from "react";

export default function SectionHeading({ eyebrow, title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
      <div>
        {eyebrow && (
          <div
            className="text-xs font-semibold uppercase tracking-wide mb-1"
            style={{ color: "var(--primary)" }}
          >
            {eyebrow}
          </div>
        )}
        <h2
          className="text-xl font-bold"
          style={{ color: "var(--text)", letterSpacing: "-0.01em" }}
        >
          {title}
        </h2>
        {subtitle && (
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            {subtitle}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}