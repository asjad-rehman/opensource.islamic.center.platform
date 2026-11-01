"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Bell, Calendar, Clock, LayoutDashboard, CheckCircle2 } from "lucide-react";
import type { Announcement, EventItem } from "@/lib/store";
import { ICH } from "../ui-primitives";
import { masjid } from "@/config/masjid";
import { api, TabHeader, panelStyle, fmtTime12, todayISO, nextOccurrence, Badge } from "./ui";
import { adhanToday, dstChange, jamaatWarnings } from "./prayer-tab";
import { announcementStatus } from "./announcements-tab";
import { eventWhen, isPastEvent } from "./events-tab";
import type { TabKey } from "./admin-dashboard";

type Jamaat = { fajr: string; dhuhr: string; asr: string; maghrib: string; isha: string; jummah: { khutbah: string; salah: string }[]; maghribAfterAdhan?: boolean; updatedAt?: string };

export default function OverviewTab({ go }: { go: (t: TabKey) => void }) {
  const [jamaat, setJamaat] = useState<Jamaat | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[] | null>(null);
  const [events, setEvents] = useState<EventItem[] | null>(null);
  const [error, setError] = useState("");
  const adhan = useMemo(() => adhanToday(), []);
  const dst = useMemo(() => dstChange(), []);
  const [now] = useState(() => Date.now());

  useEffect(() => {
    Promise.all([
      api<{ data: Jamaat }>("/api/jamaat").then((d) => setJamaat(d.data)),
      api<{ announcements: Announcement[] }>("/api/admin/announcements").then((d) => setAnnouncements(d.announcements)),
      api<{ events: EventItem[] }>("/api/admin/events").then((d) => setEvents(d.events)),
    ]).catch((e) => setError(e instanceof Error ? e.message : "Couldn't load everything."));
  }, []);

  const today = todayISO();
  const live = (announcements || []).filter((a) => announcementStatus(a, today) === "live");
  const expired = (announcements || []).filter((a) => announcementStatus(a, today) === "expired");
  const upcoming = (events || []).filter((e) => !isPastEvent(e, today));
  const past = (events || []).filter((e) => isPastEvent(e, today));
  const nextEvents = [...upcoming]
    .map((e) => ({ e, when: eventWhen(e), sortKey: nextOccurrence(e.date, e.recurring) }))
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
    .slice(0, 4);

  // Things that need attention.
  const todo: { text: string; tab: TabKey; tone: "warn" | "info" }[] = [];
  if (dst) todo.push({ text: `Daylight saving time ${dst.when === "upcoming" ? "changes" : "changed"} ${dst.date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: masjid.timezone })} — check the iqama times.`, tab: "prayer", tone: "warn" });
  if (jamaat) {
    for (const w of jamaatWarnings(jamaat, adhan)) todo.push({ text: w, tab: "prayer", tone: "warn" });
    const days = jamaat.updatedAt ? Math.floor((now - new Date(jamaat.updatedAt).getTime()) / 86400000) : null;
    if (days !== null && days > 45) todo.push({ text: `Iqama times were last changed ${days} days ago. Adhan times drift through the year — are they still right?`, tab: "prayer", tone: "info" });
  }
  if (expired.length) todo.push({ text: `${expired.length} expired announcement${expired.length > 1 ? "s" : ""} can be deleted.`, tab: "announcements", tone: "info" });
  if (past.length) todo.push({ text: `${past.length} past event${past.length > 1 ? "s are" : " is"} still stored (hidden from the site). Clean up?`, tab: "events", tone: "info" });
  if (events && upcoming.filter((e) => !e.recurring).length === 0) todo.push({ text: "No upcoming one-time events are listed. Anything coming up?", tab: "events", tone: "info" });

  const card: React.CSSProperties = { ...panelStyle, gap: 12 };
  const h: React.CSSProperties = { fontFamily: "Cormorant Garamond,serif", fontSize: 21, fontWeight: 600, color: ICH.text, display: "flex", alignItems: "center", gap: 8 };
  const link = (label: string, tab: TabKey) => (
    <button type="button" onClick={() => go(tab)} style={{ alignSelf: "flex-start", background: "none", border: "none", padding: 0, color: ICH.primary, fontWeight: 600, fontSize: 14, cursor: "pointer" }}>{label} →</button>
  );

  const rows: [string, string, string][] = jamaat ? [
    ["Fajr", adhan.fajr, fmtTime12(jamaat.fajr)],
    ["Dhuhr", adhan.dhuhr, fmtTime12(jamaat.dhuhr)],
    ["Asr", adhan.asr, fmtTime12(jamaat.asr)],
    ["Maghrib", adhan.maghrib, jamaat.maghribAfterAdhan ? "After Adhan" : fmtTime12(jamaat.maghrib)],
    ["Isha", adhan.isha, fmtTime12(jamaat.isha)],
  ] : [];

  return (
    <div>
      <TabHeader icon={<LayoutDashboard className="h-6 w-6" />} title="Overview" description="What's on the website right now, and anything that needs attention." siteHref="/" />
      {error && <div style={{ marginBottom: 16, color: "#b71c1c", fontSize: 14 }}>⚠ {error}</div>}

      <div style={{ ...card, marginBottom: 20, borderColor: todo.some((t) => t.tone === "warn") ? "#f3d9a4" : ICH.border }}>
        <h3 style={h}>{todo.length ? <AlertTriangle className="h-5 w-5" style={{ color: "#b26a00" }} /> : <CheckCircle2 className="h-5 w-5" style={{ color: "#2e7d32" }} />} Needs attention</h3>
        {!jamaat && !error ? <p style={{ color: ICH.textMuted, fontSize: 14 }}>Checking…</p> : todo.length === 0 ? (
          <p style={{ color: ICH.textMuted, fontSize: 14 }}>All good — nothing needs attention right now.</p>
        ) : (
          <ul style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {todo.map((t) => (
              <li key={t.text} style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap", padding: "8px 12px", borderRadius: 6, background: t.tone === "warn" ? "#fff7e6" : ICH.bgCard, fontSize: 14, color: t.tone === "warn" ? "#7a4b00" : ICH.text }}>
                <span style={{ flex: "1 1 260px" }}>{t.text}</span>
                <button type="button" onClick={() => go(t.tab)} style={{ fontSize: 13, fontWeight: 600, padding: "5px 10px", borderRadius: 6, border: `1px solid ${ICH.border}`, background: "#fff", color: ICH.primary, cursor: "pointer" }}>Fix →</button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))", gap: 20 }}>
        <div style={card}>
          <h3 style={h}><Clock className="h-5 w-5" style={{ color: ICH.primary }} /> Today&apos;s prayer times</h3>
          {jamaat ? (
            <table style={{ width: "100%", fontSize: 14, borderCollapse: "collapse" }}>
              <thead><tr style={{ color: ICH.textMuted, fontSize: 12, textAlign: "left" }}><th style={{ padding: "4px 0" }}>Prayer</th><th>Adhan</th><th>Iqama</th></tr></thead>
              <tbody>
                {rows.map(([n, a, iq]) => (
                  <tr key={n} style={{ borderTop: `1px solid ${ICH.border}` }}>
                    <td style={{ padding: "7px 0", fontWeight: 600 }}>{n}</td><td style={{ color: ICH.textMuted }}>{fmtTime12(a)}</td><td style={{ fontWeight: 600, color: ICH.primary }}>{iq}</td>
                  </tr>
                ))}
                {jamaat.jummah.map((j, i) => (
                  <tr key={i} style={{ borderTop: `1px solid ${ICH.border}` }}>
                    <td style={{ padding: "7px 0", fontWeight: 600 }}>Jumuah {jamaat.jummah.length > 1 ? i + 1 : ""}</td><td style={{ color: ICH.textMuted }}>{fmtTime12(j.khutbah)}</td><td style={{ fontWeight: 600, color: ICH.primary }}>{fmtTime12(j.salah)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p style={{ color: ICH.textMuted, fontSize: 14 }}>Loading…</p>}
          {link("Change prayer times", "prayer")}
        </div>

        <div style={card}>
          <h3 style={h}><Bell className="h-5 w-5" style={{ color: ICH.primary }} /> On the website banner</h3>
          {announcements === null ? <p style={{ color: ICH.textMuted, fontSize: 14 }}>Loading…</p> : live.length === 0 ? (
            <p style={{ color: ICH.textMuted, fontSize: 14 }}>No announcements are showing.</p>
          ) : live.slice(0, 2).map((a) => (
            <div key={a.id} style={{ fontSize: 14, borderLeft: `3px solid ${a.priority === "urgent" ? "#c62828" : ICH.primary}`, paddingLeft: 10 }}>
              <strong>{a.title}</strong>{a.expiresOn && <> <Badge tone="gold">until {new Date(a.expiresOn + "T12:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}</Badge></>}
              <div style={{ color: ICH.textMuted, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{a.body}</div>
            </div>
          ))}
          {live.length > 2 && <p style={{ fontSize: 13, color: ICH.textMuted }}>+{live.length - 2} more live but not in the top 2.</p>}
          {link("Manage announcements", "announcements")}
        </div>

        <div style={card}>
          <h3 style={h}><Calendar className="h-5 w-5" style={{ color: ICH.primary }} /> Coming up</h3>
          {events === null ? <p style={{ color: ICH.textMuted, fontSize: 14 }}>Loading…</p> : nextEvents.length === 0 ? (
            <p style={{ color: ICH.textMuted, fontSize: 14 }}>No upcoming events.</p>
          ) : nextEvents.map(({ e, when }) => (
            <div key={e.id} style={{ fontSize: 14 }}>
              <strong>{e.title}</strong> {e.featured && <Badge tone="gold">★</Badge>}
              <div style={{ color: ICH.primary, fontSize: 13 }}>{when}</div>
            </div>
          ))}
          {link("Manage events", "events")}
        </div>
      </div>
    </div>
  );
}

