"use client";

import React from "react";
import Image from "next/image";
import { usePrayerCountdown } from "@/lib/use-prayer-countdown";
import { ICH, Btn, GoldLabel, SectionHead, ScrollReveal } from "./ui-primitives";
import { PrayerTimes } from "@/lib/prayer-times";
import { JamaatTimes } from "@/lib/jamaat";
import { SiteSettings } from "@/lib/store";
import { fmt12From24 } from "@/lib/time";

// Mosque Hero SVG
function MosqueHero() {
  const dark = '#061217';
  return (
    <svg viewBox="0 0 1400 420" preserveAspectRatio="xMidYMax meet"
      style={{ position:'absolute', bottom:0, left:0, width:'100%', height:'80%', pointerEvents:'none' }}>
      <defs>
        <linearGradient id="skyG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#0d2b36"/>
          <stop offset="55%"  stopColor="#154d60"/>
          <stop offset="100%" stopColor="#1f7a95" stopOpacity=".9"/>
        </linearGradient>
        <radialGradient id="glowG" cx="50%" cy="100%" r="55%">
          <stop offset="0%"   stopColor="#247c6c" stopOpacity=".3"/>
          <stop offset="100%" stopColor="#247c6c" stopOpacity="0"/>
        </radialGradient>
        <mask id="moonMask">
          <rect width="1400" height="420" fill="white" />
          <circle cx="1104" cy="58" r="23" fill="black" />
        </mask>
      </defs>

      {/* Sky */}
      <rect width="1400" height="420" fill="url(#skyG)"/>
      <rect width="1400" height="420" fill="url(#glowG)"/>

      {/* Stars */}
      {[
        [60,44],[152,28],[290,62],[430,22],[570,46],[700,18],[830,38],[960,26],[1090,52],[1230,34],[1340,50],
        [110,105],[360,88],[520,72],[760,82],[920,60],[1180,78],[1310,92],[200,140],[480,118],[660,130],[1040,110]
      ].map(([x,y],i) => (
        <circle key={i} cx={x} cy={y} r={i%4===0?1.8:i%3===0?1.4:1} fill="#fff" opacity={.3+.4*(i%3)/2}/>
      ))}

      {/* Crescent moon */}
      <circle cx="1090" cy="66" r="27" fill="#3ba491" opacity=".92" mask="url(#moonMask)"/>

      {/* Horizon glow */}
      <ellipse cx="700" cy="420" rx="680" ry="90" fill="#247c6c" opacity=".12"/>

      {/* Left minaret */}
      <rect x="198" y="52" width="26" height="368" fill={dark}/>
      <path d="M 184,52 Q 211,14 238,52 Z" fill={dark}/>
      <line x1="211" y1="14" x2="211" y2="-2" stroke={dark} strokeWidth="4"/>
      <circle cx="211" cy="-4" r="5" fill={dark}/>

      {/* Right minaret */}
      <rect x="1176" y="52" width="26" height="368" fill={dark}/>
      <path d="M 1162,52 Q 1189,14 1216,52 Z" fill={dark}/>
      <line x1="1189" y1="14" x2="1189" y2="-2" stroke={dark} strokeWidth="4"/>
      <circle cx="1189" cy="-4" r="5" fill={dark}/>

      {/* Left wing wall */}
      <rect x="110" y="292" width="408" height="128" fill={dark}/>
      {/* Left wing dome */}
      <path d="M 110,292 Q 314,192 518,292 Z" fill={dark}/>
      <line x1="314" y1="192" x2="314" y2="172" stroke={dark} strokeWidth="3"/>
      <circle cx="314" cy="169" r="4" fill={dark}/>

      {/* Right wing wall */}
      <rect x="882" y="292" width="408" height="128" fill={dark}/>
      {/* Right wing dome */}
      <path d="M 882,292 Q 1086,192 1290,292 Z" fill={dark}/>
      <line x1="1086" y1="192" x2="1086" y2="172" stroke={dark} strokeWidth="3"/>
      <circle cx="1086" cy="169" r="4" fill={dark}/>

      {/* Central drum */}
      <rect x="492" y="218" width="416" height="90" fill={dark}/>

      {/* Central main dome (onion) */}
      <path d="M 492,218 C 492,96 560,16 700,10 C 840,16 908,96 908,218 Z" fill={dark}/>
      <line x1="700" y1="10" x2="700" y2="-8" stroke={dark} strokeWidth="4"/>
      <circle cx="700" cy="-12" r="6" fill={dark}/>

      {/* Decorative windows in drum */}
      {[542,606,700,794,858].map((x,i) => (
        <g key={i}>
          <rect x={x-13} y={228} width={26} height={52} fill="#09222a" opacity=".9"/>
          <ellipse cx={x} cy={228} rx={13} ry={10} fill="#09222a" opacity=".9"/>
        </g>
      ))}

      {/* Arched openings in left wing */}
      {[184,284,384,460].map((x,i) => (
        <g key={i}>
          <rect x={x-16} y={326} width={32} height={94} fill="#09222a" opacity=".8"/>
          <ellipse cx={x} cy={326} rx={16} ry={13} fill="#09222a" opacity=".8"/>
        </g>
      ))}

      {/* Arched openings in right wing */}
      {[940,1016,1116,1216].map((x,i) => (
        <g key={i}>
          <rect x={x-16} y={326} width={32} height={94} fill="#09222a" opacity=".8"/>
          <ellipse cx={x} cy={326} rx={16} ry={13} fill="#09222a" opacity=".8"/>
        </g>
      ))}

      {/* Central arch entrance */}
      <rect x="648" y="298" width="104" height="122" fill="#09222a" opacity=".9"/>
      <ellipse cx="700" cy="298" rx="52" ry="40" fill="#09222a" opacity=".9"/>
    </svg>
  );
}

interface HomeClientProps {
  prayerTimes: PrayerTimes;
  jamaatTimes: JamaatTimes;
  settings: SiteSettings;
}

export default function HomeClient({ prayerTimes, jamaatTimes, settings }: HomeClientProps) {
  const prayersAll = React.useMemo(() => [
    { name: "Fajr",    key: "fajr",  display: prayerTimes.fajr },
    { name: "Sunrise", key: "sunrise",  display: prayerTimes.sunrise },
    { name: "Dhuhr",   key: "dhuhr",  display: prayerTimes.dhuhr },
    { name: "Asr",     key: "asr",   display: prayerTimes.asr },
    { name: "Maghrib", key: "maghrib", display: prayerTimes.maghrib },
    { name: "Isha",    key: "isha",  display: prayerTimes.isha },
  ], [prayerTimes]);

  // Jamaat (Iqama) times formatted to 12h
  const jamaatDisplay: Record<string, string> = React.useMemo(() => ({
    fajr:    fmt12From24(jamaatTimes.fajr),
    dhuhr:   fmt12From24(jamaatTimes.dhuhr),
    asr:     fmt12From24(jamaatTimes.asr),
    maghrib: settings.maghribDisplay || "After Adhan",
    isha:    fmt12From24(jamaatTimes.isha),
  }), [jamaatTimes, settings.maghribDisplay]);

  const prayers5 = React.useMemo(() => prayersAll.filter(p => p.key !== "sunrise"), [prayersAll]);
  const { countdown, nextName, nextIdx, curIdx } = usePrayerCountdown(prayersAll);

  // Formatted Jumuah schedule – from jamaatTimes
  const jumuahItems = jamaatTimes.jummah.map((slot, idx) => ({
    label: idx === 0 ? "Jumuah 1" : "Jumuah 2",
    time: `${fmt12From24(slot.khutbah)} / ${fmt12From24(slot.salah)}`,
  }));
  const jumuahDisplay = [
    ...jumuahItems,
    { label: "Location", time: settings.jumuahLocation || "211 N 25th Ave" },
  ];

  return (
    <div className="page-enter">
      {/* Hero */}
      <section style={{ position: "relative", minHeight: "78vh", overflow: "hidden", display: "flex", alignItems: "center" }}>
        {/* Dark gradient overlay */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg,#0d2b36 0%,#154d60 55%,#1f7a95cc 100%)" }} />
        {/* Islamic star pattern overlay */}
        <div className="geo-bg" style={{ position: "absolute", inset: 0, opacity: 0.35 }} />
        {/* Mosque silhouette */}
        <MosqueHero />

        {/* Content */}
        <div style={{ position: "relative", zIndex: 10, maxWidth: 1200, margin: "0 auto", padding: "80px 24px 100px", width: "100%" }}>
          <ScrollReveal delay={0.1} className="max-w-[580px]">
            <div className="arabic-text" style={{ fontSize: "clamp(18px,2.5vw,26px)", color: ICH.accent, marginBottom: 18, direction: "rtl", textAlign: "left" }}>
              السَّلَامُ عَلَيْكُمْ وَرَحْمَةُ اللهِ وَبَرَكَاتُهُ
            </div>
            <h1 style={{ fontFamily: "Cormorant Garamond,serif", fontWeight: 600, fontSize: "clamp(40px,6vw,72px)", color: "#fff", lineHeight: 1.1, marginBottom: 20 }}>
              Islamic Center<br />
              <span style={{ color: ICH.accent }}>of Hattiesburg</span>
            </h1>
            <p style={{ fontSize: "clamp(15px,1.6vw,18px)", color: "rgba(255,255,255,.78)", lineHeight: 1.8, marginBottom: 36, maxWidth: 460 }}>
              Serving the Muslim community of Hattiesburg, Mississippi with daily prayers, Islamic education, and community programs since our founding. All are welcome.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              <Btn variant="gold" href="/prayer-times" style={{ fontSize: 14 }}>🕌 Prayer Times</Btn>
              <Btn variant="primary" href="/donate">♥ Donate Now</Btn>
              <Btn variant="ghost-dark" href="/events">📅 Events</Btn>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Prayer Times Strip */}
      <section style={{ background: ICH.primaryDark, borderTop: `2px solid ${ICH.accent}33`, borderBottom: `1px solid ${ICH.accent}22` }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "20px 24px" }}>
          {/* Countdown bar */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".12em", textTransform: "uppercase", color: ICH.accent, fontFamily: "Inter,sans-serif" }}>
              Today&rsquo;s Prayer Times
            </div>
            {nextName && (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: ICH.accent, animation: "pulse 1.4s ease-in-out infinite" }} />
                <span style={{ fontSize: 12, color: "rgba(255,255,255,.6)", fontFamily: "Inter,sans-serif" }}>
                  Next: <strong style={{ color: "rgba(255,255,255,.9)" }}>{nextName}</strong> in
                </span>
                <span style={{ fontFamily: "Cormorant Garamond,serif", fontSize: 22, color: ICH.accent, fontWeight: 600, letterSpacing: ".04em" }}>
                  {countdown}
                </span>
              </div>
            )}
            <Btn variant="outline" href="/prayer-times" style={{ border: `1px solid ${ICH.accent}44`, color: ICH.accent, padding: "4px 12px", borderRadius: 3, fontSize: 12, height: "auto" }}>
              Full Schedule →
            </Btn>
          </div>

          {/* Prayer cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(92px,1fr))", gap: 8 }}>
            {prayers5.map((p, i) => {
              const prayers5Idxs = [0, 2, 3, 4, 5];
              const realIdx = prayers5Idxs[i];
              const isCur = realIdx === curIdx;
              const isNext = realIdx === nextIdx;
              const iqama = jamaatDisplay[p.key];
              return (
                <div key={p.key} style={{
                  textAlign: "center", padding: "12px 8px", borderRadius: 4,
                  background: isCur ? ICH.accent : isNext ? "rgba(36,124,108,.12)" : "rgba(255,255,255,.04)",
                  border: `1px solid ${isCur ? ICH.accent : isNext ? ICH.accent + "44" : "rgba(255,255,255,.08)"}`,
                  position: "relative", transition: "all .2s",
                }}>
                  {isCur && <div style={{ position: "absolute", top: -9, left: "50%", transform: "translateX(-50%)", background: ICH.primaryDark, color: ICH.accent, fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 10, border: `1px solid ${ICH.accent}`, fontFamily: "Inter,sans-serif", letterSpacing: ".06em" }}>NOW</div>}
                  {isNext && !isCur && <div style={{ position: "absolute", top: -9, left: "50%", transform: "translateX(-50%)", background: ICH.primaryDark, color: "rgba(255,255,255,.7)", fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 10, border: "1px solid rgba(255,255,255,.2)", fontFamily: "Inter,sans-serif" }}>NEXT</div>}
                  <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", color: isCur ? ICH.primaryDark : "rgba(255,255,255,.5)", marginBottom: 3, fontFamily: "Inter,sans-serif" }}>{p.name}</div>
                  <div style={{ fontFamily: "Cormorant Garamond,serif", fontSize: 17, fontWeight: 600, color: isCur ? ICH.primaryDark : "#fff" }}>{p.display}</div>
                  {iqama && (
                    <div style={{ marginTop: 4, paddingTop: 4, borderTop: `1px solid ${isCur ? "rgba(0,0,0,.15)" : "rgba(255,255,255,.12)"}` }}>
                      <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase", color: isCur ? ICH.primaryDark : "rgba(255,255,255,.45)", fontFamily: "Inter,sans-serif", marginBottom: 1 }}>Iqama</div>
                      <div style={{ fontFamily: "Cormorant Garamond,serif", fontSize: iqama === "After Adhan" ? 10 : 14, fontWeight: 600, color: isCur ? ICH.primaryDark : "#fff" }}>{iqama}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} }`}</style>
      </section>

      {/* About Section */}
      <section style={{ padding: "100px 24px", background: ICH.bg }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 60, alignItems: "center" }}>
          <ScrollReveal delay={0.1}>
            <SectionHead label="About Us" title="Welcome to ICH" />
            <p style={{ fontSize: 15, color: ICH.textMuted, lineHeight: 1.8, marginBottom: 20 }}>
              The Islamic Center of Hattiesburg provides a place of worship and a community hub for Muslims in the Pine Belt area. We are committed to nurturing faith, fostering brotherhood, and engaging with our broader Hattiesburg community.
            </p>
            <p style={{ fontSize: 15, color: ICH.textMuted, lineHeight: 1.8, marginBottom: 32 }}>
              We invite everyone to visit, participate in our programs, and learn more about Islam.
            </p>
            <Btn variant="outline" href="/about">Learn More</Btn>
          </ScrollReveal>
          
          <ScrollReveal delay={0.2} y={30} className="relative">
            {/* Visual element placeholder */}
            <div style={{ 
              aspectRatio: "4/3", 
              background: `linear-gradient(135deg, ${ICH.primaryDark}, ${ICH.primary})`,
              borderRadius: 12,
              position: "relative",
              overflow: "hidden",
              boxShadow: "0 20px 40px rgba(10,50,65,0.15)"
            }}>
              <Image src="/ich.jpeg" alt="Islamic Center of Hattiesburg" fill sizes="(max-width: 768px) 100vw, 50vw" style={{ objectFit: "cover" }} />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(6,18,23,0.85) 0%, rgba(6,18,23,0.3) 50%, rgba(6,18,23,0.1) 100%)" }} />
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
                <span className="arabic-text" style={{ color: "#fff", fontSize: "clamp(28px, 4vw, 36px)", fontWeight: 600, textAlign: "center", textShadow: "0 2px 12px rgba(0,0,0,0.6)", marginTop: "auto", marginBottom: 30 }}>إِنَّمَا يَعْمُرُ مَسَاجِدَ اللَّهِ</span>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Jumuah + About */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "72px 24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 48, alignItems: "start" }}>

          {/* Jumuah Card */}
          <ScrollReveal delay={0.3} style={{ background: `linear-gradient(145deg,${ICH.primaryDark},${ICH.primary})`, borderRadius: 8, padding: "36px 32px", color: "#fff", position: "relative", overflow: "hidden" }}>
            {/* Background pattern */}
            <div className="geo-bg" style={{ position: "absolute", inset: 0, opacity: 0.5 }} />
            <div style={{ position: "relative" }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".14em", textTransform: "uppercase", color: ICH.accent, marginBottom: 6, fontFamily: "Inter,sans-serif" }}>Every Friday</div>
              <h2 style={{ fontFamily: "Cormorant Garamond,serif", fontSize: 34, fontWeight: 600, color: "#fff", marginBottom: 24 }}>Jumuah Prayer</h2>
              <div style={{ borderTop: `1px solid rgba(255,255,255,.12)`, marginBottom: 16 }} />
              {jumuahDisplay.map(({ label, time }) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,.1)" }}>
                  <span style={{ fontSize: 13, color: "rgba(255,255,255,.65)" }}>{label}</span>
                  <span style={{ fontSize: 14, fontWeight: 500, color: "#fff" }}>{time}</span>
                </div>
              ))}
              <div style={{ marginTop: 24 }}>
                <Btn variant="ghost-dark" href="/prayer-times" size="sm">Full Schedule →</Btn>
              </div>
            </div>
          </ScrollReveal>

          {/* About snippet */}
          <ScrollReveal delay={0.4}>
            <SectionHead label="About Us" title="A Home for the Muslim Community"
              sub="The Islamic Center of Hattiesburg (ICH) has been a cornerstone of the Muslim community in South Mississippi for decades — a welcoming space for worship, learning, and community service." />
            <div style={{ display: "flex", flexDirection: "column", gap: 18, marginBottom: 28 }}>
              {[
                { icon: "🤝", title: "Community Programs",    desc: "Regular halaqas, youth programs, and interfaith outreach" },
                { icon: "📖", title: "Islamic Education",     desc: "Quran classes, Islamic studies, and weekend school" },
                { icon: "🏗️", title: "Oak Grove Project",     desc: "Building a new masjid facility to serve our growing community" },
              ].map((item) => (
                <div key={item.title} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                  <div style={{ width: 42, height: 42, borderRadius: 6, background: `${ICH.primary}14`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{item.icon}</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: ICH.text, marginBottom: 2 }}>{item.title}</div>
                    <div style={{ fontSize: 13, color: ICH.textMuted, lineHeight: 1.6 }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Btn variant="primary" href="/about">Learn More</Btn>
              <Btn variant="outline" href={settings.oakGroveUrl || "https://www.launchgood.com/v4/campaign/help_build_the_islamic_center_of_oak_grove"}>Oak Grove Project</Btn>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Support the Masjid */}
      <section style={{ padding: "100px 24px", background: "#f8fcfb", borderTop: `1px solid ${ICH.border}` }}>
        <ScrollReveal delay={0.1} y={30} className="max-w-[1200px] mx-auto text-center">
          <SectionHead label="Support Us" title="Donate & Sustain" />
          <p style={{ maxWidth: 600, margin: "0 auto 36px", color: ICH.textMuted, lineHeight: 1.7 }}>
            The masjid relies entirely on the generous contributions of the community to cover operating expenses and fund our programs.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
            <Btn variant="primary" href="/donate">Support ICH Online</Btn>
            <Btn variant="outline" href="/donate">Other Ways to Give</Btn>
          </div>
        </ScrollReveal>
      </section>

      {/* Donate CTA */}
      <section style={{ background: ICH.bgCard, borderTop: `1px solid ${ICH.border}`, borderBottom: `1px solid ${ICH.border}` }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "64px 24px", textAlign: "center" }}>
          <GoldLabel>Support ICH</GoldLabel>
          <h2 style={{ fontFamily: "Cormorant Garamond,serif", fontSize: "clamp(28px,4vw,42px)", fontWeight: 600, marginBottom: 14 }}>Help Build Our Community</h2>
          <p style={{ fontSize: 16, color: ICH.textMuted, maxWidth: 520, margin: "0 auto 32px", lineHeight: 1.75 }}>
            Your donations support daily operations, the Oak Grove masjid project, Islamic education, and community outreach programs.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 10, marginBottom: 28 }}>
            {["General Sadaqah", "Zakat", "Oak Grove Project", "Quran Programs"].map((cat) => (
              <Btn key={cat} href={`/donate?category=${cat.toLowerCase().replace(/ /g, "-")}`} variant="muted" style={{ padding: "8px 18px", fontSize: 13 }}>
                {cat}
              </Btn>
            ))}
          </div>
          <Btn variant="gold" href="/donate" size="lg">♥ Donate Now</Btn>
        </div>
      </section>

      {/* Full Prayer Times Widget */}
      <section style={{ maxWidth: 1200, margin: "0 auto", padding: "72px 24px" }}>
        <SectionHead label="Prayer Times" title="Daily Prayer Schedule" sub="Hattiesburg, Mississippi — times updated regularly" center />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 12 }}>
          {prayersAll.map((p, idx) => {
            const isCur = idx === curIdx;
            const isNext = idx === nextIdx;
            const iqama = jamaatDisplay[p.key];
            return (
              <div key={p.key} style={{
                textAlign: "center", padding: "24px 12px", borderRadius: 6,
                background: isCur ? ICH.primary : isNext ? `${ICH.primary}0e` : "#fff",
                border: `1px solid ${isCur ? ICH.primary : isNext ? ICH.primary + "44" : ICH.border}`,
                position: "relative", boxShadow: isCur ? "0 6px 24px rgba(20,92,112,.25)" : "none",
                transform: isCur ? "scale(1.04)" : "scale(1)",
                transition: "all .2s",
              }}>
                {isCur && <div style={{ position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)", background: ICH.accent, color: "#fff", fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 10, fontFamily: "Inter,sans-serif", letterSpacing: ".06em" }}>NOW</div>}
                {isNext && !isCur && <div style={{ position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)", background: ICH.bgCard2, color: ICH.primary, fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 10, border: `1px solid ${ICH.primary}33`, fontFamily: "Inter,sans-serif" }}>NEXT</div>}
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: isCur ? "rgba(255,255,255,.7)" : ICH.textMuted, marginBottom: 6, fontFamily: "Inter,sans-serif" }}>{p.name}</div>
                <div style={{ marginBottom: 2 }}>
                  <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: ".07em", textTransform: "uppercase", color: isCur ? "rgba(255,255,255,.5)" : ICH.textMuted, fontFamily: "Inter,sans-serif", marginBottom: 1 }}>Adhan</div>
                  <div style={{ fontFamily: "Cormorant Garamond,serif", fontSize: 22, fontWeight: 600, color: isCur ? "#fff" : ICH.text }}>{p.display}</div>
                </div>
                {iqama && (
                  <div style={{ marginTop: 6, paddingTop: 6, borderTop: `1px solid ${isCur ? "rgba(255,255,255,.2)" : ICH.border}` }}>
                    <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: ".07em", textTransform: "uppercase", color: isCur ? "rgba(255,255,255,.5)" : ICH.textMuted, fontFamily: "Inter,sans-serif", marginBottom: 1 }}>Iqama</div>
                    <div style={{ fontFamily: "Cormorant Garamond,serif", fontSize: iqama === "After Adhan" ? 13 : 19, fontWeight: 600, color: isCur ? ICH.accent : ICH.goldDark }}>{iqama}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div style={{ textAlign: "center", marginTop: 24 }}>
          <Btn variant="outline" href="/prayer-times">View Full Schedule</Btn>
        </div>
      </section>
    </div>
  );
}
