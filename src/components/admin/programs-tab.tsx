"use client";

import React, { useState } from "react";
import { BookOpen } from "lucide-react";
import type { Program } from "@/lib/store";
import { ICH } from "../ui-primitives";
import EmojiPicker from "./emoji-picker";
import {
  api, useAdminList, useAction, useDirty, TabHeader, Field, Checkbox, Button, RowActions, ItemCard, Badge, EmptyState,
  StatusNote, moved, confirmDelete, inputStyle, panelStyle, listHeadingStyle, twoColGrid, labelStyle, LIVE_NOTE,
} from "./ui";

const EMPTY = { icon: "📌", title: "", schedule: "", note: "", description: "", active: true };

export default function ProgramsTab() {
  const { items, setItems, loading, loadError, reload } = useAdminList<Program>("/api/admin/programs", "programs");
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { busy, status, setStatus, run } = useAction();

  const dirty = editingId !== null || form.title !== "" || form.description !== "";
  useDirty("programs", dirty);
  const reset = () => { setForm(EMPTY); setEditingId(null); };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const isEdit = !!editingId;
    await run(async () => {
      const data = await api<{ item: Program }>("/api/admin/programs", isEdit ? "PUT" : "POST", isEdit ? { id: editingId, ...form } : form);
      setItems((prev) => (isEdit ? prev.map((x) => (x.id === editingId ? data.item : x)) : [...prev, data.item]));
      reset();
    }, `${isEdit ? "Program updated" : "Program added"}. ${LIVE_NOTE}`, "/about");
  };

  const remove = async (p: Program) => {
    if (!confirmDelete(`the program “${p.title}”\n\nTip: use “Hide” instead if it's only paused`)) return;
    await run(async () => {
      await api(`/api/admin/programs?id=${encodeURIComponent(p.id)}`, "DELETE");
      setItems((prev) => prev.filter((x) => x.id !== p.id));
      if (editingId === p.id) reset();
    }, "Program deleted.");
  };

  const toggle = async (p: Program) => {
    await run(async () => {
      const data = await api<{ item: Program }>("/api/admin/programs", "PUT", { id: p.id, active: !p.active });
      setItems((prev) => prev.map((x) => (x.id === p.id ? data.item : x)));
    }, p.active ? "Program hidden from the website." : `Program is visible again. ${LIVE_NOTE}`);
  };

  const move = async (i: number, dir: -1 | 1) => {
    const next = moved(items, i, dir);
    setItems(next);
    await run(() => api("/api/admin/programs", "PATCH", { ids: next.map((x) => x.id) }), `Order saved. ${LIVE_NOTE}`);
  };

  return (
    <div>
      <TabHeader icon={<BookOpen className="h-6 w-6" />} title="Programs" description="Regular programs (Sunday School, halaqas…) listed on the About page. Hide a program while it's paused instead of deleting it." siteHref="/about" />
      <div style={twoColGrid}>
        <form onSubmit={save} style={panelStyle}>
          <h3 style={{ fontFamily: "Cormorant Garamond,serif", fontSize: 21, fontWeight: 600, color: ICH.primary }}>{editingId ? "Edit program" : "Add a program"}</h3>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-end" }}>
            <div>
              <label style={labelStyle} htmlFor="pg-icon">Icon</label>
              <EmojiPicker id="pg-icon" value={form.icon} onChange={(v) => setForm({ ...form, icon: v })} />
            </div>
            <div style={{ flex: 1 }}>
              <Field label="Program name" htmlFor="pg-title">
                <input id="pg-title" type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required maxLength={160} style={inputStyle} placeholder="e.g. Sunday School" />
              </Field>
            </div>
          </div>
          <Field label="When (optional)" htmlFor="pg-sched">
            <input id="pg-sched" type="text" value={form.schedule} onChange={(e) => setForm({ ...form, schedule: e.target.value })} maxLength={200} style={inputStyle} placeholder="e.g. Sundays 11 AM – 1 PM" />
          </Field>
          <Field label="Description" htmlFor="pg-desc">
            <textarea id="pg-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required rows={3} maxLength={2000} style={{ ...inputStyle, resize: "vertical" }} placeholder="Who it's for and what happens" />
          </Field>
          <Field label="Status note (optional)" htmlFor="pg-note" hint="Shown with a ★ under the description, e.g. “Off for summer — resumes Sept 13”.">
            <input id="pg-note" type="text" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} maxLength={200} style={inputStyle} />
          </Field>
          <Checkbox id="pg-active" checked={form.active} onChange={(v) => setForm({ ...form, active: v })} label="Show on website" />
          <StatusNote status={status} onClose={() => setStatus(null)} />
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Button type="submit" busy={busy}>{editingId ? "Save changes" : "Add program"}</Button>
            {dirty && <Button variant="secondary" onClick={reset} disabled={busy}>{editingId ? "Cancel editing" : "Clear form"}</Button>}
          </div>
        </form>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <h3 style={listHeadingStyle}>Programs — website order ({items.length})</h3>
          {items.length === 0 ? (
            <EmptyState loading={loading} error={loadError} onRetry={reload}>No programs yet.</EmptyState>
          ) : items.map((p, i) => (
            <ItemCard
              key={p.id}
              dim={!p.active}
              actions={
                <RowActions
                  onUp={i > 0 ? () => move(i, -1) : undefined}
                  onDown={i < items.length - 1 ? () => move(i, 1) : undefined}
                  onEdit={() => { setEditingId(p.id); setForm({ icon: p.icon, title: p.title, schedule: p.schedule, note: p.note, description: p.description, active: p.active }); setStatus(null); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                  onDelete={() => remove(p)}
                  extra={
                    <button type="button" onClick={() => toggle(p)} style={{ minHeight: 34, padding: "5px 10px", borderRadius: 6, fontSize: 13, fontWeight: 600, border: `1px solid ${ICH.border}`, background: "#fff", color: ICH.textMuted, cursor: "pointer" }}>
                      {p.active ? "Hide" : "Show"}
                    </button>
                  }
                />
              }
            >
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <span style={{ fontSize: 26, lineHeight: 1 }}>{p.icon}</span>
                <div style={{ minWidth: 0 }}>
                  <h4 style={{ fontFamily: "Cormorant Garamond,serif", fontSize: 19, fontWeight: 600, color: ICH.text }}>
                    {p.title} {!p.active && <Badge>Hidden</Badge>}
                  </h4>
                  {p.schedule && <div style={{ fontSize: 13.5, color: ICH.primary, fontWeight: 600, marginTop: 2 }}>{p.schedule}</div>}
                  <p style={{ fontSize: 14, color: ICH.textMuted, lineHeight: 1.55, marginTop: 4 }}>{p.description}</p>
                  {p.note && <p style={{ fontSize: 13, color: ICH.textMuted, marginTop: 4 }}>★ {p.note}</p>}
                </div>
              </div>
            </ItemCard>
          ))}
        </div>
      </div>
    </div>
  );
}
