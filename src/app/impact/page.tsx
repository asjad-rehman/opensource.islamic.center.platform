import React from "react";
import { Metadata } from "next";
import { getCachedImpact } from "@/lib/cached-content";
import { GoldLabel, SectionHead, Card, ScrollReveal } from "@/components/ui-primitives";
import { ICH } from "@/lib/theme";

export const metadata: Metadata = {
  title: "Our Impact",
  description: "Explore the community programs, charity milestones, and construction updates of the Islamic Center of Hattiesburg.",
};

export const revalidate = 3600;

export default async function ImpactPage() {
  const impactItems = await getCachedImpact();

  return (
    <div className="page-enter">
      {/* Hero Banner */}
      <div style={{ background: `linear-gradient(160deg,${ICH.primaryDark},${ICH.primary})`, padding: "64px 24px 56px", position: "relative", overflow: "hidden" }}>
        <div className="geo-bg" style={{ position: "absolute", inset: 0, opacity: 0.55 }} />
        <div style={{ maxWidth: 800, margin: "0 auto", position: "relative" }}>
          <GoldLabel>Islamic Center of Hattiesburg</GoldLabel>
          <h1 style={{ fontFamily: "Cormorant Garamond,serif", fontSize: "clamp(34px,5vw,56px)", fontWeight: 600, color: "#fff", marginBottom: 14 }}>Our Impact</h1>
          <p style={{ fontSize: "clamp(15px,1.6vw,18px)", color: "rgba(255,255,255,.75)", lineHeight: 1.8, maxWidth: 560 }}>
            Discover how your donations and volunteer support are helping to build a stronger community in Hattiesburg and the Pine Belt area.
          </p>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "60px 24px 80px" }}>
        {/* Core Stats overview */}
        <section style={{ marginBottom: 60 }}>
          <ScrollReveal>
            <div style={{ border: `1px solid ${ICH.gold}44`, borderRadius: 8, padding: "36px 40px", background: `${ICH.gold}07`, position: "relative", overflow: "hidden" }}>
              <div className="geo-bg" style={{ position: "absolute", inset: 0, opacity: 0.6 }} />
              <div style={{ position: "relative" }}>
                <h2 style={{ fontFamily: "Cormorant Garamond,serif", fontSize: 28, fontWeight: 600, marginBottom: 12 }}>Serving the Community</h2>
                <p style={{ fontSize: 15, color: ICH.textMuted, lineHeight: 1.8 }}>
                  Through your generous sadaqah and zakat, we provide educational programs, maintain daily prayers, distribute food and supplies to those in need, and continue to expand our facilities to serve Hattiesburg. Below are some highlights of our collective impact.
                </p>
              </div>
            </div>
          </ScrollReveal>
        </section>

        {/* Dynamic Impact Items */}
        <section>
          <ScrollReveal delay={0.1}>
            <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
              {impactItems.length === 0 ? (
                <div style={{ padding: 40, textAlign: "center", color: ICH.textMuted, border: `1px dashed ${ICH.border}`, borderRadius: 8 }}>
                  No impact stories posted yet. Check back soon!
                </div>
              ) : (
                impactItems.map((item, idx) => (
                  <Card key={item.id} hover className="impact-card" style={{ padding: 0, overflow: "hidden", display: "flex", flexWrap: "wrap", flexDirection: idx % 2 === 0 ? "row" : "row-reverse" }}>
                    {item.image && (
                      <div className="impact-media" style={{ flex: "1 1 300px", minHeight: 240, position: "relative", background: ICH.bgCard2 }}>
                        <img
                          src={item.image}
                          alt={item.title}
                          style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", inset: 0 }}
                        />
                      </div>
                    )}
                    <div style={{ flex: "1 1 340px", padding: "32px 36px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                      {item.count && (
                        <div style={{ fontSize: 46, fontWeight: 700, color: ICH.gold, fontFamily: "Cormorant Garamond,serif", lineHeight: 1, marginBottom: 12 }}>
                          {item.count}
                        </div>
                      )}
                      <h3 style={{ fontFamily: "Cormorant Garamond,serif", fontSize: 25, fontWeight: 600, color: ICH.text, marginBottom: 12 }}>
                        {item.title}
                      </h3>
                      <div style={{ width: 34, height: 2, background: `${ICH.gold}66`, marginBottom: 14 }} />
                      <p style={{ fontSize: 14.5, color: ICH.textMuted, lineHeight: 1.75 }}>
                        {item.description}
                      </p>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </ScrollReveal>
        </section>
      </div>
    </div>
  );
}
