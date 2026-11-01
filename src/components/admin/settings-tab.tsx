"use client";

import React, { useEffect, useState } from "react";
import { Settings } from "lucide-react";
import type { SiteSettings } from "@/lib/store";
import { DEFAULT_HERO_TEXT } from "@/lib/site-defaults";
import { ICH } from "../ui-primitives";
import { api, useAction, useDirty, TabHeader, Field, Button, StatusNote, inputStyle, panelStyle, LIVE_NOTE } from "./ui";

type Key = Exclude<keyof SiteSettings, "id" | "maghribDisplay">;
type FieldDef = { key: Key; label: string; hint?: React.ReactNode; textarea?: boolean; placeholder?: string; type?: string; where: string };

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

const SECTIONS: { title: string; description: string; fields: FieldDef[] }[] = [
  {
    title: "Contact & location",
    description: "Shown in the footer, on the Contact page and on the About page.",
    fields: [
      { key: "address", label: "Street address", where: "Footer, Contact, About", placeholder: "211 N 25th Avenue, Hattiesburg, MS 39401" },
      { key: "addressUrl", label: "Map link", where: "Address links", hint: "Opens when someone taps the address. Use “Build from address” unless you have a specific Google Maps link.", placeholder: "https://www.google.com/maps/…" },
      { key: "phone", label: "Phone (optional)", where: "Contact page", type: "tel", placeholder: "(601) 555-0000" },
      { key: "email", label: "Contact email", where: "Footer, Contact page", type: "email" },
      { key: "jumuahLocation", label: "Jumuah location", where: "Home page Jumuah card", placeholder: "211 N 25th Ave" },
    ],
  },
  {
    title: "Home page & branding",
    description: "The welcome text and the masjid's short name.",
    fields: [
      { key: "heroText", label: "Welcome text", where: "Home page, under the masjid name", textarea: true, placeholder: DEFAULT_HERO_TEXT },
      { key: "masjidShortName", label: "Short name", where: "Logo text and small labels", placeholder: "ICH" },
      { key: "footerDescription", label: "Footer description", where: "Bottom of every page", textarea: true },
      { key: "facebookUrl", label: "Facebook page", where: "Footer, Contact page", type: "url", placeholder: "https://www.facebook.com/…" },
      { key: "instagramUrl", label: "Instagram profile", where: "Footer, Contact page", type: "url", placeholder: "https://www.instagram.com/…" },
    ],
  },
  {
    title: "About page",
    description: "",
    fields: [{ key: "missionText", label: "Mission statement", where: "About page", textarea: true }],
  },
  {
    title: "New masjid project",
    description: "The fundraising campaign shown on the Home, About and Donate pages.",
    fields: [
      { key: "oakGroveTitle", label: "Project title", where: "About page" },
      { key: "oakGroveDescription", label: "Project description", where: "About page", textarea: true },
      { key: "oakGroveUrl", label: "Fundraiser link (LaunchGood or similar)", where: "“Support” buttons", type: "url" },
    ],
  },
  {
    title: "Online donations (Zeffy)",
    description: "The donation forms embedded on the Donate page. Paste the full link to the form from your Zeffy dashboard — the ID is filled in automatically.",
    fields: [
      { key: "zeffyOneTimeId", label: "One-time donation form", where: "Donate page" },
      { key: "zeffyMonthlyId", label: "Monthly donation form", where: "Donate page" },
    ],
  },
];

export default function SettingsTab() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [original, setOriginal] = useState<SiteSettings | null>(null);
  const [loadError, setLoadError] = useState("");
  const { busy, status, setStatus, run } = useAction();

  const load = async () => {
    try {
      const d = await api<{ settings: SiteSettings }>("/api/admin/settings?fresh=1");
      setLoadError("");
      setSettings(d.settings);
      setOriginal(d.settings);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Couldn't load settings.");
    }
  };
  // Load after mount; state is only set once the request resolves.
  useEffect(() => { void Promise.resolve().then(load); }, []);

  const changed = settings && original ? (SECTIONS.flatMap((s) => s.fields).filter((f) => (settings[f.key] ?? "") !== (original[f.key] ?? "")).map((f) => f.label)) : [];
  const dirty = changed.length > 0;
  useDirty("settings", dirty);

  if (!settings) {
    return (
      <div style={{ ...panelStyle, alignItems: "center", textAlign: "center", color: loadError ? "#b71c1c" : ICH.textMuted }}>
        {loadError ? <>Couldn&apos;t load settings: {loadError}<Button variant="secondary" onClick={load}>Try again</Button></> : "Loading settings…"}
      </div>
    );
  }

  const set = (key: Key, value: string) => {
    let v = value;
    if (key === "zeffyOneTimeId" || key === "zeffyMonthlyId") {
      const m = UUID_RE.exec(value);
      if (m) v = m[0].toLowerCase();
    }
    setSettings({ ...settings, [key]: v });
  };

  const save = () => run(async () => {
    const payload: Record<string, string> = {};
    for (const f of SECTIONS.flatMap((s) => s.fields)) {
      let v = String(settings[f.key] ?? "").trim();
      if ((f.type === "url" || f.key === "addressUrl" || f.key === "oakGroveUrl") && v && !/^[a-z]+:/i.test(v)) v = `https://${v}`;
      payload[f.key] = v;
    }
    const d = await api<{ settings: SiteSettings }>("/api/admin/settings", "POST", payload);
    setSettings(d.settings);
    setOriginal(d.settings);
  }, `Settings saved. ${LIVE_NOTE}`, "/");

  const mapsFromAddress = () => {
    if (!settings.address) return;
    set("addressUrl", `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(settings.address)}`);
  };

  return (
    <div style={{ paddingBottom: dirty ? 90 : 0 }}>
      <TabHeader icon={<Settings className="h-6 w-6" />} title="Site Settings" description="Contact details, home page text, fundraising and donation links. Each field says where it appears." siteHref="/" />

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {SECTIONS.map((section) => (
          <div key={section.title} style={panelStyle}>
            <div>
              <h3 style={{ fontFamily: "Cormorant Garamond,serif", fontSize: 21, fontWeight: 600, color: ICH.primary }}>{section.title}</h3>
              {section.description && <p style={{ fontSize: 13.5, color: ICH.textMuted, marginTop: 2 }}>{section.description}</p>}
            </div>
            {section.fields.map((f) => {
              const value = String(settings[f.key] ?? "");
              const isZeffy = f.key === "zeffyOneTimeId" || f.key === "zeffyMonthlyId";
              const hint = (
                <>
                  <span style={{ color: ICH.primary }}>Appears on: {f.where}.</span> {f.hint}
                  {isZeffy && value && !UUID_RE.test(value) && <span style={{ color: "#b71c1c" }}> This doesn&apos;t look like a Zeffy form link.</span>}
                  {isZeffy && UUID_RE.test(value) && <> <a href={`https://www.zeffy.com/en-US/donation-form/${value}`} target="_blank" rel="noopener noreferrer" style={{ color: ICH.primary }}>Test this form ↗</a></>}
                  {(f.type === "url" || f.key === "addressUrl") && value && /^https?:\/\//.test(value) && <> <a href={value} target="_blank" rel="noopener noreferrer" style={{ color: ICH.primary }}>Open link ↗</a></>}
                </>
              );
              return (
                <Field key={f.key} label={`${f.label}${(settings[f.key] ?? "") !== (original?.[f.key] ?? "") ? " •" : ""}`} htmlFor={`set-${f.key}`} hint={hint}>
                  {f.textarea ? (
                    <textarea id={`set-${f.key}`} rows={f.key === "missionText" || f.key === "oakGroveDescription" ? 5 : 3} value={value} onChange={(e) => set(f.key, e.target.value)} placeholder={f.placeholder} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.55 }} />
                  ) : (
                    <div style={{ display: "flex", gap: 8 }}>
                      <input id={`set-${f.key}`} type={f.type === "url" ? "text" : f.type || "text"} inputMode={f.type === "url" ? "url" : undefined} value={value} onChange={(e) => set(f.key, e.target.value)} placeholder={isZeffy ? "Paste the Zeffy form link" : f.placeholder} style={inputStyle} />
                      {f.key === "addressUrl" && <Button variant="secondary" onClick={mapsFromAddress} disabled={!settings.address}>Build from address</Button>}
                    </div>
                  )}
                </Field>
              );
            })}
          </div>
        ))}

        <div style={{ ...panelStyle, background: ICH.bgCard }}>
          <h3 style={{ fontFamily: "Cormorant Garamond,serif", fontSize: 21, fontWeight: 600, color: ICH.primary }}>Looking for Maghrib iqama?</h3>
          <p style={{ fontSize: 14, color: ICH.textMuted }}>It&apos;s now set in one place — the <a href="/admin?tab=prayer" style={{ color: ICH.primary, fontWeight: 600 }}>Prayer Times</a> tab.</p>
        </div>
      </div>

      {/* Save bar stays on screen whenever there are unsaved changes. */}
      {dirty && (
        <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 50, background: "#fff", borderTop: `1px solid ${ICH.border}`, boxShadow: "0 -6px 20px rgba(0,0,0,.08)", padding: "12px 16px" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", gap: 12, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
            <span style={{ fontSize: 14, color: ICH.text }}>
              <strong>Unsaved changes:</strong> {changed.slice(0, 3).join(", ")}{changed.length > 3 ? ` +${changed.length - 3} more` : ""}
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              <Button variant="secondary" onClick={() => setSettings(original)} disabled={busy}>Discard</Button>
              <Button onClick={save} busy={busy}>Save settings</Button>
            </div>
          </div>
        </div>
      )}
      <div style={{ position: "relative", zIndex: 61 }}><StatusNote status={status} onClose={() => setStatus(null)} /></div>
    </div>
  );
}
