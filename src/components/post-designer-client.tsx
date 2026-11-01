"use client";

import React, { useEffect, useRef, useState } from "react";
import PostDataPicker, { eventToFields, announcementToFields } from "./admin/post-data-picker";
import Link from "next/link";
import { toBlob } from "html-to-image";
import { ArrowLeft } from "lucide-react";
import { ICH, GoldLabel } from "./ui-primitives";

// Fonts: the site registers Cormorant/Inter through next/font (see layout) and the
// Arabic "Madina" face in globals.css. We reference the same families the rest of
// the site uses so exports match what's on screen.
const F_SERIF = "Cormorant Garamond, serif";
const F_SANS = "Inter, sans-serif";
const F_ARABIC = '"Madina", serif';

// ── Formats ───────────────────────────────────────────────────────────────────
type FormatKey = "square" | "portrait" | "story";

const IG_FORMATS: Record<FormatKey, { w: number; h: number; label: string; sub: string; ratio: string }> = {
  square: { w: 1080, h: 1080, label: "Square", sub: "1080 × 1080", ratio: "1:1" },
  portrait: { w: 1080, h: 1350, label: "Portrait", sub: "1080 × 1350", ratio: "4:5" },
  story: { w: 1080, h: 1920, label: "Story", sub: "1080 × 1920", ratio: "9:16" },
};

// ── Aesthetic themes ──────────────────────────────────────────────────────────
const STAR =
  "%3Csvg width='120' height='120' viewBox='0 0 120 120' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%23c8a96e' stroke-opacity='.5' stroke-width='1.4'%3E%3Crect x='34' y='34' width='52' height='52' transform='rotate(0 60 60)'/%3E%3Crect x='34' y='34' width='52' height='52' transform='rotate(45 60 60)'/%3E%3C/g%3E%3C/svg%3E";

interface PostTheme {
  label: string;
  swatch: [string, string];
  bg: string;
  ink: string;
  sub: string;
  accent: string;
  frame: string;
  patOpacity: number;
  logoInvert: boolean;
}

type ThemeKey = "andalusian" | "emerald" | "midnight" | "cream";

const IG_THEMES: Record<ThemeKey, PostTheme> = {
  andalusian: {
    label: "Andalusian",
    swatch: ["#3f2318", "#c8a96e"],
    bg: "linear-gradient(160deg,#4a2a1c 0%,#2f1810 55%,#20100a 100%)",
    ink: "#fbf4e8",
    sub: "rgba(251,244,232,.74)",
    accent: "#d9be8a",
    frame: "rgba(217,190,138,.55)",
    patOpacity: 0.5,
    logoInvert: true,
  },
  emerald: {
    label: "Emerald",
    swatch: ["#0d3a2c", "#c8a96e"],
    bg: "linear-gradient(160deg,#125140 0%,#0d3a2c 55%,#07231b 100%)",
    ink: "#f2f9f4",
    sub: "rgba(242,249,244,.74)",
    accent: "#d9be8a",
    frame: "rgba(217,190,138,.5)",
    patOpacity: 0.45,
    logoInvert: true,
  },
  midnight: {
    label: "Midnight",
    swatch: ["#10152e", "#c8a96e"],
    bg: "linear-gradient(160deg,#1c2450 0%,#10152e 55%,#080b1c 100%)",
    ink: "#f4f2ff",
    sub: "rgba(244,242,255,.72)",
    accent: "#d9be8a",
    frame: "rgba(217,190,138,.5)",
    patOpacity: 0.4,
    logoInvert: true,
  },
  cream: {
    label: "Cream",
    swatch: ["#faf4e8", "#6d4c41"],
    bg: "linear-gradient(160deg,#fbf7ef 0%,#f4ece0 100%)",
    ink: "#2a1a12",
    sub: "#6b5a4a",
    accent: "#9a7a3e",
    frame: "rgba(154,122,62,.5)",
    patOpacity: 0.5,
    logoInvert: false,
  },
};

// ── Ornaments ─────────────────────────────────────────────────────────────────
function IgStar({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" style={{ display: "block" }}>
      <g stroke={color} strokeWidth="2.4" fill="none">
        <rect x="26" y="26" width="48" height="48" transform="rotate(0 50 50)" />
        <rect x="26" y="26" width="48" height="48" transform="rotate(45 50 50)" />
        <circle cx="50" cy="50" r="6" fill={color} stroke="none" />
      </g>
    </svg>
  );
}

function IgRule({ color, w = 180 }: { color: string; w?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16 }}>
      <span style={{ height: 2, width: w, background: `linear-gradient(90deg,transparent,${color})` }} />
      <span style={{ width: 8, height: 8, background: color, transform: "rotate(45deg)", flexShrink: 0 }} />
      <span style={{ height: 2, width: w, background: `linear-gradient(90deg,${color},transparent)` }} />
    </div>
  );
}

// ── Template layouts ──────────────────────────────────────────────────────────
type Fields = Record<string, string>;

interface Template {
  label: string;
  fields: string[];
  render: (f: Fields, t: PostTheme) => React.ReactNode;
}

const IG_TEMPLATES: Record<string, Template> = {
  event: {
    label: "Event",
    fields: ["kicker", "title", "date", "time", "location"],
    render: (f, t) => (
      <>
        <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: ".28em", textTransform: "uppercase", color: t.accent, fontFamily: F_SANS }}>{f.kicker}</div>
        <IgRule color={t.accent} />
        <h1 style={{ fontFamily: F_SERIF, fontWeight: 600, fontSize: 92, lineHeight: 1.05, color: t.ink, margin: "8px 0", textWrap: "balance" }}>{f.title}</h1>
        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 14 }}>
          {f.date && <div style={{ fontSize: 40, fontFamily: F_SERIF, color: t.ink }}>{f.date}</div>}
          {f.time && <div style={{ fontSize: 34, color: t.sub, fontFamily: F_SANS, fontWeight: 400 }}>{f.time}</div>}
          {f.location && <div style={{ fontSize: 28, color: t.sub, fontFamily: F_SANS, letterSpacing: ".02em" }}>📍 {f.location}</div>}
        </div>
      </>
    ),
  },
  verse: {
    label: "Quran Verse",
    fields: ["arabic", "translation", "reference"],
    render: (f, t) => (
      <>
        <div style={{ fontSize: 78, lineHeight: 1.7, color: t.accent, direction: "rtl", fontFamily: F_ARABIC, textWrap: "balance" }}>{f.arabic}</div>
        <IgRule color={t.accent} w={130} />
        <p style={{ fontFamily: F_SERIF, fontStyle: "italic", fontSize: 52, lineHeight: 1.35, color: t.ink, margin: "6px 0", textWrap: "balance" }}>“{f.translation}”</p>
        <div style={{ fontSize: 28, letterSpacing: ".18em", textTransform: "uppercase", color: t.sub, fontFamily: F_SANS, fontWeight: 500 }}>{f.reference}</div>
      </>
    ),
  },
  prayer: {
    label: "Prayer Times",
    fields: ["title", "date", "p1", "p2", "p3", "p4", "p5", "p6"],
    render: (f, t) => (
      <>
        <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: ".26em", textTransform: "uppercase", color: t.accent, fontFamily: F_SANS }}>{f.date}</div>
        <h1 style={{ fontFamily: F_SERIF, fontWeight: 600, fontSize: 78, color: t.ink, margin: "4px 0 6px" }}>{f.title}</h1>
        <IgRule color={t.accent} />
        <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%", marginTop: 18 }}>
          {["p1", "p2", "p3", "p4", "p5", "p6"].map((k) => {
            const [name, time] = (f[k] || "").split("|").map((x) => (x || "").trim());
            if (!name && !time) return null;
            return (
              <div key={k} style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", padding: "14px 8px", borderBottom: `1.5px solid ${t.frame}` }}>
                <span style={{ fontFamily: F_SERIF, fontSize: 46, color: t.ink }}>{name}</span>
                <span style={{ flex: 1, margin: "0 22px", borderBottom: `2px dotted ${t.frame}`, transform: "translateY(-8px)" }} />
                <span style={{ fontFamily: F_SANS, fontSize: 40, fontWeight: 500, color: t.accent, whiteSpace: "nowrap" }}>{time}</span>
              </div>
            );
          })}
        </div>
      </>
    ),
  },
  greeting: {
    label: "Greeting",
    fields: ["arabic", "title", "subtitle"],
    render: (f, t) => (
      <>
        <div style={{ marginBottom: 6 }}>
          <IgStar size={92} color={t.accent} />
        </div>
        <div style={{ fontSize: 64, color: t.accent, direction: "rtl", fontFamily: F_ARABIC, lineHeight: 1.6 }}>{f.arabic}</div>
        <h1 style={{ fontFamily: F_SERIF, fontWeight: 600, fontSize: 110, lineHeight: 1.05, color: t.ink, margin: "10px 0", textWrap: "balance" }}>{f.title}</h1>
        <IgRule color={t.accent} />
        <p style={{ fontSize: 36, color: t.sub, fontFamily: F_SANS, lineHeight: 1.5, maxWidth: 820, textWrap: "balance" }}>{f.subtitle}</p>
      </>
    ),
  },
  announcement: {
    label: "Announcement",
    fields: ["kicker", "title", "body", "cta"],
    render: (f, t) => (
      <>
        <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: ".26em", textTransform: "uppercase", color: t.accent, fontFamily: F_SANS }}>{f.kicker}</div>
        <IgRule color={t.accent} />
        <h1 style={{ fontFamily: F_SERIF, fontWeight: 600, fontSize: 88, lineHeight: 1.06, color: t.ink, margin: "8px 0", textWrap: "balance" }}>{f.title}</h1>
        <p style={{ fontSize: 38, color: t.sub, fontFamily: F_SANS, lineHeight: 1.55, maxWidth: 840, textWrap: "balance" }}>{f.body}</p>
        {f.cta && (
          <div style={{ marginTop: 20, display: "inline-block", padding: "20px 44px", background: t.accent, color: t.label === "Cream" ? "#fff" : "#2a1a12", fontFamily: F_SANS, fontWeight: 700, fontSize: 34, borderRadius: 6, alignSelf: "center" }}>
            {f.cta}
          </div>
        )}
      </>
    ),
  },
};

// ── Default field content per template ─────────────────────────────────────────
const IG_DEFAULTS: Record<string, Fields> = {
  event: { kicker: "Community Event", title: "Weekly Halaqa", date: "Friday · Ramadan 12", time: "After Isha — 8:30 PM", location: "211 N 25th Ave, Hattiesburg" },
  verse: { arabic: "إِنَّ مَعَ ٱلْعُسْرِ يُسْرًا", translation: "Indeed, with hardship comes ease.", reference: "Quran 94:6" },
  prayer: { title: "Prayer Times", date: "Ramadan 12 · March 22", p1: "Fajr | 5:32 AM", p2: "Dhuhr | 1:15 PM", p3: "Asr | 4:45 PM", p4: "Maghrib | After Adhan", p5: "Isha | 8:30 PM", p6: "Jumuah | 12:15 & 1:15 PM" },
  greeting: { arabic: "رَمَضَان مُبَارَك", title: "Ramadan Mubarak", subtitle: "May this blessed month bring peace, mercy, and countless blessings to you and your family." },
  announcement: { kicker: "Announcement", title: "Community Iftar", body: "Join us every Saturday for a shared iftar. All are welcome — bring your family and friends.", cta: "RSVP at ichattiesburg.org" },
};

// ── The rendered post canvas (natural size = design px) ─────────────────────────
function IgCanvas({
  format,
  theme,
  template,
  fields,
  innerRef,
}: {
  format: FormatKey;
  theme: ThemeKey;
  template: string;
  fields: Fields;
  innerRef: React.Ref<HTMLDivElement>;
}) {
  const dim = IG_FORMATS[format];
  const t = IG_THEMES[theme];
  const tpl = IG_TEMPLATES[template];
  const pad = format === "story" ? 120 : 96;
  return (
    <div
      ref={innerRef}
      style={{
        width: dim.w,
        height: dim.h,
        position: "relative",
        overflow: "hidden",
        background: t.bg,
        color: t.ink,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* pattern */}
      <div style={{ position: "absolute", inset: 0, backgroundImage: `url("data:image/svg+xml,${STAR}")`, backgroundSize: "120px 120px", opacity: t.patOpacity * 0.35, pointerEvents: "none" }} />
      {/* frame */}
      <div style={{ position: "absolute", inset: pad * 0.5, border: `3px solid ${t.frame}`, pointerEvents: "none" }} />
      <div style={{ position: "absolute", inset: pad * 0.5 + 14, border: `1px solid ${t.frame}`, opacity: 0.55, pointerEvents: "none" }} />
      {/* content */}
      <div style={{ position: "relative", flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", gap: 22, padding: `${pad + 40}px ${pad + 24}px ${pad + 8}px` }}>
        {tpl.render(fields, t)}
      </div>
      {/* footer / brand */}
      <div style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 16, paddingBottom: pad + 10 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/uploads/logo.png" alt="ICH" crossOrigin="anonymous" style={{ height: format === "story" ? 96 : 80, filter: t.logoInvert ? "brightness(0) invert(1)" : "none", opacity: 0.95 }} />
        <div style={{ fontSize: 24, letterSpacing: ".22em", textTransform: "uppercase", color: t.sub, fontFamily: F_SANS, fontWeight: 500 }}>Islamic Center of Hattiesburg</div>
      </div>
    </div>
  );
}

// ── Small control primitives ────────────────────────────────────────────────────
function IgField({ label, value, onChange, textarea }: { label: string; value: string; onChange: (v: string) => void; textarea?: boolean }) {
  const base: React.CSSProperties = { width: "100%", padding: "10px 13px", border: `1px solid ${ICH.border}`, borderRadius: 5, fontSize: 13.5, fontFamily: F_SANS, color: ICH.text, background: "#fff", resize: "vertical" };
  return (
    <div>
      <label style={{ display: "block", fontSize: 10.5, fontWeight: 700, letterSpacing: ".09em", textTransform: "uppercase", color: ICH.textMuted, fontFamily: F_SANS, marginBottom: 5 }}>{label}</label>
      {textarea ? <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} style={base} /> : <input value={value} onChange={(e) => onChange(e.target.value)} style={base} />}
    </div>
  );
}

// ── Quran verse picker (alquran.cloud) ──────────────────────────────────────────
// Lets an editor pick a surah + ayah and pull the Arabic + an English translation
// straight from the Quran API, instead of typing the verse in by hand. The public
// alquran.cloud API is CORS-enabled, so this runs entirely client-side.
const QURAN_API = "https://api.alquran.cloud/v1";

// Translation editions offered in the dropdown (identifier → display name).
const QURAN_TRANSLATIONS: { id: string; label: string }[] = [
  { id: "en.sahih", label: "Sahih International" },
  { id: "en.pickthall", label: "Pickthall" },
  { id: "en.yusufali", label: "Yusuf Ali" },
  { id: "en.asad", label: "Muhammad Asad" },
];

interface Surah {
  number: number;
  englishName: string;
  numberOfAyahs: number;
}

function QuranPicker({ onPick }: { onPick: (v: { arabic: string; translation: string; reference: string }) => void }) {
  const [surahs, setSurahs] = useState<Surah[]>([]);
  const [surah, setSurah] = useState(94); // Ash-Sharh, matches the default content
  const [ayah, setAyah] = useState(6);
  const [edition, setEdition] = useState("en.sahih");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // Load the list of surahs once, so we can show names and cap the ayah number.
  React.useEffect(() => {
    let alive = true;
    fetch(`${QURAN_API}/surah`)
      .then((r) => r.json())
      .then((j) => {
        if (alive && j?.data) setSurahs(j.data as Surah[]);
      })
      .catch(() => {
        if (alive) setErr("Couldn't load the surah list — check your connection.");
      });
    return () => {
      alive = false;
    };
  }, []);

  const current = surahs.find((s) => s.number === surah);
  const maxAyah = current?.numberOfAyahs ?? 286;
  const safeAyah = Math.min(Math.max(1, ayah), maxAyah);

  const fetchVerse = async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await fetch(`${QURAN_API}/ayah/${surah}:${safeAyah}/editions/quran-uthmani,${edition}`);
      const json = await res.json();
      const data = json?.data as Array<{ text: string; numberInSurah: number; surah: { englishName: string } }> | undefined;
      if (!data || data.length < 2) throw new Error("bad response");
      const arabic = data[0].text;
      const translation = data[1].text;
      const name = data[0].surah?.englishName ?? current?.englishName ?? "";
      onPick({
        arabic,
        translation,
        reference: `Quran ${surah}:${safeAyah}${name ? ` · ${name}` : ""}`,
      });
    } catch {
      setErr("Couldn't fetch that verse — please try again.");
    } finally {
      setLoading(false);
    }
  };

  const ctrl: React.CSSProperties = {
    padding: "9px 11px",
    border: `1px solid ${ICH.border}`,
    borderRadius: 5,
    fontSize: 13,
    fontFamily: F_SANS,
    color: ICH.text,
    background: "#fff",
    width: "100%",
  };
  const lbl: React.CSSProperties = { display: "block", fontSize: 10.5, fontWeight: 700, letterSpacing: ".09em", textTransform: "uppercase", color: ICH.textMuted, fontFamily: F_SANS, marginBottom: 5 };

  return (
    <div style={{ border: `1px solid ${ICH.border}`, borderRadius: 6, padding: 14, background: "#fff", marginBottom: 4 }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: ICH.gold, fontFamily: F_SANS, marginBottom: 4 }}>
        Look up a verse
      </div>
      <p style={{ fontSize: 12, color: ICH.textMuted, fontFamily: F_SANS, lineHeight: 1.5, margin: "0 0 12px" }}>
        Pick a surah and ayah to auto-fill the Arabic and translation from the Quran API.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10, marginBottom: 10 }}>
        <div>
          <label style={lbl}>Surah</label>
          <select value={surah} onChange={(e) => setSurah(Number(e.target.value))} style={ctrl}>
            {surahs.length === 0 && <option value={surah}>Loading…</option>}
            {surahs.map((s) => (
              <option key={s.number} value={s.number}>
                {s.number}. {s.englishName}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={lbl}>Ayah</label>
          <input
            type="number"
            min={1}
            max={maxAyah}
            value={ayah}
            onChange={(e) => setAyah(Number(e.target.value))}
            style={ctrl}
          />
        </div>
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={lbl}>Translation</label>
        <select value={edition} onChange={(e) => setEdition(e.target.value)} style={ctrl}>
          {QURAN_TRANSLATIONS.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </div>
      <button
        onClick={fetchVerse}
        disabled={loading}
        style={{
          width: "100%",
          padding: "11px",
          background: loading ? ICH.textMuted : ICH.primary,
          color: "#fff",
          border: "none",
          borderRadius: 5,
          cursor: loading ? "default" : "pointer",
          fontFamily: F_SANS,
          fontSize: 13.5,
          fontWeight: 600,
        }}
      >
        {loading ? "Fetching…" : "Auto-fill verse"}
      </button>
      {err && <div style={{ fontSize: 12, color: "#b3261e", fontFamily: F_SANS, marginTop: 8 }}>{err}</div>}
    </div>
  );
}

const IG_FIELD_LABELS: Record<string, string> = {
  kicker: "Kicker / Label",
  title: "Title",
  date: "Date",
  time: "Time",
  location: "Location",
  arabic: "Arabic Text",
  translation: "Translation",
  reference: "Reference",
  subtitle: "Subtitle",
  body: "Body Text",
  cta: "Call to Action",
  p1: "Line 1  (Name | Time)",
  p2: "Line 2  (Name | Time)",
  p3: "Line 3  (Name | Time)",
  p4: "Line 4  (Name | Time)",
  p5: "Line 5  (Name | Time)",
  p6: "Line 6  (Name | Time)",
};

// ── Main page ───────────────────────────────────────────────────────────────────
export default function PostDesignerClient() {
  const [format, setFormat] = useState<FormatKey>("portrait");
  const [theme, setTheme] = useState<ThemeKey>("andalusian");
  const [template, setTemplate] = useState<string>("event");
  const [allFields, setAllFields] = useState<Record<string, Fields>>(() => JSON.parse(JSON.stringify(IG_DEFAULTS)));
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const nodeRef = useRef<HTMLDivElement>(null);

  const fields = allFields[template];
  const setField = (k: string, v: string) => setAllFields((a) => ({ ...a, [template]: { ...a[template], [k]: v } }));
  const mergeFields = (patch: Fields) => setAllFields((a) => ({ ...a, [template]: { ...a[template], ...patch } }));
  // Arriving from "Make post" on an event or announcement: pre-fill from it.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const eventId = q.get("event");
    const annId = q.get("announcement");
    if (eventId) {
      fetch("/api/admin/events").then((r) => r.json()).then((d) => {
        const ev = (d.events || []).find((x: { id: string }) => x.id === eventId);
        if (!ev) return;
        setTemplate("event");
        setAllFields((a) => ({ ...a, event: { ...a.event, ...eventToFields(ev) } }));
      }).catch(() => {});
    } else if (annId) {
      fetch("/api/admin/announcements").then((r) => r.json()).then((d) => {
        const an = (d.announcements || []).find((x: { id: string }) => x.id === annId);
        if (!an) return;
        setTemplate("announcement");
        setAllFields((a) => ({ ...a, announcement: { ...a.announcement, ...announcementToFields(an) } }));
      }).catch(() => {});
    }
  }, []);
  const resetTpl = () => setAllFields((a) => ({ ...a, [template]: JSON.parse(JSON.stringify(IG_DEFAULTS[template])) }));

  const dim = IG_FORMATS[format];
  const scale = Math.min(430 / dim.w, 620 / dim.h);

  const download = async () => {
    if (!nodeRef.current) {
      setNote("Preview not ready — try again in a moment.");
      return;
    }
    setBusy(true);
    setNote("");
    try {
      // Render to a Blob (not a data URL). Mobile browsers — iOS Safari in
      // particular — ignore the anchor `download` attribute on giant data URLs,
      // which is why phones never got the file. A blob URL, and the Web Share
      // sheet where available, both work on mobile.
      const blob = await toBlob(nodeRef.current, { width: dim.w, height: dim.h, pixelRatio: 1, cacheBust: true, backgroundColor: "#fff" });
      if (!blob) throw new Error("render produced no image");
      const fileName = `ich-${template}-${format}-${dim.w}x${dim.h}.png`;

      // Prefer the native share sheet on phones — it lets the user save the
      // image straight to Photos / Files, which a download link cannot do on iOS.
      const file = new File([blob], fileName, { type: "image/png" });
      const nav = navigator as Navigator & {
        canShare?: (d: { files: File[] }) => boolean;
        share?: (d: { files: File[]; title?: string }) => Promise<void>;
      };
      if (typeof nav.canShare === "function" && typeof nav.share === "function" && nav.canShare({ files: [file] })) {
        try {
          await nav.share({ files: [file], title: fileName });
          setNote("Shared — choose “Save Image” to keep it.");
          return;
        } catch (err) {
          // User dismissed the sheet — treat as a no-op rather than an error.
          if (err instanceof Error && err.name === "AbortError") {
            setNote("");
            return;
          }
          // Any other failure falls through to the blob-download path below.
        }
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.download = fileName;
      a.href = url;
      a.rel = "noopener";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      setNote(`Downloaded ${dim.w} × ${dim.h} PNG`);
    } catch {
      setNote("Export failed — please retry.");
    } finally {
      setBusy(false);
    }
  };

  const panel: React.CSSProperties = { background: ICH.bgCard, border: `1px solid ${ICH.border}`, borderRadius: 8, padding: 20 };
  const secLabel: React.CSSProperties = { fontSize: 10.5, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: ICH.gold, fontFamily: F_SANS, marginBottom: 12 };

  return (
    <div className="page-enter" style={{ maxWidth: 1200, margin: "0 auto", padding: "44px 24px 80px" }}>
      <div style={{ marginBottom: 34 }}>
        <Link
          href="/admin"
          style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: ICH.textMuted, fontFamily: F_SANS, textDecoration: "none", marginBottom: 16 }}
          onMouseEnter={(e) => (e.currentTarget.style.color = ICH.primary)}
          onMouseLeave={(e) => (e.currentTarget.style.color = ICH.textMuted)}
        >
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Link>
        <GoldLabel>Media Studio</GoldLabel>
        <h1 style={{ fontFamily: F_SERIF, fontSize: "clamp(30px,5vw,50px)", fontWeight: 600, marginBottom: 8 }}>Post Designer</h1>
        <p style={{ fontSize: 15, color: ICH.textMuted, lineHeight: 1.7, maxWidth: 640 }}>
          Create on-brand social posts for the community feed. Pick a template and aesthetic, edit the text, then export a ready-to-post image in your chosen dimensions.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,480px)", gap: 28, alignItems: "start" }} className="ig-grid">
        {/* ── Controls ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {/* Template */}
          <div style={panel}>
            <div style={secLabel}>Template</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 8 }}>
              {Object.entries(IG_TEMPLATES).map(([k, v]) => (
                <button
                  key={k}
                  onClick={() => setTemplate(k)}
                  style={{
                    padding: "11px 8px",
                    borderRadius: 6,
                    cursor: "pointer",
                    fontFamily: F_SANS,
                    fontSize: 13,
                    fontWeight: 600,
                    border: `1.5px solid ${template === k ? ICH.primary : ICH.border}`,
                    background: template === k ? ICH.primary : "#fff",
                    color: template === k ? "#fff" : ICH.text,
                    transition: "all .15s",
                  }}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          {/* Aesthetic */}
          <div style={panel}>
            <div style={secLabel}>Aesthetic</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(110px,1fr))", gap: 8 }}>
              {(Object.entries(IG_THEMES) as [ThemeKey, PostTheme][]).map(([k, v]) => (
                <button
                  key={k}
                  onClick={() => setTheme(k)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 9,
                    padding: "9px 11px",
                    borderRadius: 6,
                    cursor: "pointer",
                    fontFamily: F_SANS,
                    fontSize: 12.5,
                    fontWeight: 600,
                    border: `1.5px solid ${theme === k ? ICH.primary : ICH.border}`,
                    background: "#fff",
                    color: ICH.text,
                    transition: "all .15s",
                  }}
                >
                  <span style={{ display: "flex", flexShrink: 0 }}>
                    {v.swatch.map((c, i) => (
                      <span key={i} style={{ width: 15, height: 15, background: c, borderRadius: "50%", marginLeft: i ? -6 : 0, border: "1.5px solid #fff" }} />
                    ))}
                  </span>
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          {/* Dimensions */}
          <div style={panel}>
            <div style={secLabel}>Dimensions</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
              {(Object.entries(IG_FORMATS) as [FormatKey, (typeof IG_FORMATS)[FormatKey]][]).map(([k, v]) => (
                <button
                  key={k}
                  onClick={() => setFormat(k)}
                  style={{
                    padding: "12px 8px",
                    borderRadius: 6,
                    cursor: "pointer",
                    fontFamily: F_SANS,
                    textAlign: "center",
                    border: `1.5px solid ${format === k ? ICH.primary : ICH.border}`,
                    background: format === k ? `${ICH.primary}0d` : "#fff",
                    transition: "all .15s",
                  }}
                >
                  <div style={{ margin: "0 auto 8px", width: (v.w / v.h) * 34, height: 34, maxWidth: 34, border: `2px solid ${format === k ? ICH.primary : ICH.textMuted}`, borderRadius: 3 }} />
                  <div style={{ fontSize: 13, fontWeight: 600, color: format === k ? ICH.primary : ICH.text }}>{v.label}</div>
                  <div style={{ fontSize: 10.5, color: ICH.textMuted, marginTop: 2 }}>{v.sub}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div style={panel}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ ...secLabel, marginBottom: 0 }}>Content</div>
              <button onClick={resetTpl} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11.5, color: ICH.textMuted, fontFamily: F_SANS, textDecoration: "underline" }}>
                Reset
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
              {template === "verse" && <QuranPicker onPick={mergeFields} />}
              <PostDataPicker template={template} onPick={mergeFields} />
              {IG_TEMPLATES[template].fields.map((k) => (
                <IgField key={k} label={IG_FIELD_LABELS[k] || k} value={fields[k] || ""} onChange={(v) => setField(k, v)} textarea={["body", "subtitle", "translation", "arabic"].includes(k)} />
              ))}
            </div>
          </div>
        </div>

        {/* ── Preview ── */}
        <div style={{ position: "sticky", top: 90 }}>
          <div style={{ ...panel, display: "flex", flexDirection: "column", alignItems: "center", gap: 18, background: "#efe9e0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
              <span style={{ ...secLabel, marginBottom: 0 }}>Live Preview</span>
              <span style={{ fontSize: 11.5, color: ICH.textMuted, fontFamily: F_SANS }}>
                {dim.w} × {dim.h} · {dim.ratio}
              </span>
            </div>
            {/* scaled stage */}
            <div style={{ width: dim.w * scale, height: dim.h * scale, boxShadow: "0 14px 40px rgba(0,0,0,.22)", overflow: "hidden" }}>
              <div style={{ width: dim.w, height: dim.h, transform: `scale(${scale})`, transformOrigin: "top left" }}>
                <IgCanvas format={format} theme={theme} template={template} fields={fields} innerRef={nodeRef} />
              </div>
            </div>
            <button
              onClick={download}
              disabled={busy}
              style={{
                width: "100%",
                padding: "14px",
                background: busy ? ICH.textMuted : ICH.gold,
                color: "#fff",
                border: "none",
                borderRadius: 5,
                cursor: busy ? "default" : "pointer",
                fontFamily: F_SANS,
                fontSize: 15,
                fontWeight: 700,
                letterSpacing: ".02em",
                transition: "background .15s",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 9,
              }}
              onMouseEnter={(e) => {
                if (!busy) e.currentTarget.style.background = ICH.goldDark;
              }}
              onMouseLeave={(e) => {
                if (!busy) e.currentTarget.style.background = ICH.gold;
              }}
            >
              {busy ? "Rendering…" : `⬇  Download PNG · ${dim.w}×${dim.h}`}
            </button>
            {note && <div style={{ fontSize: 12.5, color: ICH.textMuted, fontFamily: F_SANS, textAlign: "center" }}>{note}</div>}
            <p style={{ fontSize: 11.5, color: ICH.textMuted, fontFamily: F_SANS, textAlign: "center", lineHeight: 1.6, margin: 0 }}>
              Exports at full Instagram resolution. Square for feed, Portrait for max reach, Story for 24-hr stories.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
