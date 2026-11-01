"use client";

import React, { useState } from "react";
import { Users } from "lucide-react";
import type { BoardMember } from "@/lib/store";
import { ICH } from "../ui-primitives";
import {
  api, useAdminList, useAction, useDirty, TabHeader, Field, Button, RowActions, ItemCard, EmptyState, StatusNote,
  moved, confirmDelete, inputStyle, panelStyle, listHeadingStyle, twoColGrid, LIVE_NOTE,
} from "./ui";

const EMPTY = { name: "", role: "" };

export default function BoardTab() {
  const { items, setItems, loading, loadError, reload } = useAdminList<BoardMember>("/api/admin/board", "board");
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { busy, status, setStatus, run } = useAction();

  const dirty = editingId !== null || form.name !== "" || form.role !== "";
  useDirty("board", dirty);
  const reset = () => { setForm(EMPTY); setEditingId(null); };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const isEdit = !!editingId;
    await run(async () => {
      const data = await api<{ member: BoardMember }>("/api/admin/board", isEdit ? "PUT" : "POST", isEdit ? { id: editingId, ...form } : form);
      setItems((prev) => (isEdit ? prev.map((b) => (b.id === editingId ? data.member : b)) : [...prev, data.member]));
      reset();
    }, `${isEdit ? "Board member updated" : "Board member added"}. ${LIVE_NOTE}`, "/about");
  };

  const remove = async (b: BoardMember) => {
    if (!confirmDelete(`${b.name} (${b.role}) from the board list`)) return;
    await run(async () => {
      await api(`/api/admin/board?id=${encodeURIComponent(b.id)}`, "DELETE");
      setItems((prev) => prev.filter((x) => x.id !== b.id));
      if (editingId === b.id) reset();
    }, "Board member removed.");
  };

  const move = async (i: number, dir: -1 | 1) => {
    const next = moved(items, i, dir);
    setItems(next);
    await run(() => api("/api/admin/board", "PATCH", { ids: next.map((x) => x.id) }), `Order saved. ${LIVE_NOTE}`);
  };

  return (
    <div>
      <TabHeader icon={<Users className="h-6 w-6" />} title="Board Members" description="Listed on the About page in the order shown here. Use the arrows to reorder (e.g. President first)." siteHref="/about" />
      <div style={twoColGrid}>
        <form onSubmit={save} style={panelStyle}>
          <h3 style={{ fontFamily: "Cormorant Garamond,serif", fontSize: 21, fontWeight: 600, color: ICH.primary }}>{editingId ? "Edit board member" : "Add a board member"}</h3>
          <Field label="Full name" htmlFor="b-name">
            <input id="b-name" type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required maxLength={120} style={inputStyle} placeholder="Full name" />
          </Field>
          <Field label="Role" htmlFor="b-role">
            <input id="b-role" type="text" list="board-roles" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} required maxLength={120} style={inputStyle} placeholder="e.g. President" />
            <datalist id="board-roles">
              {["President", "Vice President", "Secretary", "Treasurer", "Imam", "Board Member", "Youth Director", "Outreach Coordinator"].map((r) => <option key={r} value={r} />)}
            </datalist>
          </Field>
          <StatusNote status={status} onClose={() => setStatus(null)} />
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Button type="submit" busy={busy}>{editingId ? "Save changes" : "Add member"}</Button>
            {dirty && <Button variant="secondary" onClick={reset} disabled={busy}>{editingId ? "Cancel editing" : "Clear form"}</Button>}
          </div>
        </form>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <h3 style={listHeadingStyle}>Current board — website order ({items.length})</h3>
          {items.length === 0 ? (
            <EmptyState loading={loading} error={loadError} onRetry={reload}>No board members listed yet.</EmptyState>
          ) : items.map((b, i) => (
            <ItemCard
              key={b.id}
              actions={
                <RowActions
                  onUp={i > 0 ? () => move(i, -1) : undefined}
                  onDown={i < items.length - 1 ? () => move(i, 1) : undefined}
                  onEdit={() => { setEditingId(b.id); setForm({ name: b.name, role: b.role }); setStatus(null); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                  onDelete={() => remove(b)}
                />
              }
            >
              <div style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
                <span style={{ fontSize: 13, color: ICH.textMuted, fontWeight: 700 }}>{i + 1}.</span>
                <h4 style={{ fontFamily: "Cormorant Garamond,serif", fontSize: 19, fontWeight: 600, color: ICH.text }}>{b.name}</h4>
                <span style={{ fontSize: 14, color: ICH.primary, fontWeight: 600 }}>{b.role}</span>
              </div>
            </ItemCard>
          ))}
        </div>
      </div>
    </div>
  );
}
