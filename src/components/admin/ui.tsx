"use client";

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, ExternalLink, Pencil, Trash2, Loader2 } from "lucide-react";
import { ICH } from "../ui-primitives";

// ── Styles ───────────────────────────────────────────────────────────────────
export const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  border: `1px solid ${ICH.border}`,
  borderRadius: 6,
  fontSize: 15,
  fontFamily: "Inter,sans-serif",
  background: "#fff",
  color: ICH.text,
  outline: "none",
  minHeight: 44,
};

export const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 600,
  color: ICH.text,
  fontFamily: "Inter,sans-serif",
  marginBottom: 6,
};

export const hintStyle: React.CSSProperties = { fontSize: 12.5, color: ICH.textMuted, marginTop: 5, lineHeight: 1.5, fontFamily: "Inter,sans-serif" };

export const panelStyle: React.CSSProperties = {
  background: "#fff",
  border: `1px solid ${ICH.border}`,
  borderRadius: 10,
  padding: "24px clamp(16px, 4vw, 28px)",
  display: "flex",
  flexDirection: "column",
  gap: 18,
};

export const listHeadingStyle: React.CSSProperties = {
  fontFamily: "Inter,sans-serif",
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: ".08em",
  textTransform: "uppercase",
  color: ICH.textMuted,
  margin: "4px 0 2px",
};

export const twoColGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))",
  gap: 28,
  alignItems: "start",
};

// ── Requests ─────────────────────────────────────────────────────────────────
/** fetch + JSON, throwing the server's error message on failure. */
export async function api<T = Record<string, unknown>>(url: string, method = "GET", body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
  } catch {
    throw new Error("No connection — check your internet and try again.");
  }
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    throw new Error("Your session has expired. Refresh the page and sign in again.");
  }
  if (!res.ok || data?.ok === false) {
    throw new Error(data?.error || `Something went wrong (${res.status}). Please try again.`);
  }
  return data as T;
}

/** Load a list once, with loading + error state and a reload function. */
export function useAdminList<T>(url: string, key: string) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const reload = useCallback(async () => {
    try {
      const data = await api<Record<string, T[]>>(url);
      setItems(data[key] || []);
      setLoadError("");
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Couldn't load.");
    } finally {
      setLoading(false);
    }
  }, [url, key]);

  useEffect(() => {
    let alive = true;
    api<Record<string, T[]>>(url)
      .then((data) => { if (alive) { setItems(data[key] || []); setLoadError(""); } })
      .catch((e) => { if (alive) setLoadError(e instanceof Error ? e.message : "Couldn't load."); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [url, key]);
  return { items, setItems, loading, loadError, reload };
}

// ── Status messages ──────────────────────────────────────────────────────────
export type Status = { kind: "success" | "error"; text: string; href?: string } | null;

export const LIVE_NOTE = "It will show on the website within about a minute.";

export function StatusNote({ status, onClose }: { status: Status; onClose?: () => void }) {
  if (!status) return null;
  const ok = status.kind === "success";
  return (
    <div
      role={ok ? "status" : "alert"}
      style={{
        position: "fixed",
        left: "50%",
        transform: "translateX(-50%)",
        bottom: 16,
        width: "min(560px, calc(100vw - 32px))",
        zIndex: 60,
        boxShadow: "0 8px 28px rgba(0,0,0,.18)",
        fontSize: 14,
        lineHeight: 1.5,
        fontFamily: "Inter,sans-serif",
        padding: "10px 14px",
        borderRadius: 6,
        color: ok ? "#1b5e20" : "#b71c1c",
        background: ok ? "#edf7ee" : "#fdf1f1",
        border: `1px solid ${ok ? "#c8e6c9" : "#f5c6c6"}`,
        display: "flex",
        gap: 10,
        alignItems: "flex-start",
        justifyContent: "space-between",
      }}
    >
      <span>
        {ok ? "✓ " : "⚠ "}
        {status.text}
        {status.href && (
          <>
            {" "}
            <a href={status.href} target="_blank" rel="noopener noreferrer" style={{ color: "inherit", fontWeight: 600 }}>
              View on site ↗
            </a>
          </>
        )}
      </span>
      {onClose && (
        <button type="button" onClick={onClose} aria-label="Dismiss message" style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", fontSize: 16, lineHeight: 1 }}>
          ×
        </button>
      )}
    </div>
  );
}

/** Wraps an async action with a busy flag and a persistent success/error message. */
export function useAction() {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  // Success messages fade after a while; errors stay until dismissed.
  useEffect(() => {
    if (status?.kind !== "success") return;
    const t = setTimeout(() => setStatus(null), 9000);
    return () => clearTimeout(t);
  }, [status]);
  const run = useCallback(async (fn: () => Promise<unknown>, success?: string, href?: string) => {
    setBusy(true);
    setStatus(null);
    try {
      await fn();
      if (success) setStatus({ kind: "success", text: success, href });
      return true;
    } catch (e) {
      setStatus({ kind: "error", text: e instanceof Error ? e.message : "Something went wrong." });
      return false;
    } finally {
      setBusy(false);
    }
  }, []);
  return { busy, status, setStatus, run };
}

// ── Unsaved-changes tracking ─────────────────────────────────────────────────
type DirtyCtx = { set: (id: string, dirty: boolean) => void; any: () => boolean };
const DirtyContext = createContext<DirtyCtx>({ set: () => {}, any: () => false });

export function DirtyProvider({ children }: { children: React.ReactNode }) {
  const dirty = useRef(new Set<string>());
  const set = useCallback((id: string, d: boolean) => {
    if (d) dirty.current.add(id);
    else dirty.current.delete(id);
  }, []);
  const any = useCallback(() => dirty.current.size > 0, []);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirty.current.size > 0) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  return <DirtyContext.Provider value={{ set, any }}>{children}</DirtyContext.Provider>;
}

/** Mark this form as having unsaved changes (warns before leaving). */
export function useDirty(id: string, dirty: boolean) {
  const ctx = useContext(DirtyContext);
  useEffect(() => {
    ctx.set(id, dirty);
    return () => ctx.set(id, false);
  }, [ctx, id, dirty]);
}

export function useDirtyCheck() {
  return useContext(DirtyContext).any;
}

// ── Building blocks ──────────────────────────────────────────────────────────
export function TabHeader({ icon, title, description, siteHref, siteLabel }: {
  icon: React.ReactNode;
  title: string;
  description: React.ReactNode;
  siteHref?: string;
  siteLabel?: string;
}) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap", marginBottom: 22 }}>
      <div style={{ minWidth: 0, flex: "1 1 320px" }}>
        <h2 style={{ fontFamily: "Cormorant Garamond,serif", fontSize: 28, fontWeight: 600, display: "flex", alignItems: "center", gap: 10, color: ICH.text }}>
          <span style={{ color: ICH.primary, display: "inline-flex" }}>{icon}</span>
          {title}
        </h2>
        <p style={{ fontSize: 14, color: ICH.textMuted, marginTop: 4, lineHeight: 1.6, maxWidth: 680 }}>{description}</p>
      </div>
      {siteHref && (
        <a href={siteHref} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13.5, fontWeight: 600, color: ICH.primary, textDecoration: "none", border: `1px solid ${ICH.border}`, borderRadius: 6, padding: "8px 12px", background: "#fff", whiteSpace: "nowrap" }}>
          {siteLabel || "View on website"} <ExternalLink className="h-4 w-4" />
        </a>
      )}
    </div>
  );
}

export function Field({ label, hint, children, htmlFor }: { label: string; hint?: React.ReactNode; children: React.ReactNode; htmlFor?: string }) {
  return (
    <div>
      <label style={labelStyle} htmlFor={htmlFor}>{label}</label>
      {children}
      {hint && <div style={hintStyle}>{hint}</div>}
    </div>
  );
}

export function Checkbox({ id, checked, onChange, label, hint }: { id: string; checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label htmlFor={id} style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer", fontFamily: "Inter,sans-serif" }}>
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} style={{ width: 20, height: 20, marginTop: 1, accentColor: ICH.primary, flexShrink: 0 }} />
      <span>
        <span style={{ fontSize: 14.5, fontWeight: 600, color: ICH.text }}>{label}</span>
        {hint && <span style={{ display: "block", fontSize: 12.5, color: ICH.textMuted, marginTop: 2 }}>{hint}</span>}
      </span>
    </label>
  );
}

export function Button({ children, onClick, type = "button", variant = "primary", busy, disabled, style }: {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  variant?: "primary" | "secondary" | "danger" | "ghost";
  busy?: boolean;
  disabled?: boolean;
  style?: React.CSSProperties;
}) {
  const variants: Record<string, React.CSSProperties> = {
    primary: { background: ICH.primary, color: "#fff", border: `1px solid ${ICH.primary}` },
    secondary: { background: "#fff", color: ICH.primary, border: `1px solid ${ICH.primary}` },
    danger: { background: "#fff", color: "#c62828", border: "1px solid #e8b4b4" },
    ghost: { background: "transparent", color: ICH.textMuted, border: "1px solid transparent" },
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={busy || disabled}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 7,
        minHeight: 42,
        padding: "9px 18px",
        borderRadius: 6,
        fontSize: 14,
        fontWeight: 600,
        fontFamily: "Inter,sans-serif",
        cursor: busy || disabled ? "default" : "pointer",
        opacity: busy || disabled ? 0.6 : 1,
        whiteSpace: "nowrap",
        ...variants[variant],
        ...style,
      }}
    >
      {busy && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}

const smallBtn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  minHeight: 34,
  padding: "5px 10px",
  borderRadius: 6,
  fontSize: 13,
  fontWeight: 600,
  fontFamily: "Inter,sans-serif",
  cursor: "pointer",
  background: "#fff",
  whiteSpace: "nowrap",
  flexShrink: 0,
};

/** Clearly labeled Edit / Delete (+ optional reorder and extra) actions. Never shrinks. */
export function RowActions({ onEdit, onDelete, onUp, onDown, extra }: {
  onEdit?: () => void;
  onDelete?: () => void;
  onUp?: () => void;
  onDown?: () => void;
  extra?: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, flexShrink: 0, alignItems: "center" }}>
      {(onUp || onDown) && (
        <span style={{ display: "inline-flex", gap: 2 }}>
          <button type="button" onClick={onUp} disabled={!onUp} aria-label="Move up" title="Move up" style={{ ...smallBtn, padding: "5px 7px", color: ICH.textMuted, border: `1px solid ${ICH.border}`, opacity: onUp ? 1 : 0.35, cursor: onUp ? "pointer" : "default" }}>
            <ArrowUp className="h-4 w-4" />
          </button>
          <button type="button" onClick={onDown} disabled={!onDown} aria-label="Move down" title="Move down" style={{ ...smallBtn, padding: "5px 7px", color: ICH.textMuted, border: `1px solid ${ICH.border}`, opacity: onDown ? 1 : 0.35, cursor: onDown ? "pointer" : "default" }}>
            <ArrowDown className="h-4 w-4" />
          </button>
        </span>
      )}
      {extra}
      {onEdit && (
        <button type="button" onClick={onEdit} style={{ ...smallBtn, color: ICH.primary, border: `1px solid ${ICH.border}` }}>
          <Pencil className="h-4 w-4" /> Edit
        </button>
      )}
      {onDelete && (
        <button type="button" onClick={onDelete} style={{ ...smallBtn, color: "#c62828", border: "1px solid #f0c9c9" }}>
          <Trash2 className="h-4 w-4" /> Delete
        </button>
      )}
    </div>
  );
}

export function SmallLinkButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} style={{ ...smallBtn, color: ICH.textMuted, border: `1px solid ${ICH.border}`, textDecoration: "none" }}>
      {children}
    </a>
  );
}

export function ItemCard({ children, actions, dim }: { children: React.ReactNode; actions: React.ReactNode; dim?: boolean }) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${ICH.border}`, borderRadius: 8, padding: "14px 16px", opacity: dim ? 0.65 : 1 }}>
      <div style={{ minWidth: 0, overflowWrap: "anywhere" }}>{children}</div>
      <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${ICH.border}` }}>{actions}</div>
    </div>
  );
}

export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "green" | "gold" | "red" | "blue" }) {
  const tones = {
    neutral: { bg: "#eef1f2", fg: ICH.textMuted },
    green: { bg: "#e7f4ea", fg: "#1b5e20" },
    gold: { bg: "#fbf1dc", fg: "#8a5a00" },
    red: { bg: "#fdecec", fg: "#b71c1c" },
    blue: { bg: "#e5f0f3", fg: ICH.primary },
  }[tone];
  return (
    <span style={{ display: "inline-block", fontSize: 11.5, fontWeight: 700, fontFamily: "Inter,sans-serif", padding: "2px 8px", borderRadius: 20, background: tones.bg, color: tones.fg, marginRight: 6, verticalAlign: "middle", whiteSpace: "nowrap" }}>
      {children}
    </span>
  );
}

export function EmptyState({ loading, error, onRetry, children }: { loading: boolean; error: string; onRetry: () => void; children: React.ReactNode }) {
  const box: React.CSSProperties = { padding: 24, textAlign: "center", color: ICH.textMuted, border: `1px dashed ${ICH.border}`, borderRadius: 8, fontSize: 14, fontFamily: "Inter,sans-serif" };
  if (loading) return <div style={box}><Loader2 className="h-5 w-5 animate-spin" style={{ margin: "0 auto 6px" }} />Loading…</div>;
  if (error) {
    return (
      <div style={{ ...box, color: "#b71c1c", borderColor: "#f5c6c6" }}>
        Couldn&apos;t load this list: {error}
        <div style={{ marginTop: 10 }}><Button variant="secondary" onClick={onRetry}>Try again</Button></div>
      </div>
    );
  }
  return <div style={box}>{children}</div>;
}

/** Move item at index `i` by `dir` and return the new id order. */
export function moved<T extends { id: string }>(items: T[], i: number, dir: -1 | 1): T[] {
  const j = i + dir;
  if (j < 0 || j >= items.length) return items;
  const next = [...items];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

export function confirmDelete(what: string) {
  return window.confirm(`Delete ${what}?\n\nThis can't be undone.`);
}

// ── Formatting ───────────────────────────────────────────────────────────────
export function fmtTime12(t?: string) {
  if (!t || !/^\d{1,2}:\d{2}/.test(t)) return "";
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

export function parseDate(d: string) {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, (m || 1) - 1, day || 1);
}

export function fmtDate(d: string, opts: Intl.DateTimeFormatOptions = { weekday: "short", month: "short", day: "numeric", year: "numeric" }) {
  if (!d) return "";
  return parseDate(d).toLocaleDateString("en-US", opts);
}

export function todayISO() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
}

export function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** For a weekly event, the next occurrence on/after today. */
export function nextOccurrence(date: string, recurring?: boolean) {
  if (!recurring || !date) return date;
  const d = parseDate(date);
  const today = parseDate(todayISO());
  while (d < today) d.setDate(d.getDate() + 7);
  return toISO(d);
}
