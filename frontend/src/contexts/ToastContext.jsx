import React, { useCallback, useState } from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";

const ToastCtx = React.createContext({ push: () => {} });
export const useToast = () => React.useContext(ToastCtx);
export function ToastHost({ children }) {
  const [toasts, setToasts] = useState([]);

  const push = useCallback((msg, tone = "green") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, msg, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div
        className="fixed bottom-24 md:bottom-6 right-4 md:right-6 z-50 flex flex-col gap-2 pointer-events-none"
        aria-live="polite"
        aria-atomic="true"
      >
        {toasts.map((t) => {
          const accent =
            t.tone === "green" ? "var(--primary)" :
            t.tone === "red" ? "var(--red)" :
            "var(--amber)";
          const Icon = t.tone === "green" ? CheckCircle2 : AlertCircle;
          return (
            <div
              key={t.id}
              className="agri-card px-4 py-3 text-sm font-medium flex items-center gap-2"
              style={{
                borderLeft: `3px solid ${accent}`,
                minWidth: 260,
                maxWidth: 340,
                animation: "agri-toast-in 180ms ease-out",
              }}
              role="status"
            >
              <Icon size={15} style={{ color: accent, flexShrink: 0 }} />
              <span style={{ color: "var(--text)" }}>{t.msg}</span>
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
}