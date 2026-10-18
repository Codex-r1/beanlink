import React from "react";
import { Star } from "lucide-react";

export default function StarRating({
  value = 0,
  onChange,
  size = 18,
  readOnly = false,
}) {
  const stars = [1, 2, 3, 4, 5];
  return (
    <div className="flex items-center gap-1" role={readOnly ? "img" : "radiogroup"}>
      {stars.map((s) => {
        const filled = s <= Math.round(value);
        return (
          <button
            key={s}
            type="button"
            disabled={readOnly}
            onClick={() => onChange && onChange(s)}
            aria-label={`${s} star${s > 1 ? "s" : ""}`}
            style={{
              background: "transparent",
              border: "none",
              cursor: readOnly ? "default" : "pointer",
              padding: 2,
              color: filled ? "var(--amber)" : "var(--border-strong)",
            }}
          >
            <Star
              size={size}
              fill={filled ? "var(--amber)" : "none"}
              strokeWidth={1.6}
            />
          </button>
        );
      })}
    </div>
  );
}