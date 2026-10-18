"use client";

import React from "react";
import { usePrayerCountdown } from "@/lib/use-prayer-countdown";
import { ICH, Btn, GoldLabel, ScrollReveal } from "./ui-primitives";
import { PrayerTimes, JumuahSchedule } from "@/lib/prayer-times";
import { JamaatTimes } from "@/lib/jamaat";
import { fmt12From24 } from "@/lib/time";

interface PrayerData {
  name: string;
  key: keyof Omit<PrayerTimes, "sunrise">;
  display: string;
  jamaat?: string;
}

interface PrayerTimesClientProps {
  prayerTimes: PrayerTimes;
  jamaatTimes: JamaatTimes;
  jumuah: JumuahSchedule;
}

export default function PrayerTimesClient({ prayerTimes, jamaatTimes, jumuah }: PrayerTimesClientProps) {
  const prayers: PrayerData[] = React.useMemo(() => [
    { name: "Fajr",    key: "fajr",    display: prayerTimes.fajr,    jamaat: fmt12From24(jamaatTimes.fajr) },
    { name: "Dhuhr",   key: "dhuhr",   display: prayerTimes.dhuhr,   jamaat: fmt12From24(jamaatTimes.dhuhr) },
    { name: "Asr",     key: "asr",     display: prayerTimes.asr,     jamaat: fmt12From24(jamaatTimes.asr) },
    { name: "Maghrib", key: "maghrib", display: prayerTimes.maghrib, jamaat: fmt12From24(jamaatTimes.maghrib) },
    { name: "Isha",    key: "isha",    display: prayerTimes.isha,    jamaat: fmt12From24(jamaatTimes.isha) },
  ], [prayerTimes, jamaatTimes]);

  const { countdown, nextName, nextIdx, curIdx } = usePrayerCountdown(prayers);

  const jumuahItems = jamaatTimes.jummah.map((slot, i) => ({
    label: i === 0 ? "1st Jumuah" : "2nd Jumuah",
    khutbah: fmt12From24(slot.khutbah),
    salah: fmt12From24(slot.salah),
  }));

  return (
    <div className="page-enter" style={{ maxWidth: 1100, margin: "0 auto", padding: "52px 24px 80px" }}>
      <div style={{ marginBottom: 48 }}>
        <GoldLabel>Hattiesburg, Mississippi</GoldLabel>
        <h1 style={{ fontFamily: "Cormorant Garamond,serif", fontSize: "clamp(32px,5vw,52px)", fontWeight: 600, marginBottom: 10 }}>Prayer Times</h1>
        <p style={{ fontSize: 16, color: ICH.textMuted, lineHeight: 1.7 }}>Daily prayer schedule for the Islamic Center of Hattiesburg. Times are calculated automatically.</p>
      </div>

      {/* Live Countdown */}
      <ScrollReveal>
        <div style={{
          background: `linear-gradient(135deg,${ICH.primaryDark},${ICH.primary})`,
          borderRadius: 8, padding: "36px 40px", marginBottom: 36,
          display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 24,
          position: "relative", overflow: "hidden",
        }}>
          <div className="geo-bg" style={{ position: "absolute", inset: 0, opacity: 0.5 }} />
          <div style={{ position: "relative" }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: ICH.accent, fontFamily: "Inter,sans-serif", marginBottom: 8 }}>Up Next</div>
            <div style={{ fontFamily: "Cormorant Garamond,serif", fontSize: "clamp(24px,3vw,36px)", fontWeight: 600, color: "#fff" }}>{nextName}</div>
          </div>
          <div style={{ position: "relative", textAlign: "center" }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".1em", textTransform: "uppercase", color: "rgba(255,255,255,.65)", fontFamily: "Inter,sans-serif", marginBottom: 6 }}>Time Remaining</div>
            <div style={{ fontFamily: "Cormorant Garamond,serif", fontSize: "clamp(40px,6vw,68px)", fontWeight: 600, color: ICH.accent, letterSpacing: ".05em", lineHeight: 1 }}>{countdown}</div>
          </div>
          <div style={{ position: "relative", textAlign: "right" }}>
            <div className="arabic-text" style={{ fontSize: 22, color: ICH.accent, marginBottom: 6 }}>حَافِظُوا عَلَى الصَّلَوَاتِ</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,.5)", fontFamily: "Inter,sans-serif", fontStyle: "italic" }}>
              &ldquo;Guard strictly the prayers&rdquo; — Quran 2:238
            </div>
          </div>
        </div>
      </ScrollReveal>

      {/* Prayer cards */}
      <ScrollReveal delay={0.1}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12, marginBottom: 40 }}>
          {prayers.map((p, i) => {
            const isCur = i === curIdx;
            const isNext = i === nextIdx;
            return (
              <div key={p.key} style={{
                textAlign: "center", padding: "24px 16px", borderRadius: 6,
                background: isCur ? ICH.primary : isNext ? `${ICH.primary}0e` : "#fff",
                border: `1px solid ${isCur ? ICH.primary : isNext ? ICH.primary + "44" : ICH.border}`,
                boxShadow: isCur ? "0 6px 24px rgba(27,94,32,.22)" : "var(--shadow-sm)",
                transform: isCur ? "translateY(-3px) scale(1.03)" : "none",
                transition: "all .25s", position: "relative",
              }}>
                {isCur && <div style={{ position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)", background: ICH.gold, color: "#fff", fontSize: 9, fontWeight: 700, padding: "2px 10px", borderRadius: 10, fontFamily: "Inter,sans-serif", letterSpacing: ".06em", whiteSpace: "nowrap" }}>CURRENT</div>}
                {isNext && !isCur && <div style={{ position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)", background: ICH.bgCard2, color: ICH.primary, fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 10, border: `1px solid ${ICH.primary}33`, fontFamily: "Inter,sans-serif", whiteSpace: "nowrap" }}>UP NEXT</div>}

                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: isCur ? "rgba(255,255,255,.65)" : ICH.textMuted, marginBottom: 8, fontFamily: "Inter,sans-serif" }}>{p.name}</div>

                <div style={{ marginBottom: 4 }}>
                  <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", color: isCur ? "rgba(255,255,255,.5)" : ICH.textMuted, fontFamily: "Inter,sans-serif", marginBottom: 2 }}>Adhan</div>
                  <div style={{ fontFamily: "Cormorant Garamond,serif", fontSize: 22, fontWeight: 600, color: isCur ? "#fff" : ICH.text }}>{p.display}</div>
                </div>

                {p.jamaat && (
                  <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${isCur ? "rgba(255,255,255,.2)" : ICH.border}` }}>
                    <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", color: isCur ? "rgba(255,255,255,.75)" : ICH.textMuted, fontFamily: "Inter,sans-serif", marginBottom: 2 }}>Jamaat</div>
                    <div style={{ fontFamily: "Cormorant Garamond,serif", fontSize: 20, fontWeight: 600, color: isCur ? "#fff" : ICH.goldDark }}>{p.jamaat}</div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Sunrise card */}
          <div style={{
            textAlign: "center", padding: "24px 16px", borderRadius: 6,
            background: "#fff", border: `1px solid ${ICH.border}`,
            boxShadow: "var(--shadow-sm)",
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: ICH.textMuted, marginBottom: 8, fontFamily: "Inter,sans-serif" }}>Sunrise</div>
            <div style={{ fontFamily: "Cormorant Garamond,serif", fontSize: 22, fontWeight: 600, color: ICH.text }}>{prayerTimes.sunrise}</div>
          </div>
        </div>

        {/* Jumuah section */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 24, marginBottom: 48 }}>
          <div style={{ border: `1px solid ${ICH.gold}44`, borderRadius: 8, padding: 28, background: `${ICH.gold}08` }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: ICH.gold, fontFamily: "Inter,sans-serif", marginBottom: 8 }}>Every Friday</div>
            <h2 style={{ fontFamily: "Cormorant Garamond,serif", fontSize: 28, fontWeight: 600, marginBottom: 20 }}>Jumuah Prayer</h2>
            {jumuahItems.map((j) => (
              <div key={j.label} style={{ padding: "12px 0", borderBottom: `1px solid ${ICH.border}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: ICH.primary }}>{j.label}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: ICH.textMuted }}>
                  <span>Khutbah: <strong style={{ color: ICH.text }}>{j.khutbah}</strong></span>
                  <span>Salah: <strong style={{ color: ICH.text }}>{j.salah}</strong></span>
                </div>
              </div>
            ))}
            {jumuah.topic && jumuah.topic !== "TBA" && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${ICH.border}` }}>
                <span style={{ fontSize: 13, color: ICH.textMuted }}>Topic</span>
                <span style={{ fontSize: 14, fontWeight: 500, textAlign: "right", maxWidth: "60%" }}>{jumuah.topic}</span>
              </div>
            )}
            <p style={{ fontSize: 13, color: ICH.textMuted, marginTop: 16, lineHeight: 1.7 }}>
              All are welcome. Located at{" "}
              <a href="https://www.google.com/maps/search/?api=1&query=211+N+25th+Avenue,+Hattiesburg,+MS+39401" target="_blank" rel="noopener noreferrer" style={{ color: ICH.primary, textDecoration: "underline", textUnderlineOffset: "2px" }}>
                211 N 25th Avenue, Hattiesburg, MS 39401
              </a>.
            </p>
          </div>

          <div style={{ border: `1px solid ${ICH.border}`, borderRadius: 8, padding: 28, background: "#fff" }}>
            <h3 style={{ fontFamily: "Cormorant Garamond,serif", fontSize: 22, fontWeight: 600, marginBottom: 14 }}>Notes on Prayer Times</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                "Adhan times are calculated automatically based on the sun's position in Hattiesburg, MS.",
                "Jamaat (congregation) times are set by the masjid administration.",
                "Please arrive a few minutes early to pray sunnah.",
                "Check the announcements banner for any changes to the schedule.",
              ].map((note, i) => (
                <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <span style={{ color: ICH.gold, fontWeight: 700, flexShrink: 0, marginTop: 1 }}>—</span>
                  <span style={{ fontSize: 13, color: ICH.textMuted, lineHeight: 1.65 }}>{note}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 20 }}>
              <Btn variant="outline" href="/contact" size="sm">Contact the Masjid</Btn>
            </div>
          </div>
        </div>
      </ScrollReveal>

      {/* Quran verse */}
      <ScrollReveal delay={0.3}>
        <div style={{ background: ICH.bgCard, border: `1px solid ${ICH.border}`, borderRadius: 8, padding: "32px 36px", textAlign: "center" }}>
          <div className="arabic-text" style={{ fontSize: "clamp(22px,3vw,30px)", color: ICH.primary, marginBottom: 12, lineHeight: 1.8, direction: "rtl", textAlign: "right" }}>
            إِنَّ الصَّلَاةَ كَانَتْ عَلَى الْمُؤْمِنِينَ كِتَابًا مَّوقُوتًا
          </div>
          <p style={{ fontSize: 14, color: ICH.textMuted, fontStyle: "italic" }}>
            &ldquo;Indeed, prayer has been decreed upon the believers a decree of specified times.&rdquo; — Quran 4:103
          </p>
        </div>
      </ScrollReveal>
    </div>
  );
}
