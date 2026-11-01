"use client";

import React, { useState } from "react";
import { Bell, ImageIcon } from "lucide-react";
import type { Announcement } from "@/lib/store";
import { ICH } from "../ui-primitives";
import {
  api, useAdminList, useAction, useDirty, TabHeader, Field, Checkbox, Button, RowActions, ItemCard, Badge,
  EmptyState, StatusNote, SmallLinkButton, moved, confirmDelete, fmtDate, todayISO, inputStyle, panelStyle,
  listHeadingStyle, twoColGrid, LIVE_NOTE,
} from "./ui";

type Form = { title: string; body: string; priority: "normal" | "urgent"; expiresOn: string; active: boolean };
const EMPTY: Form = { title: "", body: "", priority: "normal", expiresOn: "", active: true };

export function announcementStatus(a: Announcement, today = todayISO()) {
  if (a.active === false) return "hidden" as const;
  if (a.expiresOn && a.expiresOn < today) return "expired" as const;
  return "live" as const;
}

export default function AnnouncementsTab() {
  const { items, setItems, loading, loadError, reload } = useAdminList<Announcement>("/api/admin/announcements", "announcements");
  const [form, setForm] = useState<Form>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { busy, status, setStatus, run } = useAction();

  const dirty = editingId !== null || form.title !== "" || form.body !== "";
  useDirty("announcements", dirty);

  const reset = () => { setForm(EMPTY); setEditingId(null); };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const isEdit = !!editingId;
    await run(async () => {
      const data = await api<{ announcement: Announcement }>("/api/admin/announcements", isEdit ? "PUT" : "POST", isEdit ? { id: editingId, ...form } : form);
      setItems((prev) => (isEdit ? prev.map((a) => (a.id === editingId ? data.announcement : a)) : [data.announcement, ...prev]));
      reset();
    }, `${isEdit ? "Announcement updated" : "Announcement published"}. ${LIVE_NOTE}`, "/");
  };

  const edit = (a: Announcement) => {
    setEditingId(a.id);
    setForm({ title: a.title, body: a.body, priority: a.priority || "normal", expiresOn: a.expiresOn || "", active: a.active !== false });
    setStatus(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const remove = async (a: Announcement) => {
    if (!confirmDelete(`“${a.title}”`)) return;
    await run(async () => {
      await api(`/api/admin/announcements?id=${encodeURIComponent(a.id)}`, "DELETE");
      setItems((prev) => prev.filter((x) => x.id !== a.id));
      if (editingId === a.id) reset();
    }, "Announcement deleted.");
  };

  const toggle = async (a: Announcement) => {
    await run(async () => {
      const data = await api<{ announcement: Announcement }>("/api/admin/announcements", "PUT", { id: a.id, active: a.active === false });
      setItems((prev) => prev.map((x) => (x.id === a.id ? data.announcement : x)));
    }, a.active === false ? `Announcement is visible again. ${LIVE_NOTE}` : "Announcement hidden from the website.");
  };

  const move = async (i: number, dir: -1 | 1) => {
    const next = moved(items, i, dir);
    setItems(next);
    await run(() => api("/api/admin/announcements", "PATCH", { ids: next.map((x) => x.id) }), "Order saved.");
  };

  const today = todayISO();
  const liveIds = items.filter((a) => announcementStatus(a, today) === "live").map((a) => a.id);

  return (
    <div>
      <TabHeader
        icon={<Bell className="h-6 w-6" />}
        title="Announcements"
        description="Short notices shown in the banner at the top of every page. The top 2 live announcements are shown — use the arrows to choose which."
        siteHref="/"
        siteLabel="View banner on website"
      />

      <div style={twoColGrid}>
        <form onSubmit={save} style={panelStyle}>
          <h3 style={{ fontFamily: "Cormorant Garamond,serif", fontSize: 21, fontWeight: 600, color: ICH.primary }}>
            {editingId ? "Edit announcement" : "New announcement"}
          </h3>

          <Field label="Title" htmlFor="ann-title">
            <input id="ann-title" type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required maxLength={160} style={inputStyle} placeholder="e.g. Eid prayer time" />
          </Field>

          <Field label="Message" htmlFor="ann-body" hint={`${form.body.length}/3000 characters. Keep it short — long messages take up a lot of space on phones.`}>
            <textarea id="ann-body" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} required rows={4} maxLength={3000} style={{ ...inputStyle, resize: "vertical" }} placeholder="What should people know?" />
          </Field>

          <Field label="Show until (optional)" htmlFor="ann-exp" hint="The announcement disappears from the website after this day. Leave empty to keep it up until you remove it.">
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <input id="ann-exp" type="date" value={form.expiresOn} min={today} onChange={(e) => setForm({ ...form, expiresOn: e.target.value })} style={{ ...inputStyle, maxWidth: 220 }} />
              {form.expiresOn && <Button variant="ghost" onClick={() => setForm({ ...form, expiresOn: "" })}>Clear</Button>}
            </div>
          </Field>

          <fieldset style={{ border: "none", padding: 0, margin: 0 }}>
            <legend style={{ fontSize: 13, fontWeight: 600, color: ICH.text, marginBottom: 8 }}>Style</legend>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {([
                ["normal", "Normal", "Standard banner"],
                ["urgent", "Urgent", "Shown in red"],
              ] as const).map(([value, label, hint]) => (
                <label key={value} style={{ flex: "1 1 140px", display: "flex", gap: 8, alignItems: "flex-start", padding: "10px 12px", border: `1.5px solid ${form.priority === value ? (value === "urgent" ? "#c62828" : ICH.primary) : ICH.border}`, borderRadius: 8, cursor: "pointer", background: "#fff" }}>
                  <input type="radio" name="priority" checked={form.priority === value} onChange={() => setForm({ ...form, priority: value })} style={{ accentColor: ICH.primary, marginTop: 3 }} />
                  <span>
                    <span style={{ display: "block", fontWeight: 600, fontSize: 14, color: value === "urgent" ? "#c62828" : ICH.text }}>{label}</span>
                    <span style={{ fontSize: 12.5, color: ICH.textMuted }}>{hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <Checkbox id="ann-active" checked={form.active} onChange={(v) => setForm({ ...form, active: v })} label="Show on website" hint="Untick to save it as a hidden draft." />

          {(form.title || form.body) && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Preview</div>
              <div style={{ background: "#eef4f5", border: `1px solid ${ICH.border}`, borderRadius: 6, padding: "10px 12px", fontSize: 14, lineHeight: 1.5, color: form.priority === "urgent" ? "#b71c1c" : ICH.text }}>
                🔔 <strong>{form.title || "Title"}:</strong> <span style={{ color: form.priority === "urgent" ? "#b71c1c" : ICH.textMuted }}>{form.body}</span>
              </div>
            </div>
          )}

          <StatusNote status={status} onClose={() => setStatus(null)} />

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Button type="submit" busy={busy}>{editingId ? "Save changes" : "Publish announcement"}</Button>
            {dirty && <Button variant="secondary" onClick={reset} disabled={busy}>{editingId ? "Cancel editing" : "Clear form"}</Button>}
          </div>
        </form>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <h3 style={listHeadingStyle}>All announcements ({items.length})</h3>
          {items.length === 0 ? (
            <EmptyState loading={loading} error={loadError} onRetry={reload}>No announcements yet. Anything you publish appears at the top of every page.</EmptyState>
          ) : items.map((a, i) => {
            const st = announcementStatus(a, today);
            const onBanner = liveIds.indexOf(a.id) > -1 && liveIds.indexOf(a.id) < 2;
            return (
              <ItemCard
                key={a.id}
                dim={st !== "live"}
                actions={
                  <RowActions
                    onUp={i > 0 ? () => move(i, -1) : undefined}
                    onDown={i < items.length - 1 ? () => move(i, 1) : undefined}
                    onEdit={() => edit(a)}
                    onDelete={() => remove(a)}
                    extra={
                      <>
                        <button type="button" onClick={() => toggle(a)} style={{ minHeight: 34, padding: "5px 10px", borderRadius: 6, fontSize: 13, fontWeight: 600, border: `1px solid ${ICH.border}`, background: "#fff", color: ICH.textMuted, cursor: "pointer" }}>
                          {a.active === false ? "Show" : "Hide"}
                        </button>
                        <SmallLinkButton href={`/admin/post-designer?announcement=${encodeURIComponent(a.id)}`}><ImageIcon className="h-4 w-4" /> Make post</SmallLinkButton>
                      </>
                    }
                  />
                }
              >
                <div style={{ marginBottom: 6 }}>
                  {st === "live" && onBanner && <Badge tone="green">On website</Badge>}
                  {st === "live" && !onBanner && <Badge tone="neutral">Live · not in top 2</Badge>}
                  {st === "hidden" && <Badge>Hidden</Badge>}
                  {st === "expired" && <Badge tone="red">Expired {fmtDate(a.expiresOn!, { month: "short", day: "numeric" })}</Badge>}
                  {a.priority === "urgent" && <Badge tone="red">Urgent</Badge>}
                  {st === "live" && a.expiresOn && <Badge tone="gold">Until {fmtDate(a.expiresOn, { month: "short", day: "numeric" })}</Badge>}
                </div>
                <h4 style={{ fontFamily: "Cormorant Garamond,serif", fontSize: 19, fontWeight: 600, color: ICH.text }}>{a.title}</h4>
                <p style={{ fontSize: 14, color: ICH.textMuted, lineHeight: 1.55, whiteSpace: "pre-line", marginTop: 4, display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{a.body}</p>
                {a.created_at && <p style={{ fontSize: 12, color: ICH.textMuted, marginTop: 6 }}>Posted {new Date(a.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>}
              </ItemCard>
            );
          })}
        </div>
      </div>
    </div>
  );
}
