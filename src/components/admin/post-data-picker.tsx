"use client";

import React, { useEffect, useState } from "react";
import type { Announcement, EventItem } from "@/lib/store";
import { ICH } from "../ui-primitives";
import { fmtDate, fmtTime12, nextOccurrence, todayISO } from "./ui";

type Fields = Record<string, string>;
type Jamaat = { fajr: string; dhuhr: string; asr: string; maghrib: string; isha: string; maghribAfterAdhan?: boolean; jummah: { khutbah: string; salah: string }[] };

const KICKERS: Record<string, string> = { jumuah: "Jumuah", eid: "Eid Celebration", halaqa: "Weekly Halaqa", fundraiser: "Fundraiser", construction: "New Masjid Project", community: "Community Event", other: "Event" };

export function eventToFields(e: EventItem): Fields {
  const date = nextOccurrence(e.date, e.recurring);
  return {
    kicker: KICKERS[e.category] || "Community Event",
    title: e.title,
    date: e.recurring ? `Every ${fmtDate(e.date, { weekday: "long" })}` : fmtDate(date, { weekday: "long", month: "long", day: "numeric" }),
    time: e.time ? `${fmtTime12(e.time)}${e.endTime ? ` – ${fmtTime12(e.endTime)}` : ""}` : "",
    location: e.location || "211 N 25th Ave, Hattiesburg",
  };
}

export function announcementToFields(a: Announcement): Fields {
  return { kicker: a.priority === "urgent" ? "Important" : "Announcement", title: a.title, body: a.body.length > 260 ? a.body.slice(0, 257).trimEnd() + "…" : a.body };
}

export function jamaatToFields(j: Jamaat): Fields {
  const jum = j.jummah.map((s) => fmtTime12(s.salah)).join(" & ");
  return {
    title: "Iqama Times",
    date: fmtDate(todayISO(), { weekday: "long", month: "long", day: "numeric" }),
    p1: `Fajr | ${fmtTime12(j.fajr)}`,
    p2: `Dhuhr | ${fmtTime12(j.dhuhr)}`,
    p3: `Asr | ${fmtTime12(j.asr)}`,
    p4: `Maghrib | ${j.maghribAfterAdhan ? "After Adhan" : fmtTime12(j.maghrib)}`,
    p5: `Isha | ${fmtTime12(j.isha)}`,
    p6: jum ? `Jumuah | ${jum}` : "",
  };
}

/** "Fill from the website" controls so admins don't retype data the site already has. */
export default function PostDataPicker({ template, onPick }: { template: string; onPick: (f: Fields) => void }) {
  const [events, setEvents] = useState<EventItem[] | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[] | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (template === "event" && events === null) {
      fetch("/api/admin/events").then((r) => r.json()).then((d) => setEvents((d.events || []).filter((e: EventItem) => e.recurring || e.date >= todayISO()))).catch(() => setErr("Couldn't load events."));
    }
    if (template === "announcement" && announcements === null) {
      fetch("/api/admin/announcements").then((r) => r.json()).then((d) => setAnnouncements(d.announcements || [])).catch(() => setErr("Couldn't load announcements."));
    }
  }, [template, events, announcements]);

  const fillPrayer = async () => {
    setErr("");
    try {
      const d = await fetch("/api/jamaat").then((r) => r.json());
      onPick(jamaatToFields(d.data));
    } catch {
      setErr("Couldn't load prayer times.");
    }
  };

  const box: React.CSSProperties = { background: "#fff", border: `1px solid ${ICH.border}`, borderRadius: 6, padding: 12, display: "flex", flexDirection: "column", gap: 8 };
  const select: React.CSSProperties = { width: "100%", padding: "9px 10px", border: `1px solid ${ICH.border}`, borderRadius: 4, fontSize: 14, background: "#fff" };
  const label: React.CSSProperties = { fontSize: 12.5, fontWeight: 600, color: ICH.primary };

  if (template === "event") {
    return (
      <div style={box}>
        <label style={label} htmlFor="pick-event">Fill from an event on the website</label>
        <select id="pick-event" style={select} value="" onChange={(e) => { const ev = events?.find((x) => x.id === e.target.value); if (ev) onPick(eventToFields(ev)); }}>
          <option value="">{events === null ? "Loading events…" : events.length ? "Choose an event…" : "No upcoming events"}</option>
          {events?.map((e) => <option key={e.id} value={e.id}>{e.title} — {e.recurring ? "weekly" : fmtDate(e.date, { month: "short", day: "numeric" })}</option>)}
        </select>
        {err && <span style={{ color: "#b71c1c", fontSize: 12.5 }}>{err}</span>}
      </div>
    );
  }
  if (template === "announcement") {
    return (
      <div style={box}>
        <label style={label} htmlFor="pick-ann">Fill from an announcement</label>
        <select id="pick-ann" style={select} value="" onChange={(e) => { const a = announcements?.find((x) => x.id === e.target.value); if (a) onPick(announcementToFields(a)); }}>
          <option value="">{announcements === null ? "Loading…" : announcements.length ? "Choose an announcement…" : "No announcements"}</option>
          {announcements?.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}
        </select>
        {err && <span style={{ color: "#b71c1c", fontSize: 12.5 }}>{err}</span>}
      </div>
    );
  }
  if (template === "prayer") {
    return (
      <div style={box}>
        <span style={label}>Use the real iqama times</span>
        <button type="button" onClick={fillPrayer} style={{ padding: "9px 12px", borderRadius: 4, border: `1px solid ${ICH.primary}`, background: "#fff", color: ICH.primary, fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
          Fill in today&apos;s prayer times
        </button>
        {err && <span style={{ color: "#b71c1c", fontSize: 12.5 }}>{err}</span>}
      </div>
    );
  }
  return null;
}
