"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Bell, BookOpen, Calendar, Clock, HeartHandshake, ImageIcon, LayoutDashboard, LogOut, Settings, UtensilsCrossed, Users } from "lucide-react";
import type { AdminUser } from "@/lib/auth";
import { ICH } from "../ui-primitives";
import { DirtyProvider, useDirtyCheck } from "./ui";
import OverviewTab from "./overview-tab";
import AnnouncementsTab from "./announcements-tab";
import EventsTab from "./events-tab";
import PrayerTab from "./prayer-tab";
import BoardTab from "./board-tab";
import ResourcesTab from "./resources-tab";
import ImpactTab from "./impact-tab";
import ProgramsTab from "./programs-tab";
import SettingsTab from "./settings-tab";

const TABS = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "prayer", label: "Prayer Times", icon: Clock },
  { key: "announcements", label: "Announcements", icon: Bell },
  { key: "events", label: "Events", icon: Calendar },
  { key: "programs", label: "Programs", icon: BookOpen },
  { key: "board", label: "Board", icon: Users },
  { key: "impact", label: "Impact Stories", icon: HeartHandshake },
  { key: "resources", label: "Resources Page", icon: UtensilsCrossed },
  { key: "settings", label: "Site Settings", icon: Settings },
] as const;

export type TabKey = typeof TABS[number]["key"];
const isTab = (v: string | null): v is TabKey => !!v && TABS.some((t) => t.key === v);

function Dashboard({ user }: { user: AdminUser }) {
  const [tab, setTab] = useState<TabKey>("overview");
  const hasUnsaved = useDirtyCheck();

  // The tab lives in the URL (?tab=events) so refresh/back keep your place.
  useEffect(() => {
    const read = () => {
      const t = new URLSearchParams(window.location.search).get("tab");
      setTab(isTab(t) ? t : "overview");
    };
    read();
    window.addEventListener("popstate", read);
    return () => window.removeEventListener("popstate", read);
  }, []);

  const go = useCallback((t: TabKey) => {
    if (t === tab) return;
    if (hasUnsaved() && !window.confirm("You have unsaved changes on this tab. Leave without saving?")) return;
    setTab(t);
    const url = t === "overview" ? "/admin" : `/admin?tab=${t}`;
    window.history.pushState(null, "", url);
    window.scrollTo({ top: 0 });
  }, [tab, hasUnsaved]);

  const logout = async () => {
    if (hasUnsaved() && !window.confirm("You have unsaved changes. Log out anyway?")) return;
    await fetch("/api/admin/logout", { method: "POST" }).catch(() => {});
    window.location.href = "/admin/login";
  };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 16px 80px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "Cormorant Garamond,serif", fontSize: 32, fontWeight: 600, color: ICH.text, lineHeight: 1.1 }}>Assalamu alaikum</h1>
          <p style={{ fontSize: 14, color: ICH.textMuted, marginTop: 2 }}>Signed in as <strong style={{ color: ICH.text }}>{user.email}</strong></p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <a href="/admin/post-designer" style={{ display: "inline-flex", alignItems: "center", gap: 6, minHeight: 40, padding: "8px 14px", borderRadius: 6, fontSize: 14, fontWeight: 600, background: ICH.gold, color: "#fff", textDecoration: "none" }}>
            <ImageIcon className="h-4 w-4" /> Make a social post
          </a>
          <button type="button" onClick={logout} style={{ display: "inline-flex", alignItems: "center", gap: 6, minHeight: 40, padding: "8px 14px", borderRadius: 6, fontSize: 14, fontWeight: 600, background: "#fff", color: ICH.primary, border: `1px solid ${ICH.primary}`, cursor: "pointer" }}>
            <LogOut className="h-4 w-4" /> Log out
          </button>
        </div>
      </div>

      {/* Wraps into a grid on phones instead of hiding tabs off-screen. */}
      <nav aria-label="Dashboard sections" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 6, background: ICH.bgCard, border: `1px solid ${ICH.border}`, borderRadius: 10, padding: 6, marginBottom: 28 }}>
        {TABS.map(({ key, label, icon: Icon }) => {
          const active = tab === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => go(key)}
              aria-current={active ? "page" : undefined}
              style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 42, padding: "8px 12px", borderRadius: 6, fontSize: 14, fontWeight: 600, fontFamily: "Inter,sans-serif", cursor: "pointer", border: "none", textAlign: "left", background: active ? ICH.primary : "transparent", color: active ? "#fff" : ICH.text }}
            >
              <Icon className="h-4 w-4" style={{ flexShrink: 0, color: active ? "#fff" : ICH.primary }} />
              {label}
            </button>
          );
        })}
      </nav>

      {tab === "overview" && <OverviewTab go={go} />}
      {tab === "prayer" && <PrayerTab />}
      {tab === "announcements" && <AnnouncementsTab />}
      {tab === "events" && <EventsTab />}
      {tab === "programs" && <ProgramsTab />}
      {tab === "board" && <BoardTab />}
      {tab === "impact" && <ImpactTab />}
      {tab === "resources" && <ResourcesTab />}
      {tab === "settings" && <SettingsTab />}
    </div>
  );
}

export default function AdminDashboard({ user }: { user: AdminUser }) {
  return (
    <DirtyProvider>
      <Dashboard user={user} />
    </DirtyProvider>
  );
}
