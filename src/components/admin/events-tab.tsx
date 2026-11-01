"use client";

import React, { useState } from "react";
import { Calendar, ImageIcon } from "lucide-react";
import type { EventItem } from "@/lib/store";
import { ICH } from "../ui-primitives";
import {
  api, useAdminList, useAction, useDirty, TabHeader, Field, Checkbox, Button, RowActions, ItemCard, Badge,
  EmptyState, StatusNote, SmallLinkButton, confirmDelete, fmtDate, fmtTime12, nextOccurrence, todayISO,
  inputStyle, panelStyle, listHeadingStyle, twoColGrid, LIVE_NOTE,
} from "./ui";

const CATEGORIES: [string, string][] = [
  ["community", "Community"], ["jumuah", "Jumuah"], ["eid", "Eid"], ["halaqa", "Halaqa / class"],
  ["fundraiser", "Fundraiser"], ["construction", "New masjid / construction"], ["other", "Other"],
];
const categoryLabel = (c: string) => CATEGORIES.find(([v]) => v === c)?.[1] ?? c;

type Form = { title: string; description: string; date: string; time: string; endTime: string; location: string; category: string; recurring: boolean; featured: boolean };
const EMPTY: Form = { title: "", description: "", date: "", time: "", endTime: "", location: "", category: "community", recurring: false, featured: false };

export function eventWhen(e: Pick<EventItem, "date" | "time" | "endTime" | "recurring">) {
  const date = nextOccurrence(e.date, e.recurring);
  const day = e.recurring
    ? `Every ${fmtDate(e.date, { weekday: "long" })} · next ${fmtDate(date, { month: "short", day: "numeric" })}`
    : fmtDate(date);
  const time = e.time ? ` · ${fmtTime12(e.time)}${e.endTime ? `–${fmtTime12(e.endTime)}` : ""}` : "";
  return day + time;
}

export function isPastEvent(e: EventItem, today = todayISO()) {
  return !e.recurring && e.date < today;
}

export default function EventsTab() {
  const { items, setItems, loading, loadError, reload } = useAdminList<EventItem>("/api/admin/events", "events");
  const [form, setForm] = useState<Form>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showPast, setShowPast] = useState(false);
  const { busy, status, setStatus, run } = useAction();

  const dirty = editingId !== null || form.title !== "" || form.description !== "";
  useDirty("events", dirty);

  const reset = () => { setForm(EMPTY); setEditingId(null); };
  const sortByDate = (list: EventItem[]) => [...list].sort((a, b) => a.date.localeCompare(b.date));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.endTime && form.time && form.endTime <= form.time) {
      setStatus({ kind: "error", text: "End time must be after the start time." });
      return;
    }
    const isEdit = !!editingId;
    await run(async () => {
      const data = await api<{ event: EventItem }>("/api/admin/events", isEdit ? "PUT" : "POST", isEdit ? { id: editingId, ...form } : form);
      setItems((prev) => sortByDate(isEdit ? prev.map((x) => (x.id === editingId ? data.event : x)) : [...prev, data.event]));
      reset();
    }, `${isEdit ? "Event updated" : "Event added"}. ${LIVE_NOTE}`, "/events");
  };

  const edit = (ev: EventItem) => {
    setEditingId(ev.id);
    setForm({
      title: ev.title, description: ev.description, date: ev.date, time: ev.time || "", endTime: ev.endTime || "",
      location: ev.location || "", category: ev.category || "community", recurring: !!ev.recurring, featured: !!ev.featured,
    });
    setStatus(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const remove = async (ev: EventItem) => {
    if (!confirmDelete(`“${ev.title}”`)) return;
    await run(async () => {
      await api(`/api/admin/events?id=${encodeURIComponent(ev.id)}`, "DELETE");
      setItems((prev) => prev.filter((x) => x.id !== ev.id));
      if (editingId === ev.id) reset();
    }, "Event deleted.");
  };

  const toggleFeatured = async (ev: EventItem) => {
    await run(async () => {
      const data = await api<{ event: EventItem }>("/api/admin/events", "PUT", { id: ev.id, featured: !ev.featured });
      setItems((prev) => prev.map((x) => (x.id === ev.id ? data.event : x)));
    }, ev.featured ? "Removed from Featured." : `Added to Featured. ${LIVE_NOTE}`);
  };

  const today = todayISO();
  const upcoming = items
    .filter((e) => !isPastEvent(e, today))
    .sort((a, b) => nextOccurrence(a.date, a.recurring).localeCompare(nextOccurrence(b.date, b.recurring)));
  const past = items.filter((e) => isPastEvent(e, today)).sort((a, b) => b.date.localeCompare(a.date));

  const deleteAllPast = async () => {
    if (!window.confirm(`Delete all ${past.length} past events?\n\nThey're already hidden from the website. This can't be undone.`)) return;
    await run(async () => {
      for (const ev of past) await api(`/api/admin/events?id=${encodeURIComponent(ev.id)}`, "DELETE");
      setItems((prev) => prev.filter((x) => !isPastEvent(x, today)));
    }, "Past events cleared.");
  };

  const card = (ev: EventItem) => (
    <ItemCard
      key={ev.id}
      dim={isPastEvent(ev, today)}
      actions={
        <RowActions
          onEdit={() => edit(ev)}
          onDelete={() => remove(ev)}
          extra={
            <>
              {!isPastEvent(ev, today) && (
                <button type="button" onClick={() => toggleFeatured(ev)} style={{ minHeight: 34, padding: "5px 10px", borderRadius: 6, fontSize: 13, fontWeight: 600, border: `1px solid ${ICH.border}`, background: "#fff", color: ev.featured ? "#8a5a00" : ICH.textMuted, cursor: "pointer" }}>
                  {ev.featured ? "★ Featured" : "☆ Feature"}
                </button>
              )}
              <SmallLinkButton href={`/admin/post-designer?event=${encodeURIComponent(ev.id)}`}><ImageIcon className="h-4 w-4" /> Make post</SmallLinkButton>
            </>
          }
        />
      }
    >
      <div style={{ marginBottom: 6 }}>
        {ev.featured && !isPastEvent(ev, today) && <Badge tone="gold">★ Featured</Badge>}
        {ev.recurring && <Badge tone="blue">Weekly</Badge>}
        <Badge>{categoryLabel(ev.category)}</Badge>
      </div>
      <h4 style={{ fontFamily: "Cormorant Garamond,serif", fontSize: 19, fontWeight: 600, color: ICH.text }}>{ev.title}</h4>
      <div style={{ fontSize: 13.5, color: ICH.primary, fontWeight: 600, margin: "3px 0 4px" }}>{eventWhen(ev)}</div>
      {ev.location && <div style={{ fontSize: 13, color: ICH.textMuted }}>📍 {ev.location}</div>}
      <p style={{ fontSize: 14, color: ICH.textMuted, lineHeight: 1.55, marginTop: 4, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{ev.description}</p>
    </ItemCard>
  );

  return (
    <div>
      <TabHeader
        icon={<Calendar className="h-6 w-6" />}
        title="Events"
        description="Events appear on the Events page. Featured events are shown at the top. Past one-time events are hidden from the website automatically."
        siteHref="/events"
      />

      <div style={twoColGrid}>
        <form onSubmit={save} style={panelStyle}>
          <h3 style={{ fontFamily: "Cormorant Garamond,serif", fontSize: 21, fontWeight: 600, color: ICH.primary }}>{editingId ? "Edit event" : "Add an event"}</h3>

          <Field label="Event name" htmlFor="ev-title">
            <input id="ev-title" type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required maxLength={160} style={inputStyle} placeholder="e.g. Community Iftar" />
          </Field>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 14 }}>
            <Field label={form.recurring ? "First date" : "Date"} htmlFor="ev-date">
              <input id="ev-date" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required style={inputStyle} />
            </Field>
            <Field label="Type" htmlFor="ev-cat">
              <select id="ev-cat" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} style={inputStyle}>
                {CATEGORIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Field>
            <Field label="Starts (optional)" htmlFor="ev-time">
              <input id="ev-time" type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} style={inputStyle} />
            </Field>
            <Field label="Ends (optional)" htmlFor="ev-end">
              <input id="ev-end" type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} style={inputStyle} disabled={!form.time} />
            </Field>
          </div>

          <Checkbox
            id="ev-recurring"
            checked={form.recurring}
            onChange={(v) => setForm({ ...form, recurring: v })}
            label="Repeats every week"
            hint={form.recurring && form.date ? `Shown as “Every ${fmtDate(form.date, { weekday: "long" })}” with the next date — no need to write “recurring” in the description.` : "The website shows the next upcoming date automatically."}
          />
          <Checkbox id="ev-featured" checked={form.featured} onChange={(v) => setForm({ ...form, featured: v })} label="Feature this event" hint="Featured events are highlighted at the top of the Events page." />

          <Field label="Location (optional)" htmlFor="ev-loc">
            <input id="ev-loc" type="text" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} maxLength={200} style={inputStyle} placeholder="ICH Main Hall" />
          </Field>

          <Field label="Description" htmlFor="ev-desc">
            <textarea id="ev-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} required maxLength={4000} style={{ ...inputStyle, resize: "vertical" }} placeholder="What's happening, who it's for, what to bring…" />
          </Field>

          {form.date && <div style={{ fontSize: 13.5, color: ICH.primary, fontWeight: 600 }}>Will show as: {eventWhen(form)}</div>}

          <StatusNote status={status} onClose={() => setStatus(null)} />

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Button type="submit" busy={busy}>{editingId ? "Save changes" : "Add event"}</Button>
            {dirty && <Button variant="secondary" onClick={reset} disabled={busy}>{editingId ? "Cancel editing" : "Clear form"}</Button>}
          </div>
        </form>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <h3 style={listHeadingStyle}>Upcoming & weekly ({upcoming.length})</h3>
          {upcoming.length === 0 ? (
            <EmptyState loading={loading} error={loadError} onRetry={reload}>No upcoming events. Add one with the form.</EmptyState>
          ) : upcoming.map(card)}

          {past.length > 0 && (
            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <h3 style={listHeadingStyle}>Past events ({past.length}) — hidden from website</h3>
                <div style={{ display: "flex", gap: 8 }}>
                  <Button variant="ghost" onClick={() => setShowPast((s) => !s)}>{showPast ? "Hide" : "Show"}</Button>
                  <Button variant="danger" onClick={deleteAllPast} disabled={busy}>Delete all past</Button>
                </div>
              </div>
              {showPast && past.map(card)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
