"use client";

import React, { useEffect, useState } from "react";
import { Link2, UtensilsCrossed } from "lucide-react";
import type { ResourceLink } from "@/lib/store";
import { ICH } from "../ui-primitives";
import EmojiPicker from "./emoji-picker";
import {
  api, useAdminList, useAction, useDirty, TabHeader, Field, Button, RowActions, ItemCard, EmptyState, StatusNote,
  confirmDelete, inputStyle, panelStyle, listHeadingStyle, twoColGrid, labelStyle, LIVE_NOTE,
} from "./ui";

type Halal = { restaurants: string; meatSupply: string };

function HalalSection() {
  const [values, setValues] = useState<Halal | null>(null);
  const [original, setOriginal] = useState<Halal | null>(null);
  const [loadError, setLoadError] = useState("");
  const { busy, status, setStatus, run } = useAction();

  const load = async () => {
    try {
      const d = await api<{ resources: { restaurants: string | null; meatSupply: string | null } }>("/api/admin/resources?fresh=1");
      setLoadError("");
      const v = { restaurants: d.resources?.restaurants || "", meatSupply: d.resources?.meatSupply || "" };
      setValues(v);
      setOriginal(v);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Couldn't load.");
    }
  };
  // Load after mount; state is only set once the request resolves.
  useEffect(() => { void Promise.resolve().then(load); }, []);

  const dirty = !!values && !!original && (values.restaurants !== original.restaurants || values.meatSupply !== original.meatSupply);
  useDirty("halal", dirty);

  const save = () => run(async () => {
    const d = await api<{ resources: Halal }>("/api/admin/resources", "POST", values);
    const v = { restaurants: d.resources.restaurants || "", meatSupply: d.resources.meatSupply || "" };
    setValues(v);
    setOriginal(v);
  }, `Halal guide saved. ${LIVE_NOTE}`, "/resources");

  if (!values) {
    return <EmptyState loading={!loadError} error={loadError} onRetry={load}>{null}</EmptyState>;
  }

  const box = (key: keyof Halal, title: string, placeholder: string) => (
    <div style={panelStyle}>
      <h3 style={{ fontFamily: "Cormorant Garamond,serif", fontSize: 21, fontWeight: 600, color: ICH.primary }}>{title}</h3>
      <Field label="List" htmlFor={`halal-${key}`} hint="Put each place on its own line, starting with “- ”. It appears on the website exactly as typed (line breaks are kept).">
        <textarea id={`halal-${key}`} rows={14} value={values[key]} onChange={(e) => setValues({ ...values, [key]: e.target.value })} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.55, fontSize: 14 }} placeholder={placeholder} />
      </Field>
      <div style={{ fontSize: 12.5, color: ICH.textMuted }}>{values[key].split("\n").filter((l) => l.trim().startsWith("-")).length} entries</div>
    </div>
  );

  return (
    <section>
      <h3 style={{ fontFamily: "Cormorant Garamond,serif", fontSize: 23, fontWeight: 600, display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
        <UtensilsCrossed className="h-5 w-5" style={{ color: ICH.primary }} /> Local halal guide
      </h3>
      <div style={twoColGrid}>
        {box("restaurants", "Halal restaurants", "- Restaurant name (phone or note)")}
        {box("meatSupply", "Halal meat supply", "- Store name — address (what they carry)")}
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
        <Button onClick={save} busy={busy} disabled={!dirty}>{dirty ? "Save halal guide" : "No changes to save"}</Button>
        {dirty && <Button variant="secondary" onClick={() => setValues(original)} disabled={busy}>Undo changes</Button>}
      </div>
      <StatusNote status={status} onClose={() => setStatus(null)} />
    </section>
  );
}

const EMPTY_LINK = { category: "", categoryIcon: "🔗", label: "", url: "", order: 99 };

function LinksSection() {
  const { items, setItems, loading, loadError, reload } = useAdminList<ResourceLink>("/api/admin/resource-links?fresh=1", "links");
  const [form, setForm] = useState(EMPTY_LINK);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { busy, status, setStatus, run } = useAction();

  const dirty = editingId !== null || form.label !== "" || form.url !== "";
  useDirty("links", dirty);
  const reset = () => { setForm(EMPTY_LINK); setEditingId(null); };

  const categories = Array.from(new Map(items.map((l) => [l.category, l.categoryIcon])).entries());
  const grouped = categories.map(([cat, icon]) => ({ cat, icon, links: items.filter((l) => l.category === cat).sort((a, b) => a.order - b.order) }));

  const pickCategory = (cat: string) => {
    const existing = items.find((l) => l.category === cat);
    const count = items.filter((l) => l.category === cat).length;
    setForm((f) => ({ ...f, category: cat, categoryIcon: existing?.categoryIcon || f.categoryIcon, order: editingId ? f.order : count + 1 }));
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    let url = form.url.trim();
    if (url && !/^[a-z]+:/i.test(url)) url = `https://${url}`;
    const payload = { ...form, url };
    const isEdit = !!editingId;
    await run(async () => {
      const data = await api<{ item: ResourceLink }>("/api/admin/resource-links", isEdit ? "PUT" : "POST", isEdit ? { id: editingId, ...payload } : payload);
      setItems((prev) => (isEdit ? prev.map((x) => (x.id === editingId ? data.item : x)) : [...prev, data.item]));
      reset();
    }, `${isEdit ? "Link updated" : "Link added"}. ${LIVE_NOTE}`, "/resources");
  };

  const remove = async (l: ResourceLink) => {
    if (!confirmDelete(`the link “${l.label}”`)) return;
    await run(async () => {
      await api(`/api/admin/resource-links?id=${encodeURIComponent(l.id)}`, "DELETE");
      setItems((prev) => prev.filter((x) => x.id !== l.id));
      if (editingId === l.id) reset();
    }, "Link deleted.");
  };

  // Swap positions within a category and save both.
  const move = async (links: ResourceLink[], i: number, dir: -1 | 1) => {
    const a = links[i], b = links[i + dir];
    if (!a || !b) return;
    const orderA = i + 1, orderB = i + dir + 1;
    setItems((prev) => prev.map((x) => (x.id === a.id ? { ...x, order: orderB } : x.id === b.id ? { ...x, order: orderA } : x)));
    await run(async () => {
      await api("/api/admin/resource-links", "PUT", { id: a.id, order: orderB });
      await api("/api/admin/resource-links", "PUT", { id: b.id, order: orderA });
    }, `Order saved. ${LIVE_NOTE}`);
  };

  return (
    <section style={{ marginTop: 40, paddingTop: 30, borderTop: `2px solid ${ICH.border}` }}>
      <h3 style={{ fontFamily: "Cormorant Garamond,serif", fontSize: 23, fontWeight: 600, display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
        <Link2 className="h-5 w-5" style={{ color: ICH.primary }} /> Islamic learning links
      </h3>
      <p style={{ fontSize: 14, color: ICH.textMuted, marginBottom: 16 }}>Helpful websites, grouped into sections on the Resources page.</p>
      <div style={twoColGrid}>
        <form onSubmit={save} style={panelStyle}>
          <h4 style={{ fontFamily: "Cormorant Garamond,serif", fontSize: 20, fontWeight: 600, color: ICH.primary }}>{editingId ? "Edit link" : "Add a link"}</h4>
          <Field label="Name shown on the site" htmlFor="ln-label">
            <input id="ln-label" type="text" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} required maxLength={200} style={inputStyle} placeholder="e.g. Quran.com — Quran with translation" />
          </Field>
          <Field label="Web address" htmlFor="ln-url">
            <input id="ln-url" type="text" inputMode="url" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} required style={inputStyle} placeholder="quran.com" />
          </Field>
          <div>
            <label style={labelStyle} htmlFor="ln-cat">Section</label>
            <div style={{ display: "flex", gap: 10 }}>
              <EmojiPicker value={form.categoryIcon} onChange={(v) => setForm({ ...form, categoryIcon: v })} />
              <input id="ln-cat" type="text" list="link-cats" value={form.category} onChange={(e) => pickCategory(e.target.value)} required maxLength={80} style={inputStyle} placeholder="Pick or type a new section" />
              <datalist id="link-cats">{categories.map(([c]) => <option key={c} value={c} />)}</datalist>
            </div>
            {categories.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                {categories.map(([c, icon]) => (
                  <button key={c} type="button" onClick={() => pickCategory(c)} style={{ fontSize: 12.5, padding: "4px 10px", borderRadius: 20, border: `1px solid ${form.category === c ? ICH.primary : ICH.border}`, background: form.category === c ? "#e5f0f3" : "#fff", color: ICH.text, cursor: "pointer" }}>
                    {icon} {c}
                  </button>
                ))}
              </div>
            )}
          </div>
          <StatusNote status={status} onClose={() => setStatus(null)} />
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Button type="submit" busy={busy}>{editingId ? "Save changes" : "Add link"}</Button>
            {dirty && <Button variant="secondary" onClick={reset} disabled={busy}>{editingId ? "Cancel editing" : "Clear form"}</Button>}
          </div>
        </form>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {items.length === 0 ? (
            <EmptyState loading={loading} error={loadError} onRetry={reload}>No links yet.</EmptyState>
          ) : grouped.map(({ cat, icon, links }) => (
            <div key={cat} style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 8 }}>
              <h4 style={listHeadingStyle}>{icon} {cat} ({links.length})</h4>
              {links.map((l, i) => (
                <ItemCard
                  key={l.id}
                  actions={
                    <RowActions
                      onUp={i > 0 ? () => move(links, i, -1) : undefined}
                      onDown={i < links.length - 1 ? () => move(links, i, 1) : undefined}
                      onEdit={() => { setEditingId(l.id); setForm({ category: l.category, categoryIcon: l.categoryIcon, label: l.label, url: l.url, order: l.order }); setStatus(null); }}
                      onDelete={() => remove(l)}
                    />
                  }
                >
                  <div style={{ fontSize: 14.5, fontWeight: 600, color: ICH.text }}>{l.label}</div>
                  <a href={l.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12.5, color: ICH.primary, wordBreak: "break-all" }}>{l.url}</a>
                </ItemCard>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function ResourcesTab() {
  return (
    <div>
      <TabHeader
        icon={<UtensilsCrossed className="h-6 w-6" />}
        title="Resources Page"
        description="Everything on the Resources page: the local halal guide and the list of Islamic learning websites."
        siteHref="/resources"
      />
      <HalalSection />
      <LinksSection />
    </div>
  );
}
