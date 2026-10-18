"use client";

import React from "react";
import type { HalalResourcesItem, ResourceLink } from "@/lib/store";
import { ICH, Btn, GoldLabel, Card } from "./ui-primitives";

export default function ResourcesClient({ halalResources, resourceLinks }: {
  halalResources: HalalResourcesItem;
  resourceLinks: ResourceLink[];
}) {
  // Group links by category, sorted by order
  const grouped = resourceLinks.reduce<Record<string, { icon: string; links: ResourceLink[] }>>((acc, link) => {
    if (!acc[link.category]) {
      acc[link.category] = { icon: link.categoryIcon, links: [] };
    }
    acc[link.category].links.push(link);
    return acc;
  }, {});

  // Sort links within each group
  Object.values(grouped).forEach((group) => {
    group.links.sort((a, b) => a.order - b.order);
  });

  return (
    <div className="page-enter" style={{ maxWidth: 900, margin: "0 auto", padding: "52px 24px 80px" }}>
      <div style={{ marginBottom: 44 }}>
        <GoldLabel>Learning &amp; Growth</GoldLabel>
        <h1 style={{ fontFamily: "Cormorant Garamond,serif", fontSize: "clamp(32px,5vw,52px)", fontWeight: 600, marginBottom: 10 }}>Islamic Resources</h1>
        <p style={{ fontSize: 16, color: ICH.textMuted }}>Curated resources for learning, practice, and community connection.</p>
      </div>

      <div style={{ background: ICH.bgCard, border: `1px solid ${ICH.border}`, borderRadius: 8, padding: "28px 32px", textAlign: "center", marginBottom: 44 }}>
        <div className="arabic-text" style={{ fontSize: "clamp(20px,2.8vw,28px)", color: ICH.primary, marginBottom: 10, direction: "rtl", lineHeight: 1.8, textAlign: "right" }}>
          اقْرَأْ بِاسْمِ رَبِّكَ الَّذِي خَلَقَ
        </div>
        <p style={{ fontSize: 13, color: ICH.textMuted, fontStyle: "italic" }}>"Read in the name of your Lord who created." — Quran 96:1</p>
      </div>

      {/* Local Halal Resources */}
      <div style={{ marginBottom: 44 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <span style={{ fontSize: 24 }}>🍽️</span>
          <h2 style={{ fontFamily: "Cormorant Garamond,serif", fontSize: 28, fontWeight: 600, color: ICH.text }}>Local Halal Sources</h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 16 }}>
          <Card hover>
            <h3 style={{ fontFamily: "Inter,sans-serif", fontSize: 13, fontWeight: 700, color: ICH.primary, marginBottom: 12, textTransform: "uppercase", letterSpacing: ".05em" }}>Restaurants</h3>
            <div style={{ fontSize: 14, color: ICH.textMuted, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
              {halalResources?.restaurants || "No list provided yet."}
            </div>
          </Card>
          <Card hover>
            <h3 style={{ fontFamily: "Inter,sans-serif", fontSize: 13, fontWeight: 700, color: ICH.primary, marginBottom: 12, textTransform: "uppercase", letterSpacing: ".05em" }}>Meat Supply</h3>
            <div style={{ fontSize: 14, color: ICH.textMuted, whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
              {halalResources?.meatSupply || "No list provided yet."}
            </div>
          </Card>
        </div>
      </div>

      {/* Dynamic Resource Links */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 16, marginBottom: 36 }}>
        {Object.entries(grouped).map(([category, { icon, links }]) => (
          <Card key={category} hover>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <span style={{ fontSize: 20 }}>{icon}</span>
              <h3 style={{ fontFamily: "Cormorant Garamond,serif", fontSize: 20, fontWeight: 600, color: ICH.primary }}>{category}</h3>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {links.map((link) => (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 13, color: ICH.textMuted, textDecoration: "none", transition: "color .15s", lineHeight: 1.55 }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = ICH.primary; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = ICH.textMuted; }}
                >
                  <span style={{ flexShrink: 0, marginTop: 1, color: ICH.gold }}>↗</span>
                  {link.label}
                </a>
              ))}
            </div>
          </Card>
        ))}
      </div>

      <div style={{ padding: 24, background: ICH.bgCard, border: `1px solid ${ICH.border}`, borderRadius: 6 }}>
        <h3 style={{ fontFamily: "Cormorant Garamond,serif", fontSize: 20, marginBottom: 6 }}>Suggest a Resource</h3>
        <p style={{ fontSize: 13, color: ICH.textMuted, marginBottom: 14, lineHeight: 1.65 }}>Have a useful Islamic resource to share with the community? We&rsquo;d love to hear from you.</p>
        <Btn variant="outline" href="/contact" size="sm">Send a Suggestion →</Btn>
      </div>
    </div>
  );
}
