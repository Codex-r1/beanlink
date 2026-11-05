import React, { useCallback, useEffect, useState } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

const ModalCtx = React.createContext({ open: () => {}, confirm: async () => false });

export const useModal = () => React.useContext(ModalCtx);
export function ModalHost({ children }) {
  const [modal, setModal] = useState(null);

  const open = useCallback((opts) => {
    setModal({
      id: Math.random().toString(36).slice(2),
      tone: opts.tone || "info",
      title: opts.title || "",
      body: opts.body || "",
      confirmLabel: opts.confirmLabel || "OK",
      cancelLabel: opts.cancelLabel || "Cancel",
      hasCancel: !!opts.hasCancel,
      resolve: opts.resolve || null,
    });
  }, []);

  const confirm = useCallback(
    (opts) =>
      new Promise((resolve) => {
        setModal({
          id: Math.random().toString(36).slice(2),
          tone: opts.tone || "info",
          title: opts.title || "Are you sure?",
          body: opts.body || "",
          confirmLabel: opts.confirmLabel || "Confirm",
          cancelLabel: opts.cancelLabel || "Cancel",
          hasCancel: true,
          resolve,
        });
      }),
    []
  );

  const close = useCallback((result) => {
    setModal((m) => {
      if (m?.resolve) m.resolve(result);
      return null;
    });
  }, []);

  useEffect(() => {
    if (!modal) return;
    const onKey = (e) => { if (e.key === "Escape") close(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modal, close]);

  const toneStyles = {
    success: { accent: "var(--primary)", Icon: CheckCircle2 },
    error:   { accent: "var(--red)",     Icon: AlertCircle },
    warn:    { accent: "var(--amber)",   Icon: AlertCircle },
    info:    { accent: "var(--primary)", Icon: Info },
  };

  return (
    <ModalCtx.Provider value={{ open, confirm }}>
      {children}
      {modal && (
        <div
          className="agri-root flex items-center justify-center p-4"
          style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <div
            onClick={() => close(false)}
            style={{
              position: "absolute",
              top: 0, left: 0, right: 0, bottom: 0,
              background: "rgba(15, 25, 18, 0.65)",
            }}
          />
          <div
            className="agri-card relative w-full max-w-md"
            style={{
              animation: "agri-modal-in 160ms ease-out",
              background: "#FFFFFF",
              boxShadow: "0 12px 40px rgba(15, 25, 18, 0.28), 0 2px 8px rgba(15, 25, 18, 0.10)",
              border: "1px solid var(--border-strong)",
            }}
          >
            {(() => {
              const cfg = toneStyles[modal.tone] || toneStyles.info;
              const Ico = cfg.Icon;
              return (
                <>
                  <div className="p-5">
                    <div className="flex items-start gap-3">
                      <div
                        className="w-9 h-9 rounded flex items-center justify-center shrink-0"
                        style={{ background: "var(--surface-alt)" }}
                      >
                        <Ico size={18} style={{ color: cfg.accent }} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3
                          id="modal-title"
                          className="font-semibold text-base mb-1"
                          style={{ color: "var(--text)" }}
                        >
                          {modal.title}
                        </h3>
                        {modal.body && (
                          <p
                            className="text-sm"
                            style={{ color: "var(--text-muted)", lineHeight: 1.5 }}
                          >
                            {modal.body}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => close(false)}
                        aria-label="Close"
                        className="shrink-0 -mt-1 -mr-1 p-1 rounded hover:bg-[var(--surface-alt)]"
                      >
                        <X size={16} style={{ color: "var(--text-muted)" }} />
                      </button>
                    </div>
                  </div>
                  <div
                    className="px-5 py-3 border-t flex justify-end gap-2"
                    style={{ borderColor: "var(--border)", background: "#fff" }}
                  >
                    {modal.hasCancel && (
                      <button
                        className="agri-btn agri-btn-secondary agri-btn-sm"
                        onClick={() => close(false)}
                      >
                        {modal.cancelLabel}
                      </button>
                    )}
                    <button
                      className={`agri-btn agri-btn-sm ${modal.tone === "error" ? "agri-btn-danger" : "agri-btn-primary"}`}
                      onClick={() => close(true)}
                    >
                      {modal.confirmLabel}
                    </button>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </ModalCtx.Provider>
  );
}