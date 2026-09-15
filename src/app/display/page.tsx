"use client";

import { useEffect, useMemo, useState } from "react";
import { Coordinates, PrayerTimes } from "adhan";
import { masjid } from "@/config/masjid";
import { getPrayerCalculationParameters } from "@/lib/prayer-calculation";
import { fmt12From24, fmtDateTime12, zonedParts, todayInMasjidTZ, addDays, msToHMS } from "@/lib/time";
import Image from "next/image";
import { JamaatTimes } from "@/lib/jamaat";

type PrayerKey = "fajr" | "sunrise" | "dhuhr" | "asr" | "maghrib" | "isha";
type SalahKey = "fajr" | "dhuhr" | "asr" | "maghrib" | "isha";

const QURAN_AYAHS = [
  { arabic: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ", english: "In the name of Allah, the Most Gracious, the Most Merciful", ref: "1:1" },
  { arabic: "إِنَّ مَعَ الْعُسْرِ يُسْرًا", english: "Indeed, with hardship comes ease", ref: "94:6" },
  { arabic: "فَاذْكُرُونِي أَذْكُرْكُمْ وَاشْكُرُوا لِي وَلَا تَكْفُرُونِ", english: "Remember Me, and I will remember you. Be grateful to Me and never deny Me", ref: "2:152" },
  { arabic: "وَمَن يَتَوَكَّلْ عَلَى اللَّهِ فَهُوَ حَسْبُهُ", english: "Whoever puts their trust in Allah, He is sufficient for them", ref: "65:3" },
  { arabic: "أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ", english: "Verily, in the remembrance of Allah do hearts find rest", ref: "13:28" },
  { arabic: "إِنَّ الصَّلَاةَ كَانَتْ عَلَى الْمُؤْمِنِينَ كِتَابًا مَّوقُوتًا", english: "Indeed, prayer has been decreed upon the believers a decree of specified times", ref: "4:103" },
  { arabic: "ادْعُونِي أَسْتَجِبْ لَكُمْ", english: "Call upon Me, I will respond to you", ref: "40:60" },
  { arabic: "وَإِذَا سَأَلَكَ عِبَادِي عَنِّي فَإِنِّي قَرِيبٌ", english: "And when My servants ask you about Me, indeed I am near", ref: "2:186" },
];

const FALLBACK: JamaatTimes = {
  fajr: "05:30", dhuhr: "12:35", asr: "16:15", maghrib: "17:55", isha: "19:30",
  jummah: [{ khutbah: "12:45", salah: "13:15" }, { khutbah: "13:15", salah: "13:45" }],
};

function isFriday(now: Date): boolean {
  const p = zonedParts(now, masjid.timezone);
  return new Date(p.year, p.month - 1, p.day).getDay() === 5;
}

function formatClock(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true, timeZone: masjid.timezone,
  }).formatToParts(date);
  const hh = (parts.find((p) => p.type === "hour")?.value ?? "12").padStart(2, "0");
  const mm = (parts.find((p) => p.type === "minute")?.value ?? "00").padStart(2, "0");
  const ss = (parts.find((p) => p.type === "second")?.value ?? "00").padStart(2, "0");
  const dpRaw = parts.find((p) => p.type === "dayPeriod")?.value ?? "PM";
  return `${hh}:${mm}:${ss} ${dpRaw.toUpperCase().includes("A") ? "AM" : "PM"}`;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: masjid.timezone,
  }).format(date);
}

function calcAdhan(date: Date) {
  const coords = new Coordinates(masjid.coordinates.lat, masjid.coordinates.lon);
  const params = getPrayerCalculationParameters();
  const pt = new PrayerTimes(coords, date, params);
  return { fajr: pt.fajr, sunrise: pt.sunrise, dhuhr: pt.dhuhr, asr: pt.asr, maghrib: pt.maghrib, isha: pt.isha };
}

function getNextPrayer(now: Date, today: ReturnType<typeof calcAdhan>, tomorrow: ReturnType<typeof calcAdhan>): { key: PrayerKey; at: Date } {
  for (const key of ["fajr", "dhuhr", "asr", "maghrib", "isha"] as PrayerKey[]) {
    if (today[key] > now) return { key, at: today[key] };
  }
  return { key: "fajr", at: tomorrow.fajr };
}

function isValidJamaat(x: unknown): x is JamaatTimes {
  if (!x || typeof x !== "object") return false;
  const v = x as Record<string, unknown>;
  return typeof v.fajr === "string" && typeof v.dhuhr === "string" && typeof v.asr === "string" && typeof v.maghrib === "string" && typeof v.isha === "string" && Array.isArray(v.jummah);
}

export default function DisplayPage() {
  const [jamaat, setJamaat] = useState<JamaatTimes>(FALLBACK);
  const [now, setNow] = useState<Date>(() => new Date());
  const [ayahIndex, setAyahIndex] = useState(0);
  const [ayahFading, setAyahFading] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setAyahFading(true);
      setTimeout(() => { setAyahIndex((prev) => (prev + 1) % QURAN_AYAHS.length); setAyahFading(false); }, 600);
    }, 12000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let active = true;
    let inFlight = false;
    const controller = new AbortController();
    async function load() {
      // Hidden tabs and offline displays do not need background network traffic.
      if (!active || inFlight || document.hidden || navigator.onLine === false) return;
      inFlight = true;
      try {
        const res = await fetch("/api/jamaat", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!res.ok) return;
        const json = await res.json();
        if (active && isValidJamaat(json?.data)) setJamaat(json.data);
      } catch { /* Keep the last confirmed times on network failure. */ }
      finally { inFlight = false; }
    }
    load();
    // The clock ticks locally each second; only admin-set times need polling.
    const id = setInterval(load, 60_000);
    return () => {
      active = false;
      clearInterval(id);
      controller.abort();
    };
  }, []);
  const todayTz     = useMemo(() => todayInMasjidTZ(now, masjid.timezone), [now]);
  const tomorrowTz  = useMemo(() => addDays(todayTz, 1), [todayTz]);
  const adhanToday  = useMemo(() => calcAdhan(todayTz), [todayTz]);
  const adhanTomorrow = useMemo(() => calcAdhan(tomorrowTz), [tomorrowTz]);
  const next        = useMemo(() => getNextPrayer(now, adhanToday, adhanTomorrow), [now, adhanToday, adhanTomorrow]);
  const countdown   = useMemo(() => msToHMS(next.at.getTime() - now.getTime()), [next, now]);

  const friday = isFriday(now);
  const jummah1 = jamaat.jummah[0] ?? { khutbah: "12:45", salah: "13:15" };
  const jummah2 = jamaat.jummah[1] ?? { khutbah: "13:15", salah: "13:45" };
  const nextLabel = friday && next.key === "dhuhr" ? "JUMMAH" : next.key.toUpperCase();
  const currentAyah = QURAN_AYAHS[ayahIndex];

  const tiles = friday
    ? [
        { key: "fajr" as SalahKey, title: "Fajr",    jamaat: jamaat.fajr },
        { key: "dhuhr" as SalahKey, title: "Jummah",  isJummah: true },
        { key: "asr" as SalahKey,   title: "Asr",     jamaat: jamaat.asr },
        { key: "maghrib" as SalahKey, title: "Maghrib", jamaat: jamaat.maghrib },
        { key: "isha" as SalahKey,  title: "Isha",    jamaat: jamaat.isha },
      ]
    : [
        { key: "fajr" as SalahKey,    title: "Fajr",    jamaat: jamaat.fajr },
        { key: "dhuhr" as SalahKey,   title: "Dhuhr",   jamaat: jamaat.dhuhr },
        { key: "asr" as SalahKey,     title: "Asr",     jamaat: jamaat.asr },
        { key: "maghrib" as SalahKey, title: "Maghrib", jamaat: jamaat.maghrib },
        { key: "isha" as SalahKey,    title: "Isha",    jamaat: jamaat.isha },
      ];

  return (
    <main className="h-screen w-screen overflow-hidden bg-[#f5f0e8] text-[#0d3d4a] font-serif">
      <div className="h-full w-full p-4 md:p-5 grid grid-rows-[auto_1fr_auto] gap-3 md:gap-4">

        {/* Header */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-5">
            <Image src="/uploads/logo.png" alt={masjid.name} width={280} height={140} className="object-contain max-h-[70px] md:max-h-[100px] w-auto" priority />
            <div className="text-[clamp(13px,1.3vw,20px)] text-[#0d3d4a]/50 whitespace-nowrap italic">{formatDate(now)}</div>
          </div>
          <div className="bg-[#0d3d4a] text-[#f5f0e8] px-8 py-3 text-center" style={{ clipPath: "polygon(4% 0%, 96% 0%, 100% 100%, 0% 100%)" }}>
            <div className="font-semibold tabular-nums text-[clamp(28px,3vw,56px)] whitespace-nowrap tracking-wide">{formatClock(now)}</div>
            <div className="text-[clamp(10px,0.9vw,15px)] text-[#f5f0e8]/70 tabular-nums whitespace-nowrap mt-1">
              Next: <span className="font-semibold text-[#d4a843]">{nextLabel}</span>{" "}in <span className="font-semibold text-[#d4a843]">{countdown}</span>
            </div>
          </div>
        </header>

        {/* Prayer Tiles */}
        <section className="min-h-0 grid grid-cols-3 grid-rows-2 gap-3 md:gap-4">
          {tiles.map((t) => {
            const adhanTime = fmtDateTime12(adhanToday[t.key], masjid.timezone);
            const isNext = next.key === t.key;

            if ("isJummah" in t && t.isJummah) {
              return (
                <JummahTile key={t.key} adhan={adhanTime} jummah1={fmt12From24(jummah1.khutbah)} jummah1Salah={fmt12From24(jummah1.salah)} jummah2={fmt12From24(jummah2.khutbah)} jummah2Salah={fmt12From24(jummah2.salah)} highlight={isNext} />
              );
            }

            return (
              <Tile key={t.key} title={t.title} adhan={adhanTime}
                jamaat={"jamaat" in t && t.jamaat ? fmt12From24(t.jamaat) : undefined}
                highlight={isNext}
                sunrise={t.key === "fajr" ? fmtDateTime12(adhanToday.sunrise, masjid.timezone) : undefined}
              />
            );
          })}
          <DonationTile />
        </section>

        {/* Footer */}
        <footer className="bg-[#0d3d4a] text-[#f5f0e8] px-6 py-3 shrink-0">
          <div className="text-center transition-opacity duration-500 mb-2" style={{ opacity: ayahFading ? 0 : 1 }}>
            <span className="font-arabic text-lg md:text-xl text-[#d4a843]">{currentAyah.arabic}</span>
            <span className="mx-3 text-[#f5f0e8]/30">|</span>
            <span className="italic text-sm text-[#f5f0e8]/80">&ldquo;{currentAyah.english}&rdquo;</span>
            <span className="text-xs text-[#d4a843]/70 ml-2">[{currentAyah.ref}]</span>
          </div>
          <div className="w-full h-px bg-[#f5f0e8]/10 mb-2" />
          <div className="flex items-center justify-between whitespace-nowrap">
            <div className="flex items-center gap-3">
              <span className="text-[clamp(14px,1.4vw,22px)] text-[#d4a843]">&#x1F54C;</span>
              <span className="text-[clamp(13px,1.3vw,22px)] text-[#f5f0e8]/70">
                Jumu&apos;ah:&nbsp;
                <span className="font-semibold text-[#d4a843]">
                  1st &mdash; {fmt12From24(jummah1.khutbah)}&nbsp;&nbsp;&bull;&nbsp;&nbsp;2nd &mdash; {fmt12From24(jummah2.khutbah)}
                </span>
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-[clamp(10px,0.9vw,14px)] text-[#f5f0e8]/40 uppercase tracking-wider">Next Prayer</span>
              <span className="text-[clamp(14px,1.4vw,24px)] font-semibold tabular-nums text-[#d4a843]">
                {nextLabel}
                <span className="text-[#f5f0e8]/50">&nbsp;&bull;&nbsp;</span>
                <span className="text-[#f5f0e8]">{fmtDateTime12(next.at, masjid.timezone)}</span>
                <span className="text-[#f5f0e8]/50">&nbsp;&bull;&nbsp;</span>
                <span className="text-[#f5f0e8]">{countdown}</span>
              </span>
            </div>
          </div>
        </footer>

      </div>
    </main>
  );
}

function JummahTile({ adhan, jummah1, jummah1Salah, jummah2, jummah2Salah, highlight }: {
  adhan: string; jummah1: string; jummah1Salah: string; jummah2: string; jummah2Salah: string; highlight?: boolean;
}) {
  return (
    <div className={["border-l-4 bg-white p-5 flex flex-col justify-center min-h-0 transition-all duration-300 overflow-hidden relative", highlight ? "border-l-[#d4a843] shadow-lg bg-[#d4a843]/5" : "border-l-[#145c70]/30 shadow-sm"].join(" ")}>
      {highlight && <div className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full bg-[#d4a843] animate-pulse" />}
      <div className="flex items-center gap-2">
        <span className="text-[clamp(16px,1.4vw,28px)]">&#x1F54C;</span>
        <span className="font-bold text-[#145c70] text-[clamp(18px,1.6vw,34px)]">Jummah</span>
      </div>
      <div className="mt-3 space-y-2">
        {[{ label: "1st", khutbah: jummah1, salah: jummah1Salah }, { label: "2nd", khutbah: jummah2, salah: jummah2Salah }].map((j) => (
          <div key={j.label} className="flex items-center justify-between">
            <span className="font-medium text-[#0d3d4a]/40 text-[clamp(11px,1vw,18px)] uppercase tracking-wider">{j.label}</span>
            <div className="text-right">
              <span className="font-semibold tabular-nums text-[clamp(16px,1.8vw,36px)] leading-none text-[#145c70] whitespace-nowrap">{j.khutbah}</span>
              <span className="block text-[clamp(10px,0.8vw,13px)] text-[#0d3d4a]/40">salah {j.salah}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 text-[#0d3d4a]/30 text-[clamp(10px,0.8vw,13px)]">Adhan: {adhan}</div>
    </div>
  );
}

function DonationTile() {
  return (
    <div className="border-l-4 border-l-[#145c70]/30 bg-white shadow-sm p-4 flex flex-col items-center justify-center min-h-0 overflow-hidden">
      <div className="font-semibold text-[#0d3d4a] text-[clamp(15px,1.3vw,26px)]">Support Your Masjid</div>
      <p className="mt-3 text-center text-[clamp(11px,0.9vw,15px)] text-[#0d3d4a]/60 leading-snug">
        Donate at<br /><span className="font-semibold text-[#145c70]">ichattiesburg.com/donate</span>
      </p>
      <p className="mt-2 text-center text-[#145c70] font-medium text-[clamp(9px,0.7vw,13px)] leading-snug italic">
        &ldquo;Who is it that would loan Allah a goodly loan so He may multiply it for him many times over?&rdquo; &mdash; 2:245
      </p>
    </div>
  );
}

function Tile({ title, adhan, jamaat, highlight, sunrise }: {
  title: string; adhan: string; jamaat?: string; highlight?: boolean; sunrise?: string;
}) {
  return (
    <div className={["border-l-4 bg-white p-5 flex flex-col justify-center min-h-0 transition-all duration-300 overflow-hidden relative", highlight ? "border-l-[#d4a843] shadow-lg bg-[#d4a843]/5" : "border-l-[#0d3d4a]/15 shadow-sm"].join(" ")}>
      {highlight && <div className="absolute top-3 right-3 w-2.5 h-2.5 rounded-full bg-[#d4a843] animate-pulse" />}
      <div className="flex items-baseline gap-3">
        <span className="font-bold text-[clamp(18px,1.6vw,34px)] text-[#0d3d4a]">{title}</span>
        {sunrise && <span className="text-[#0d3d4a]/40 text-[clamp(10px,0.8vw,14px)] whitespace-nowrap">Sunrise: {sunrise}</span>}
      </div>
      <div className="mt-auto pt-3 flex items-end justify-between min-h-0">
        <div className="min-w-0">
          <div className="text-[#0d3d4a]/40 text-[clamp(10px,0.8vw,14px)] uppercase tracking-wider">Adhan</div>
          <div className="mt-1 font-semibold tracking-tight tabular-nums text-[clamp(28px,3vw,64px)] leading-none text-[#0d3d4a] whitespace-nowrap">{adhan}</div>
        </div>
        {jamaat ? (
          <div className="text-right min-w-0">
            <div className="text-[#0d3d4a]/40 text-[clamp(10px,0.8vw,14px)] uppercase tracking-wider">Jamaat</div>
            <div className="mt-1 font-semibold tracking-tight tabular-nums text-[clamp(28px,3vw,64px)] leading-none text-[#145c70] whitespace-nowrap">{jamaat}</div>
          </div>
        ) : (
          <div className="text-right text-[#0d3d4a]/15 text-[clamp(24px,2.2vw,48px)] leading-none">—</div>
        )}
      </div>
    </div>
  );
}
