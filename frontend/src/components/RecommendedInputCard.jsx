import React, { useMemo, useState } from "react";
import { CheckCircle2, Pencil } from "lucide-react";

export default function RecommendedInputCard({
  icon: Icon,
  label,
  value,
  note,
  searchTerms,
  marketplaceListings,
  goto,
}) {
  const [copied, setCopied] = useState(false);

  const match = useMemo(() => {
    if (!Array.isArray(marketplaceListings) || marketplaceListings.length === 0) return null;
    const terms = (searchTerms || []).map((t) => String(t).toLowerCase()).filter(Boolean);
    if (terms.length === 0) return null;
    return (
      marketplaceListings.find((l) => {
        const haystack = `${l.title || ""} ${l.description || ""}`.toLowerCase();
        return terms.some((t) => haystack.includes(t));
      }) || null
    );
  }, [marketplaceListings, searchTerms]);

  const available = !!match;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard not available; ignore
    }
  };

  return (
    <div className="agri-card p-4 flex flex-col">
      <Icon size={17} style={{ color: "var(--primary)" }} className="mb-2" />
      <div
        className="text-xs font-semibold uppercase mb-1"
        style={{ color: "var(--text-faint)" }}
      >
        {label}
      </div>
      <div className="text-sm font-semibold">{value}</div>
      {note && (
        <div className="text-xs mt-0.5" style={{ color: "var(--text-faint)" }}>
          {note}
        </div>
      )}

      <div className="mt-3">
        {available ? (
          <button
            onClick={() => goto("marketplace", { search: match.title })}
            className="agri-btn agri-btn-primary agri-btn-sm agri-btn-block"
          >
            Buy on marketplace →
          </button>
        ) : (
          <div
            className="p-2 rounded text-xs flex items-start gap-2"
            style={{
              background: "var(--amber-soft)",
              border: "1px solid var(--amber-border)",
              color: "var(--amber)",
            }}
          >
            <div className="flex-1">
              <div className="font-semibold mb-0.5">Not currently listed</div>
              <div style={{ opacity: 0.9 }}>Ask for this at your local agrovet.</div>
            </div>
            <button
              onClick={copyToClipboard}
              title="Copy to clipboard"
              aria-label="Copy input name"
              style={{ color: "var(--amber)", flexShrink: 0 }}
            >
              {copied ? <CheckCircle2 size={14} /> : <Pencil size={14} />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}