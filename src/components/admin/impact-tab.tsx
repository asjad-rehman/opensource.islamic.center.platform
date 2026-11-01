"use client";

import React, { useState } from "react";
import { HeartHandshake } from "lucide-react";
import type { ImpactItem } from "@/lib/store";
import { ICH } from "../ui-primitives";
import ImageUpload from "./image-upload";
import {
  api, useAdminList, useAction, useDirty, TabHeader, Field, Button, RowActions, ItemCard, EmptyState, StatusNote,
  moved, confirmDelete, inputStyle, panelStyle, listHeadingStyle, twoColGrid, LIVE_NOTE,
} from "./ui";

const EMPTY = { title: "", description: "", count: "", image: "" };

export default function ImpactTab() {
  const { items, setItems, loading, loadError, reload } = useAdminList<ImpactItem>("/api/admin/impact", "impact");
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { busy, status, setStatus, run } = useAction();

  const dirty = editingId !== null || form.title !== "" || form.description !== "" || form.image !== "";
  useDirty("impact", dirty);
  const reset = () => { setForm(EMPTY); setEditingId(null); };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const isEdit = !!editingId;
    await run(async () => {
      const data = await api<{ item: ImpactItem }>("/api/admin/impact", isEdit ? "PUT" : "POST", isEdit ? { id: editingId, ...form } : form);
      setItems((prev) => (isEdit ? prev.map((x) => (x.id === editingId ? data.item : x)) : [data.item, ...prev]));
      reset();
    }, `${isEdit ? "Story updated" : "Story published"}. ${LIVE_NOTE}`, "/impact");
  };

  const remove = async (item: ImpactItem) => {
    if (!confirmDelete(`the story “${item.title}”`)) return;
    await run(async () => {
      await api(`/api/admin/impact?id=${encodeURIComponent(item.id)}`, "DELETE");
      setItems((prev) => prev.filter((x) => x.id !== item.id));
      if (editingId === item.id) reset();
    }, "Story deleted.");
  };

  const move = async (i: number, dir: -1 | 1) => {
    const next = moved(items, i, dir);
    setItems(next);
    await run(() => api("/api/admin/impact", "PATCH", { ids: next.map((x) => x.id) }), `Order saved. ${LIVE_NOTE}`);
  };

  return (
    <div>
      <TabHeader icon={<HeartHandshake className="h-6 w-6" />} title="Impact Stories" description="Stories and numbers shown on the Our Impact page, in the order listed here. New stories go to the top." siteHref="/impact" />
      <div style={twoColGrid}>
        <form onSubmit={save} style={panelStyle}>
          <h3 style={{ fontFamily: "Cormorant Garamond,serif", fontSize: 21, fontWeight: 600, color: ICH.primary }}>{editingId ? "Edit story" : "Add a story"}</h3>
          <Field label="Title" htmlFor="im-title">
            <input id="im-title" type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required maxLength={160} style={inputStyle} placeholder="e.g. Ramadan Food Drive" />
          </Field>
          <Field label="Highlight (optional)" htmlFor="im-count" hint="A short number or phrase shown in bold, e.g. “120 families” or “100% volunteer-run”.">
            <input id="im-count" type="text" value={form.count} onChange={(e) => setForm({ ...form, count: e.target.value })} maxLength={60} style={inputStyle} />
          </Field>
          <Field label="Story" htmlFor="im-desc">
            <textarea id="im-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required rows={6} maxLength={5000} style={{ ...inputStyle, resize: "vertical" }} placeholder="What happened and who it helped…" />
          </Field>
          <Field label="Photo (optional)">
            <ImageUpload value={form.image} onChange={(url) => setForm({ ...form, image: url })} />
          </Field>
          <StatusNote status={status} onClose={() => setStatus(null)} />
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Button type="submit" busy={busy}>{editingId ? "Save changes" : "Publish story"}</Button>
            {dirty && <Button variant="secondary" onClick={reset} disabled={busy}>{editingId ? "Cancel editing" : "Clear form"}</Button>}
          </div>
        </form>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <h3 style={listHeadingStyle}>Stories — website order ({items.length})</h3>
          {items.length === 0 ? (
            <EmptyState loading={loading} error={loadError} onRetry={reload}>No stories yet.</EmptyState>
          ) : items.map((item, i) => (
            <ItemCard
              key={item.id}
              actions={
                <RowActions
                  onUp={i > 0 ? () => move(i, -1) : undefined}
                  onDown={i < items.length - 1 ? () => move(i, 1) : undefined}
                  onEdit={() => { setEditingId(item.id); setForm({ title: item.title, description: item.description, count: item.count || "", image: item.image || "" }); setStatus(null); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                  onDelete={() => remove(item)}
                />
              }
            >
              <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                {item.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.image} alt="" style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 6, border: `1px solid ${ICH.border}`, flexShrink: 0 }} />
                )}
                <div style={{ minWidth: 0 }}>
                  <h4 style={{ fontFamily: "Cormorant Garamond,serif", fontSize: 19, fontWeight: 600, color: ICH.text }}>{item.title}</h4>
                  {item.count && <div style={{ fontSize: 14, fontWeight: 700, color: ICH.primary, marginTop: 2 }}>{item.count}</div>}
                  <p style={{ fontSize: 14, color: ICH.textMuted, lineHeight: 1.55, marginTop: 4, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{item.description}</p>
                </div>
              </div>
            </ItemCard>
          ))}
        </div>
      </div>
    </div>
  );
}
