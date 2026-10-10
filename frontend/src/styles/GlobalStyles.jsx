import React from "react";

export default function GlobalStyle() {
  return (
    <style>{`
      .agri-root {
        --bg: #F8F8F5;
        --surface: #FFFFFF;
        --surface-alt: #F2F1EA;
        --border: #E1DED4;
        --border-strong: #C9C5B7;
        --text: #1A1D1A;
        --text-muted: #5A5D57;
        --text-faint: #8A8D85;
        --primary: #1E3A2B;
        --primary-dark: #142619;
        --primary-hover: #2A4A38;
        --primary-soft: #E8EEE8;
        --primary-soft-border: #C5D2C4;
        --amber: #8A5A0B;
        --amber-soft: #F5EEDC;
        --amber-border: #E0CC97;
        --blue: #2F4A6B;
        --blue-soft: #E7EDF4;
        --blue-border: #BFCDDD;
        --red: #963A3A;
        --red-soft: #F6E9E8;
        --red-border: #E0BFBD;
        font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif;
        background: var(--bg);
        color: var(--text);
        -webkit-font-smoothing: antialiased;
      }
      .agri-root .mono { font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace; }

      .agri-btn {
        display: inline-flex; align-items: center; justify-content: center; gap: 8px;
        padding: 10px 18px; border-radius: 4px; font-size: 14px; font-weight: 600;
        border: 1px solid transparent; cursor: pointer;
        transition: background 0.12s ease, border-color 0.12s ease, color 0.12s ease;
        white-space: nowrap;
      }
      .agri-btn:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
      .agri-btn-primary { background: var(--primary); color: #fff; border-color: var(--primary); }
      .agri-btn-primary:hover { background: var(--primary-hover); border-color: var(--primary-hover); }
      .agri-btn-secondary { background: var(--surface); color: var(--text); border-color: var(--border-strong); }
      .agri-btn-secondary:hover { background: var(--surface-alt); border-color: var(--primary); color: var(--primary); }
      .agri-btn-ghost { background: transparent; color: var(--text-muted); border-color: transparent; }
      .agri-btn-ghost:hover { background: var(--surface-alt); color: var(--text); }
      .agri-btn-danger { background: var(--surface); color: var(--red); border-color: var(--red-border); }
      .agri-btn-danger:hover { background: var(--red-soft); }
      .agri-btn:disabled { opacity: 0.5; cursor: not-allowed; }
      .agri-btn-sm { padding: 6px 12px; font-size: 13px; }
      .agri-btn-block { width: 100%; }

      .agri-card {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 6px;
        box-shadow: 0 1px 2px rgba(26, 29, 26, 0.04);
      }

      .agri-input, .agri-select, .agri-textarea {
        width: 100%; border: 1px solid var(--border-strong); border-radius: 4px;
        padding: 9px 11px; font-size: 14px; font-family: inherit; color: var(--text);
        background: var(--surface); transition: border-color 0.12s, box-shadow 0.12s;
      }
      .agri-input:focus, .agri-select:focus, .agri-textarea:focus {
        outline: none; border-color: var(--primary);
        box-shadow: 0 0 0 2px var(--primary-soft-border);
      }
      .agri-label { font-size: 13px; font-weight: 600; color: var(--text); margin-bottom: 6px; display: block; }
      .agri-hint { font-size: 12.5px; color: var(--text-faint); margin-top: 4px; }

      .agri-badge {
        display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600;
        padding: 3px 8px; border-radius: 3px; border: 1px solid transparent;
      }
      .agri-badge-green { background: var(--primary-soft); border-color: var(--primary-soft-border); color: var(--primary-dark); }
      .agri-badge-amber { background: var(--amber-soft); border-color: var(--amber-border); color: var(--amber); }
      .agri-badge-blue  { background: var(--blue-soft); border-color: var(--blue-border); color: var(--blue); }
      .agri-badge-red   { background: var(--red-soft); border-color: var(--red-border); color: var(--red); }
      .agri-badge-gray  { background: var(--surface-alt); border-color: var(--border); color: var(--text-muted); }

      .agri-nav-link {
        display: flex; align-items: center; gap: 12px; padding: 9px 14px; border-radius: 4px;
        font-size: 14px; font-weight: 500; color: var(--text-muted); cursor: pointer;
        transition: background 0.12s, color 0.12s;
      }
      .agri-nav-link:hover { background: var(--surface-alt); color: var(--text); }
      .agri-nav-link.active {
        background: var(--primary-soft); color: var(--primary-dark);
        font-weight: 600;
      }

      .agri-table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
      .agri-table th {
        text-align: left; padding: 11px 14px; font-weight: 600; color: var(--text-muted);
        border-bottom: 1px solid var(--border); white-space: nowrap; font-size: 12px;
        text-transform: uppercase; letter-spacing: 0.04em; background: var(--surface-alt);
      }
      .agri-table td { padding: 13px 14px; border-bottom: 1px solid var(--border); vertical-align: middle; }
      .agri-table tr:last-child td { border-bottom: none; }
      .agri-table tbody tr:hover td { background: #FBFBF8; }
      .agri-table-wrap { overflow-x: auto; }

      .agri-step {
        width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center;
        justify-content: center; font-size: 12.5px; font-weight: 700;
        border: 1.5px solid var(--border-strong); color: var(--text-faint);
        background: var(--surface); flex-shrink: 0;
      }
      .agri-step.active { border-color: var(--primary); background: var(--primary); color: #fff; }
      .agri-step.done { border-color: var(--primary); background: var(--primary-soft); color: var(--primary-dark); }

      .agri-bar-track { height: 8px; background: var(--surface-alt); border-radius: 3px; overflow: hidden; }
      .agri-bar-fill { height: 100%; background: var(--primary); border-radius: 3px; }

      a.agri-plain { text-decoration: none; color: inherit; }
      .agri-scroll::-webkit-scrollbar { height: 6px; width: 6px; }
      .agri-scroll::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius: 3px; }

      .agri-stat {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 6px;
        box-shadow: 0 1px 2px rgba(26, 29, 26, 0.04);
      }
      .agri-feature {
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 6px;
        transition: border-color 0.12s ease;
      }
      .agri-feature:hover { border-color: var(--primary-soft-border); }

      @keyframes agri-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.55; } }
      .agri-skel { background: var(--surface-alt); border-radius: 4px; animation: agri-pulse 1.4s ease-in-out infinite; }

      @keyframes agri-toast-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
      @keyframes agri-modal-in { from { opacity: 0; transform: translateY(6px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }
    `}</style>
  );
}