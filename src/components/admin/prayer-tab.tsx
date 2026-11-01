"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Clock } from "lucide-react";
import { Coordinates, PrayerTimes } from "adhan";
import { masjid } from "@/config/masjid";
import { getPrayerCalculationParameters } from "@/lib/prayer-calculation";
import { hhmmInTZ, todayInMasjidTZ } from "@/lib/time";
import { ICH } from "../ui-primitives";
import { api, useAction, useDirty, TabHeader, Checkbox, Button, StatusNote, fmtTime12, inputStyle, panelStyle, labelStyle, LIVE_NOTE } from "./ui";

const KEYS = ["fajr", "dhuhr", "asr", "maghrib", "isha"] as const;
type Key = typeof KEYS[number];
const NAMES: Record<Key, string> = { fajr: "Fajr", dhuhr: "Dhuhr", asr: "Asr", maghrib: "Maghrib", isha: "Isha" };
type Slot = { khutbah: string; salah: string };
type Jamaat = Record<Key, string> & { jummah: Slot[]; maghribAfterAdhan?: boolean; updatedAt?: string };

/** Today's calculated adhan times (HH:MM, masjid time zone). */
export function adhanToday(date = new Date()): Record<Key, string> & { sunrise: string } {
  const pt = new PrayerTimes(
    new Coordinates(masjid.coordinates.lat, masjid.coordinates.lon),
    todayInMasjidTZ(date, masjid.timezone),
    getPrayerCalculationParameters(),
  );
  const tz = masjid.timezone;
  return { fajr: hhmmInTZ(pt.fajr, tz), sunrise: hhmmInTZ(pt.sunrise, tz), dhuhr: hhmmInTZ(pt.dhuhr, tz), asr: hhmmInTZ(pt.asr, tz), maghrib: hhmmInTZ(pt.maghrib, tz), isha: hhmmInTZ(pt.isha, tz) };
}

function tzOffsetMinutes(d: Date, timeZone: string) {
  const p = new Intl.DateTimeFormat("en-US", { timeZone, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric" }).formatToParts(d);
  const g = (t: string) => Number(p.find((x) => x.type === t)?.value);
  return (Date.UTC(g("year"), g("month") - 1, g("day"), g("hour"), g("minute")) - d.getTime()) / 60000;
}

/** Next daylight-saving change within `days`, or a change in the last `days`. */
export function dstChange(days = 14, now = new Date()): { date: Date; when: "upcoming" | "recent"; forward: boolean } | null {
  const tz = masjid.timezone;
  const base = tzOffsetMinutes(now, tz);
  for (let i = 1; i <= days; i++) {
    const d = new Date(now.getTime() + i * 86400000);
    const off = tzOffsetMinutes(d, tz);
    if (off !== base) return { date: d, when: "upcoming", forward: off > base };
  }
  for (let i = 1; i <= days; i++) {
    const d = new Date(now.getTime() - i * 86400000);
    const off = tzOffsetMinutes(d, tz);
    if (off !== base) return { date: new Date(d.getTime() + 86400000), when: "recent", forward: base > off };
  }
  return null;
}

/** Problems worth flagging to the admin before they save. */
export function jamaatWarnings(j: Jamaat, adhan: ReturnType<typeof adhanToday>) {
  // Compare with tomorrow too: on the eve of a clock change the admin has
  // usually already set the new times, which only look "early" for today.
  const tomorrow = adhanToday(new Date(Date.now() + 86400000));
  const w: string[] = [];
  for (const k of KEYS) {
    if (k === "maghrib" && j.maghribAfterAdhan) continue;
    if (j[k] && j[k] < adhan[k] && j[k] < tomorrow[k]) w.push(`${NAMES[k]} iqama (${fmtTime12(j[k])}) is before today's adhan (${fmtTime12(adhan[k])}).`);
  }
  if (j.fajr && j.fajr >= adhan.sunrise) w.push(`Fajr iqama (${fmtTime12(j.fajr)}) is after sunrise (${fmtTime12(adhan.sunrise)}).`);
  return w;
}

export default function PrayerTab() {
  const [times, setTimes] = useState<Jamaat | null>(null);
  const [original, setOriginal] = useState("");
  const [loadError, setLoadError] = useState("");
  const { busy, status, setStatus, run } = useAction();
  const adhan = useMemo(() => adhanToday(), []);
  const dst = useMemo(() => dstChange(), []);
  const [now] = useState(() => Date.now());

  const load = async () => {
    try {
      const d = await api<{ data: Jamaat }>("/api/jamaat");
      setLoadError("");
      const data = { ...d.data, jummah: d.data.jummah?.length ? d.data.jummah : [{ khutbah: "", salah: "" }] };
      setTimes(data);
      setOriginal(JSON.stringify(data));
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Couldn't load times.");
    }
  };
  // Load after mount; state is only set once the request resolves.
  useEffect(() => { void Promise.resolve().then(load); }, []);

  const dirty = !!times && JSON.stringify(times) !== original;
  useDirty("prayer", dirty);

  if (!times) {
    return (
      <div style={{ ...panelStyle, alignItems: "center", textAlign: "center", color: loadError ? "#b71c1c" : ICH.textMuted }}>
        {loadError ? <>Couldn&apos;t load prayer times: {loadError}<Button variant="secondary" onClick={load}>Try again</Button></> : "Loading prayer times…"}
      </div>
    );
  }

  const set = (patch: Partial<Jamaat>) => setTimes({ ...times, ...patch });
  const setSlot = (i: number, field: keyof Slot, value: string) => set({ jummah: times.jummah.map((s, j) => (j === i ? { ...s, [field]: value } : s)) });
  const warnings = jamaatWarnings(times, adhan);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    await run(async () => {
      const res = await api<{ updatedAt: string }>("/api/jamaat/update", "POST", { data: times });
      const next = { ...times, updatedAt: res.updatedAt };
      setTimes(next);
      setOriginal(JSON.stringify(next));
    }, `Prayer times saved. ${LIVE_NOTE}`, "/prayer-times");
  };

  const updated = times.updatedAt ? new Date(times.updatedAt) : null;
  const daysSince = updated ? Math.floor((now - updated.getTime()) / 86400000) : null;

  return (
    <div>
      <TabHeader
        icon={<Clock className="h-6 w-6" />}
        title="Prayer Times"
        description="Set the iqama (congregation) times. Adhan times are calculated automatically every day — they're shown next to each field so you can check your times."
        siteHref="/prayer-times"
      />

      {dst && (
        <div style={{ marginBottom: 16, padding: "12px 16px", borderRadius: 8, background: "#fff7e6", border: "1px solid #f3d9a4", color: "#7a4b00", fontSize: 14, lineHeight: 1.55 }}>
          🕐 <strong>Daylight saving time {dst.when === "upcoming" ? "changes" : "changed"} on {dst.date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", timeZone: masjid.timezone })}.</strong>{" "}
          Clocks {dst.when === "upcoming" ? "go" : "went"} {dst.forward ? "forward" : "back"} an hour, so adhan times shift too. Review the iqama times below
          {dst.when === "recent" && updated && updated < dst.date ? " — they haven't been updated since the change." : "."}
        </div>
      )}

      <form onSubmit={save} style={panelStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, alignItems: "baseline" }}>
          <h3 style={{ fontFamily: "Cormorant Garamond,serif", fontSize: 21, fontWeight: 600, color: ICH.primary }}>Daily iqama times</h3>
          {updated && (
            <span style={{ fontSize: 13, color: daysSince !== null && daysSince > 60 ? "#8a5a00" : ICH.textMuted }}>
              Last changed {updated.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              {daysSince !== null && daysSince > 0 ? ` (${daysSince} day${daysSince === 1 ? "" : "s"} ago)` : " (today)"}
            </span>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14 }}>
          {KEYS.map((k) => {
            const early = warnings.some((w) => w.startsWith(NAMES[k] + " iqama"));
            const disabled = k === "maghrib" && times.maghribAfterAdhan;
            return (
              <div key={k} style={{ border: `1px solid ${early ? "#f0c48a" : ICH.border}`, borderRadius: 8, padding: 12, background: early ? "#fffaf0" : ICH.bgCard }}>
                <label htmlFor={`iq-${k}`} style={{ ...labelStyle, fontSize: 15 }}>{NAMES[k]}</label>
                <div style={{ fontSize: 12.5, color: ICH.textMuted, marginBottom: 8 }}>Adhan today: <strong>{fmtTime12(adhan[k])}</strong></div>
                {disabled ? (
                  <div style={{ ...inputStyle, display: "flex", alignItems: "center", background: "#f3f5f6", color: ICH.textMuted }}>After Adhan</div>
                ) : (
                  <input id={`iq-${k}`} type="time" required value={times[k]} onChange={(e) => set({ [k]: e.target.value } as Partial<Jamaat>)} style={inputStyle} />
                )}
                {k === "maghrib" && (
                  <div style={{ marginTop: 10 }}>
                    <Checkbox id="maghrib-after" checked={!!times.maghribAfterAdhan} onChange={(v) => set({ maghribAfterAdhan: v })} label="Right after adhan" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <p style={{ fontSize: 12.5, color: ICH.textMuted, marginTop: -6 }}>
          Maghrib is set only here — it shows the same way on the home page, the Prayer Times page and the masjid display screen.
        </p>

        {warnings.length > 0 && (
          <div style={{ padding: "10px 14px", borderRadius: 6, background: "#fff7e6", border: "1px solid #f3d9a4", color: "#7a4b00", fontSize: 13.5, lineHeight: 1.6 }}>
            <strong>Please double-check:</strong>
            <ul style={{ margin: "4px 0 0 18px", listStyle: "disc" }}>{warnings.map((w) => <li key={w}>{w}</li>)}</ul>
          </div>
        )}

        <div style={{ borderTop: `1px solid ${ICH.border}`, paddingTop: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
            <h3 style={{ fontFamily: "Cormorant Garamond,serif", fontSize: 21, fontWeight: 600, color: ICH.primary }}>Jumuah</h3>
            {times.jummah.length < 4 && (
              <Button variant="secondary" onClick={() => set({ jummah: [...times.jummah, { khutbah: "", salah: "" }] })}>+ Add another Jumuah</Button>
            )}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 300px), 1fr))", gap: 14 }}>
            {times.jummah.map((slot, i) => (
              <div key={i} style={{ background: ICH.bgCard, border: `1px solid ${ICH.border}`, borderRadius: 8, padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: ICH.primary }}>{i === 0 ? "1st" : i === 1 ? "2nd" : i === 2 ? "3rd" : "4th"} Jumuah</span>
                  {times.jummah.length > 1 && (
                    <button type="button" onClick={() => set({ jummah: times.jummah.filter((_, j) => j !== i) })} style={{ fontSize: 13, fontWeight: 600, color: "#c62828", background: "#fff", border: "1px solid #f0c9c9", borderRadius: 6, padding: "4px 10px", cursor: "pointer" }}>Remove</button>
                  )}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label htmlFor={`kh-${i}`} style={labelStyle}>Khutbah</label>
                    <input id={`kh-${i}`} type="time" required value={slot.khutbah} onChange={(e) => setSlot(i, "khutbah", e.target.value)} style={inputStyle} />
                  </div>
                  <div>
                    <label htmlFor={`sa-${i}`} style={labelStyle}>Salah</label>
                    <input id={`sa-${i}`} type="time" required value={slot.salah} onChange={(e) => setSlot(i, "salah", e.target.value)} style={inputStyle} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <StatusNote status={status} onClose={() => setStatus(null)} />

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <Button type="submit" busy={busy} disabled={!dirty}>{dirty ? "Save prayer times" : "No changes to save"}</Button>
          {dirty && <Button variant="secondary" onClick={() => setTimes(JSON.parse(original))} disabled={busy}>Undo changes</Button>}
        </div>
      </form>
    </div>
  );
}
