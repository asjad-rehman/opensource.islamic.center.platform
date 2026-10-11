"use client";

import { useState, useEffect } from "react";
import { LogOut, Plus, Bell, Calendar, Clock, Trash2, Edit2, Users, Settings, BookOpen, Link2, ImageIcon } from "lucide-react";
import { AdminUser } from "@/lib/auth";
import { ICH, Btn, Card } from "./ui-primitives";
import { parseLocalDate } from "@/lib/utils";
import type { Announcement, BoardMember, EventItem, ImpactItem, Program, ResourceLink, SiteSettings } from "@/lib/store";

export default function AdminDashboard({ user }: { user: AdminUser }) {
  const [activeTab, setActiveTab] = useState<"announcements" | "events" | "prayer" | "board" | "resources" | "impact" | "programs" | "settings">("announcements");

  const logout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.href = "/admin/login";
  };

  const tabButtonStyle = (tab: "announcements" | "events" | "prayer" | "board" | "resources" | "impact" | "programs" | "settings") => ({
    padding: "8px 20px",
    borderRadius: 4,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "Inter,sans-serif",
    background: activeTab === tab ? ICH.primary : "transparent",
    color: activeTab === tab ? "#fff" : ICH.textMuted,
    border: "none",
    transition: "all .15s",
    whiteSpace: "nowrap" as const,
    flexShrink: 0,
  });

  return (
    <div className="page-enter" style={{ maxWidth: 1000, margin: "0 auto", padding: "52px 24px 80px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 36, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: "Cormorant Garamond,serif", fontSize: 36, fontWeight: 600, color: ICH.text }}>Admin Dashboard</h1>
          <p style={{ fontSize: 13, color: ICH.textMuted }}>Welcome back, <strong style={{ color: ICH.text }}>{user.name}</strong></p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <Btn href="/admin/post-designer" variant="gold" style={{ fontSize: 13, gap: 5, padding: "8px 16px" }}>
            <ImageIcon className="h-4 w-4" />
            Post Designer
          </Btn>
          <Btn variant="outline" onClick={logout} style={{ fontSize: 13, gap: 5, padding: "8px 16px" }}>
            <LogOut className="h-4 w-4" />
            Logout
          </Btn>
        </div>
      </div>

      {/* Tabs Row */}
      <div className="scroll-tabs" style={{ display: "flex", gap: 8, background: ICH.bgCard, border: `1px solid ${ICH.border}`, borderRadius: 6, padding: 6, marginBottom: 36, maxWidth: "100%" }}>
        {(["announcements", "events", "prayer", "board", "resources", "impact", "programs", "settings"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={tabButtonStyle(tab)}
          >
            {tab === "prayer" ? "Prayer Times" : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      {activeTab === "announcements" && <AnnouncementsTab />}
      {activeTab === "events" && <EventsTab />}
      {activeTab === "prayer" && <PrayerTimesTab />}
      {activeTab === "board" && <BoardTab />}
      {activeTab === "resources" && <ResourcesTab />}
      {activeTab === "impact" && <ImpactTab />}
      {activeTab === "programs" && <ProgramsTab />}
      {activeTab === "settings" && <SettingsTab />}
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "10px 14px",
  border: `1px solid ${ICH.border}`,
  borderRadius: 4,
  fontSize: 14,
  fontFamily: "Inter,sans-serif",
  background: "#fff",
  color: ICH.text,
  outline: "none",
};

const labelStyle = {
  display: "block",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: ".08em",
  textTransform: "uppercase" as const,
  color: ICH.textMuted,
  fontFamily: "Inter,sans-serif",
  marginBottom: 6,
};

// Shared fetch helper: throws with the server's error message so callers can
// surface it instead of silently swallowing a failed save.
async function saveRequest(url: string, method: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || `Request failed (${res.status})`);
  }
  return data;
}

// Small inline banner for surfacing a save/delete error to the admin.
function ErrorNote({ msg }: { msg: string }) {
  if (!msg) return null;
  return (
    <div style={{ fontSize: 13, color: "#c62828", background: "#fdf3f3", border: "1px solid #f5caca", padding: "9px 13px", borderRadius: 4, fontFamily: "Inter,sans-serif", lineHeight: 1.5 }}>
      ⚠ {msg}
    </div>
  );
}

function AnnouncementsTab() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [priority, setPriority] = useState<"normal" | "urgent">("normal");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/announcements")
      .then(r => r.json())
      .then(d => setAnnouncements(d.announcements || []));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const isEdit = !!editingId;
    try {
      const data = await saveRequest("/api/admin/announcements", isEdit ? "PUT" : "POST",
        isEdit ? { id: editingId, title, body, priority } : { title, body, priority });
      if (isEdit) {
        setAnnouncements(prev => prev.map(a => a.id === editingId ? data.announcement : a));
      } else {
        setAnnouncements(prev => [data.announcement, ...prev]);
      }
      setTitle(""); setBody(""); setPriority("normal"); setEditingId(null);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save announcement");
    }
  };

  const handleEdit = (a: Announcement) => {
    setEditingId(a.id);
    setTitle(a.title);
    setBody(a.body);
    setPriority(a.priority || "normal");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setTitle(""); setBody(""); setPriority("normal");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete announcement?")) return;
    setError("");
    try {
      await saveRequest(`/api/admin/announcements?id=${id}`, "DELETE");
      setAnnouncements(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete announcement");
    }
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <Bell className="h-5 w-5" style={{ color: ICH.primary }} />
        <h2 style={{ fontFamily: "Cormorant Garamond,serif", fontSize: 24, fontWeight: 600 }}>Announcements</h2>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 32 }}>
        {/* Form */}
        <form onSubmit={handleSave} style={{ background: "#fff", border: `1px solid ${ICH.border}`, borderRadius: 8, padding: "32px 36px", display: "flex", flexDirection: "column", gap: 20, height: "fit-content" }}>
          <h3 style={{ fontFamily: "Cormorant Garamond,serif", fontSize: 18, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, color: ICH.primary }}>
            {editingId ? <Edit2 className="h-4 w-4" /> : <Plus className="h-4 w-4" />} {editingId ? "Edit Announcement" : "New Announcement"}
          </h3>
          
          <div>
            <label style={labelStyle}>Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              style={inputStyle}
              placeholder="Announcement title"
            />
          </div>
          
          <div>
            <label style={labelStyle}>Message</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
              rows={3}
              style={{ ...inputStyle, resize: "vertical" }}
              placeholder="Announcement text..."
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <label style={{ ...labelStyle, marginBottom: 0 }}>Priority:</label>
            <div style={{ display: "flex", gap: 16 }}>
              {(["normal", "urgent"] as const).map((p) => (
                <label key={p} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer", fontFamily: "Inter,sans-serif", color: ICH.text }}>
                  <input
                    type="radio"
                    name="priority"
                    value={p}
                    checked={priority === p}
                    onChange={() => setPriority(p)}
                    style={{ accentColor: ICH.primary }}
                  />
                  <span style={{ textTransform: "capitalize" }}>{p}</span>
                </label>
              ))}
            </div>
          </div>

          <ErrorNote msg={error} />

          <div style={{ display: "flex", gap: 12 }}>
            <Btn type="submit" variant="primary" style={{ width: "fit-content" }}>
              {saved ? "Saved!" : (editingId ? "Update Announcement" : "Save Announcement")}
            </Btn>
            {editingId && (
              <Btn variant="outline" onClick={cancelEdit} style={{ width: "fit-content" }}>
                Cancel Edit
              </Btn>
            )}
          </div>
        </form>

        {/* List */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <h3 style={{ fontFamily: "Inter,sans-serif", fontSize: 13, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: ICH.textMuted, marginBottom: 8 }}>
            Current Announcements
          </h3>
          {announcements.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", color: ICH.textMuted, border: `1px dashed ${ICH.border}`, borderRadius: 8 }}>
              No announcements
            </div>
          ) : announcements.map(a => (
            <div key={a.id} style={{ background: "#fff", border: `1px solid ${ICH.border}`, borderRadius: 6, padding: "16px 20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                <div>
                  <h4 style={{ fontFamily: "Cormorant Garamond,serif", fontSize: 18, fontWeight: 600, color: ICH.text, marginBottom: 4 }}>
                    {a.priority === "urgent" ? "🚨 " : ""}{a.title}
                  </h4>
                  <p style={{ fontSize: 13, color: ICH.textMuted, lineHeight: 1.6 }}>{a.body}</p>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="button" onClick={() => handleEdit(a)} style={{ background: "none", border: "none", color: ICH.primary, cursor: "pointer", padding: 4 }}>
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => handleDelete(a.id)} style={{ background: "none", border: "none", color: "#e53935", cursor: "pointer", padding: 4 }}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function EventsTab() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "", description: "", date: "", time: "", location: "", category: "community", recurring: false,
  });

  useEffect(() => {
    fetch("/api/admin/events")
      .then(r => r.json())
      .then(d => setEvents(d.events || []));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const isEdit = !!editingId;
    try {
      const data = await saveRequest("/api/admin/events", isEdit ? "PUT" : "POST", { ...form, id: editingId, featured: false });
      if (isEdit) {
        setEvents(prev => prev.map(ev => ev.id === editingId ? data.event : ev).sort((a, b) => parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime()));
      } else {
        setEvents(prev => [...prev, data.event].sort((a, b) => parseLocalDate(a.date).getTime() - parseLocalDate(b.date).getTime()));
      }
      setForm({ title: "", description: "", date: "", time: "", location: "", category: "community", recurring: false });
      setEditingId(null);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save event");
    }
  };

  const handleEdit = (a: EventItem) => {
    setEditingId(a.id);
    setForm({ title: a.title, description: a.description, date: a.date, time: a.time || "", location: a.location || "", category: a.category || "community", recurring: a.recurring || false });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm({ title: "", description: "", date: "", time: "", location: "", category: "community", recurring: false });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete event?")) return;
    setError("");
    try {
      await saveRequest(`/api/admin/events?id=${id}`, "DELETE");
      setEvents(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete event");
    }
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <Calendar className="h-5 w-5" style={{ color: ICH.primary }} />
        <h2 style={{ fontFamily: "Cormorant Garamond,serif", fontSize: 24, fontWeight: 600 }}>Events</h2>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 32 }}>
        {/* Form */}
        <form onSubmit={handleSave} style={{ background: "#fff", border: `1px solid ${ICH.border}`, borderRadius: 8, padding: "32px 36px", display: "flex", flexDirection: "column", gap: 20, height: "fit-content" }}>
          <h3 style={{ fontFamily: "Cormorant Garamond,serif", fontSize: 18, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, color: ICH.primary }}>
            {editingId ? <Edit2 className="h-4 w-4" /> : <Plus className="h-4 w-4" />} {editingId ? "Edit Event" : "Add Event"}
          </h3>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
            <div>
              <label style={labelStyle}>Title</label>
              <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                style={{ ...inputStyle, height: "40px" }}
              >
                {["jumuah", "eid", "halaqa", "fundraiser", "construction", "community", "other"].map((c) => (
                  <option key={c} value={c} style={{ textTransform: "capitalize" }}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Date</label>
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Time</label>
              <input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} style={inputStyle} />
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <input type="checkbox" id="recurring" checked={form.recurring} onChange={(e) => setForm({ ...form, recurring: e.target.checked })} style={{ width: 18, height: 18 }} />
            <label htmlFor="recurring" style={{ fontSize: 15, fontWeight: 600, color: ICH.text }}>Recurring Every Week</label>
          </div>

          <div>
            <label style={labelStyle}>Location</label>
            <input type="text" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} style={inputStyle} placeholder="ICH Main Hall" />
          </div>

          <div>
            <label style={labelStyle}>Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} required style={{ ...inputStyle, resize: "vertical" }} />
          </div>

          <ErrorNote msg={error} />

          <div style={{ display: "flex", gap: 12 }}>
            <Btn type="submit" variant="primary" style={{ width: "fit-content" }}>
              {saved ? "Saved!" : (editingId ? "Update Event" : "Save Event")}
            </Btn>
            {editingId && (
              <Btn variant="outline" onClick={cancelEdit} style={{ width: "fit-content" }}>
                Cancel Edit
              </Btn>
            )}
          </div>
        </form>

        {/* List */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <h3 style={{ fontFamily: "Inter,sans-serif", fontSize: 13, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: ICH.textMuted, marginBottom: 8 }}>
            Upcoming Events
          </h3>
          {events.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", color: ICH.textMuted, border: `1px dashed ${ICH.border}`, borderRadius: 8 }}>
              No events
            </div>
          ) : events.map(a => (
            <div key={a.id} style={{ background: "#fff", border: `1px solid ${ICH.border}`, borderRadius: 6, padding: "16px 20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                <div>
                  <h4 style={{ fontFamily: "Cormorant Garamond,serif", fontSize: 18, fontWeight: 600, color: ICH.text, marginBottom: 4 }}>
                    {a.title}
                    {a.featured && <span style={{ fontSize: 10, background: ICH.gold, color: "#fff", padding: "2px 6px", borderRadius: 4, marginLeft: 6, verticalAlign: "middle" }}>Featured</span>}
                    {a.recurring && <span style={{ fontSize: 10, background: ICH.primary, color: "#fff", padding: "2px 6px", borderRadius: 4, marginLeft: 6, verticalAlign: "middle" }}>Weekly</span>}
                  </h4>
                  <div style={{ fontSize: 12, color: ICH.primary, fontWeight: 600, marginBottom: 4 }}>{a.date} {a.time && `at ${a.time}`}</div>
                  <p style={{ fontSize: 13, color: ICH.textMuted, lineHeight: 1.6 }}>{a.description}</p>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="button" onClick={() => handleEdit(a)} style={{ background: "none", border: "none", color: ICH.primary, cursor: "pointer", padding: 4 }}>
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => handleDelete(a.id)} style={{ background: "none", border: "none", color: "#e53935", cursor: "pointer", padding: 4 }}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

type JummahSlot = { khutbah: string; salah: string };

function PrayerTimesTab() {
  const PRAYER_KEYS = ["fajr", "dhuhr", "asr", "maghrib", "isha"] as const;
  const [times, setTimes] = useState<Record<typeof PRAYER_KEYS[number], string>>({ fajr: "", dhuhr: "", asr: "", maghrib: "", isha: "" });
  const [jummah, setJummah] = useState<JummahSlot[]>([{ khutbah: "", salah: "" }]);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    fetch("/api/jamaat")
      .then(r => r.json())
      .then(d => {
        if (d.data) {
          const data = d.data;
          setTimes({ fajr: data.fajr || "", dhuhr: data.dhuhr || "", asr: data.asr || "", maghrib: data.maghrib || "", isha: data.isha || "" });
          if (Array.isArray(data.jummah) && data.jummah.length) setJummah(data.jummah);
        }
      });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError("");
    try {
      const res = await fetch("/api/jamaat/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: { ...times, jummah } }),
      });
      const json = await res.json();
      if (res.ok && json.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        setSaveError(json.error || `Server error (${res.status})`);
      }
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Network error");
    }
  };

  const updateSlot = (i: number, field: keyof JummahSlot, value: string) => {
    const next = [...jummah];
    next[i] = { ...next[i], [field]: value };
    setJummah(next);
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <Clock className="h-5 w-5" style={{ color: ICH.primary }} />
        <h2 style={{ fontFamily: "Cormorant Garamond,serif", fontSize: 24, fontWeight: 600 }}>Jamaat Times</h2>
      </div>
      <p style={{ fontSize: 13, color: ICH.textMuted, marginBottom: 20 }}>
        Set congregation (jamaat) times. Adhan times are calculated automatically from the sun&apos;s position.
      </p>

      <form onSubmit={handleSave} style={{ background: "#fff", border: `1px solid ${ICH.border}`, borderRadius: 8, padding: "32px 36px", display: "flex", flexDirection: "column", gap: 30 }}>
        <div>
          <h3 style={{ fontFamily: "Cormorant Garamond,serif", fontSize: 18, fontWeight: 600, color: ICH.primary, marginBottom: 16 }}>Daily Jamaat Times</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 16 }}>
            {PRAYER_KEYS.map((p) => (
              <div key={p}>
                <label style={{ ...labelStyle, textTransform: "capitalize" }}>{p}</label>
                <input type="time" value={times[p]} onChange={(e) => setTimes({ ...times, [p]: e.target.value })} style={inputStyle} />
              </div>
            ))}
          </div>
        </div>

        <div style={{ borderTop: `1px solid ${ICH.border}`, paddingTop: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ fontFamily: "Cormorant Garamond,serif", fontSize: 18, fontWeight: 600, color: ICH.primary }}>Jumuah Slots</h3>
            <button type="button" onClick={() => setJummah([...jummah, { khutbah: "", salah: "" }])} style={{ fontSize: 12, padding: "6px 14px", borderRadius: 4, border: `1px solid ${ICH.border}`, background: "#fff", cursor: "pointer", color: ICH.primary, fontFamily: "Inter,sans-serif", fontWeight: 600 }}>
              + Add Slot
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {jummah.map((slot, i) => (
              <div key={i} style={{ background: ICH.bgCard, border: `1px solid ${ICH.border}`, borderRadius: 6, padding: "20px 24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: ICH.primary, fontFamily: "Inter,sans-serif" }}>Jummah {i + 1}</span>
                  {jummah.length > 1 && (
                    <button type="button" onClick={() => setJummah(jummah.filter((_, j) => j !== i))} style={{ fontSize: 11, color: "#e53935", background: "none", border: "none", cursor: "pointer", fontFamily: "Inter,sans-serif" }}>Remove</button>
                  )}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 16 }}>
                  <div>
                    <label style={labelStyle}>Khutbah</label>
                    <input type="time" value={slot.khutbah} onChange={(e) => updateSlot(i, "khutbah", e.target.value)} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Salah</label>
                    <input type="time" value={slot.salah} onChange={(e) => updateSlot(i, "salah", e.target.value)} style={inputStyle} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <Btn type="submit" variant="primary" style={{ width: "fit-content" }}>
            {saved ? "✓ Saved!" : "Save Times"}
          </Btn>
          {saved && (
            <span style={{ fontSize: 13, color: "#2e7d32", fontFamily: "Inter,sans-serif" }}>
              Times updated — changes live on the site immediately.
            </span>
          )}
          {saveError && (
            <span style={{ fontSize: 13, color: "#c62828", fontFamily: "Inter,sans-serif", maxWidth: 400 }}>
              ⚠ {saveError}
            </span>
          )}
        </div>
      </form>
    </div>
  );
}

function BoardTab() {
  const [board, setBoard] = useState<BoardMember[]>([]);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", role: "" });

  useEffect(() => {
    fetch("/api/admin/board")
      .then(r => r.json())
      .then(d => setBoard(d.board || []));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const isEdit = !!editingId;
    try {
      const data = await saveRequest("/api/admin/board", isEdit ? "PUT" : "POST", { ...form, id: editingId });
      if (isEdit) {
        setBoard(prev => prev.map(b => b.id === editingId ? data.member : b));
      } else {
        setBoard(prev => [...prev, data.member]);
      }
      setForm({ name: "", role: "" });
      setEditingId(null);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save board member");
    }
  };

  const handleEdit = (b: BoardMember) => {
    setEditingId(b.id);
    setForm({ name: b.name, role: b.role });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm({ name: "", role: "" });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete board member?")) return;
    setError("");
    try {
      await saveRequest(`/api/admin/board?id=${id}`, "DELETE");
      setBoard(prev => prev.filter(b => b.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete board member");
    }
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <Users className="h-5 w-5" style={{ color: ICH.primary }} />
        <h2 style={{ fontFamily: "Cormorant Garamond,serif", fontSize: 24, fontWeight: 600 }}>Board Members</h2>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 32 }}>
        {/* Form */}
        <form onSubmit={handleSave} style={{ background: "#fff", border: `1px solid ${ICH.border}`, borderRadius: 8, padding: "32px 36px", display: "flex", flexDirection: "column", gap: 20, height: "fit-content" }}>
          <h3 style={{ fontFamily: "Cormorant Garamond,serif", fontSize: 18, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, color: ICH.primary }}>
            {editingId ? <Edit2 className="h-4 w-4" /> : <Plus className="h-4 w-4" />} {editingId ? "Edit Member" : "Add Member"}
          </h3>

          <div>
            <label style={labelStyle}>Name</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required style={inputStyle} placeholder="John Doe" />
          </div>

          <div>
            <label style={labelStyle}>Role</label>
            <input type="text" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} required style={inputStyle} placeholder="President" />
          </div>

          <ErrorNote msg={error} />

          <div style={{ display: "flex", gap: 12 }}>
            <Btn type="submit" variant="primary" style={{ width: "fit-content" }}>
              {saved ? "Saved!" : (editingId ? "Update Member" : "Save Member")}
            </Btn>
            {editingId && (
              <Btn variant="outline" onClick={cancelEdit} style={{ width: "fit-content" }}>
                Cancel Edit
              </Btn>
            )}
          </div>
        </form>

        {/* List */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <h3 style={{ fontFamily: "Inter,sans-serif", fontSize: 13, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: ICH.textMuted, marginBottom: 8 }}>
            Current Board
          </h3>
          {board.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", color: ICH.textMuted, border: `1px dashed ${ICH.border}`, borderRadius: 8 }}>
              No board members
            </div>
          ) : board.map(b => (
            <div key={b.id} style={{ background: "#fff", border: `1px solid ${ICH.border}`, borderRadius: 6, padding: "16px 20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                <div>
                  <h4 style={{ fontFamily: "Cormorant Garamond,serif", fontSize: 18, fontWeight: 600, color: ICH.text, marginBottom: 4 }}>
                    {b.name}
                  </h4>
                  <p style={{ fontSize: 13, color: ICH.primary, fontWeight: 600 }}>{b.role}</p>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="button" onClick={() => handleEdit(b)} style={{ background: "none", border: "none", color: ICH.primary, cursor: "pointer", padding: 4 }}>
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => handleDelete(b.id)} style={{ background: "none", border: "none", color: "#e53935", cursor: "pointer", padding: 4 }}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ResourcesTab() {
  const [resources, setResources] = useState<{ restaurants: string | null; meatSupply: string | null }>({ restaurants: "", meatSupply: "" });
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/admin/resources?fresh=1")
      .then(r => r.json())
      .then(d => setResources(d.resources || { restaurants: "", meatSupply: "" }));
  }, []);

  const handleSave = async (type: "restaurants" | "meatSupply") => {
    setSaving(type);
    setMessage("");

    try {
      const res = await fetch("/api/admin/resources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [type]: resources[type] }),
      });
      const data = await res.json();
      if (res.ok) {
        setResources(data.resources);
        setMessage(`${type === "restaurants" ? "Restaurants" : "Meat Supply"} updated successfully!`);
      } else {
        setMessage(`Error: ${data.error}`);
      }
    } catch (err) {
      setMessage(`Error: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setSaving(null);
      setTimeout(() => setMessage(""), 4000);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <span style={{ fontSize: 24 }}>🍽️</span>
        <h2 style={{ fontFamily: "Cormorant Garamond,serif", fontSize: 24, fontWeight: 600 }}>Halal Resources</h2>
      </div>
      <p style={{ fontSize: 13, color: ICH.textMuted, marginBottom: 20 }}>
        Manage text content for Halal Restaurants and Meat Supply lists.
      </p>

      {message && (
        <div style={{ marginBottom: 16, padding: "10px 14px", background: "#e8f5e9", color: "#2e7d32", borderRadius: 6, fontSize: 13, border: "1px solid #c8e6c9" }}>
          {message}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 32 }}>
        
        {/* Restaurants Form */}
        <div style={{ background: "#fff", border: `1px solid ${ICH.border}`, borderRadius: 8, padding: "32px 36px", display: "flex", flexDirection: "column", gap: 20 }}>
          <h3 style={{ fontFamily: "Cormorant Garamond,serif", fontSize: 18, fontWeight: 600, color: ICH.primary }}>
            Halal Restaurants
          </h3>
          
          <div>
            <label style={labelStyle}>Content</label>
            <textarea 
              rows={8}
              value={resources.restaurants || ""}
              onChange={(e) => setResources({ ...resources, restaurants: e.target.value })}
              style={{ ...inputStyle, resize: "vertical" }}
              placeholder="List local restaurants here..."
              disabled={saving === "restaurants"}
            />
          </div>
          
          <Btn 
            onClick={() => handleSave("restaurants")} 
            variant="primary" 
            style={{ width: "fit-content" }}
            disabled={saving === "restaurants"}
          >
            {saving === "restaurants" ? "Saving..." : "Save Restaurants"}
          </Btn>
        </div>

        {/* Meat Supply Form */}
        <div style={{ background: "#fff", border: `1px solid ${ICH.border}`, borderRadius: 8, padding: "32px 36px", display: "flex", flexDirection: "column", gap: 20 }}>
          <h3 style={{ fontFamily: "Cormorant Garamond,serif", fontSize: 18, fontWeight: 600, color: ICH.primary }}>
            Halal Meat Supply
          </h3>
          
          <div>
            <label style={labelStyle}>Content</label>
            <textarea 
              rows={8}
              value={resources.meatSupply || ""}
              onChange={(e) => setResources({ ...resources, meatSupply: e.target.value })}
              style={{ ...inputStyle, resize: "vertical" }}
              placeholder="List meat supply sources here..."
              disabled={saving === "meatSupply"}
            />
          </div>
          
          <Btn 
            onClick={() => handleSave("meatSupply")} 
            variant="primary" 
            style={{ width: "fit-content" }}
            disabled={saving === "meatSupply"}
          >
            {saving === "meatSupply" ? "Saving..." : "Save Meat Supply"}
          </Btn>
        </div>

      </div>
    </div>
  );
}

function ImpactTab() {
  const [impact, setImpact] = useState<ImpactItem[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [count, setCount] = useState("");
  const [image, setImage] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetch("/api/admin/impact")
      .then(r => r.json())
      .then(d => setImpact(d.impact || []));
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.url) {
        setImage(data.url);
      } else {
        alert("Upload failed: " + (data.error || "Unknown error"));
      }
    } catch {
      alert("Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const isEdit = !!editingId;
    try {
      const data = await saveRequest("/api/admin/impact", isEdit ? "PUT" : "POST",
        isEdit ? { id: editingId, title, description, count, image } : { title, description, count, image });
      if (isEdit) {
        setImpact(prev => prev.map(item => item.id === editingId ? data.item : item));
      } else {
        setImpact(prev => [data.item, ...prev]);
      }
      setTitle(""); setDescription(""); setCount(""); setImage(""); setEditingId(null);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save impact item");
    }
  };

  const handleEdit = (item: ImpactItem) => {
    setEditingId(item.id);
    setTitle(item.title);
    setDescription(item.description);
    setCount(item.count || "");
    setImage(item.image || "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setTitle(""); setDescription(""); setCount(""); setImage("");
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete impact item?")) return;
    setError("");
    try {
      await saveRequest(`/api/admin/impact?id=${id}`, "DELETE");
      setImpact(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete impact item");
    }
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <span style={{ fontSize: 24 }}>📈</span>
        <h2 style={{ fontFamily: "Cormorant Garamond,serif", fontSize: 24, fontWeight: 600 }}>Our Impact Stories</h2>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 32 }}>
        {/* Form */}
        <form onSubmit={handleSave} style={{ background: "#fff", border: `1px solid ${ICH.border}`, borderRadius: 8, padding: "32px 36px", display: "flex", flexDirection: "column", gap: 20, height: "fit-content" }}>
          <h3 style={{ fontFamily: "Cormorant Garamond,serif", fontSize: 18, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, color: ICH.primary }}>
            {editingId ? <Edit2 className="h-4 w-4" /> : <Plus className="h-4 w-4" />} {editingId ? "Edit Impact Item" : "New Impact Item"}
          </h3>
          
          <div>
            <label style={labelStyle}>Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              style={inputStyle}
              placeholder="e.g. Sunday Islamic School"
            />
          </div>
          
          <div>
            <label style={labelStyle}>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={4}
              style={{ ...inputStyle, resize: "vertical" }}
              placeholder="Describe the impact or story..."
            />
          </div>

          <div>
            <label style={labelStyle}>Metric / Stat (Optional)</label>
            <input
              type="text"
              value={count}
              onChange={(e) => setCount(e.target.value)}
              style={inputStyle}
              placeholder="e.g. 100+ or 75%"
            />
          </div>

          <div>
            <label style={labelStyle}>Image (Optional)</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <input
                type="text"
                value={image}
                onChange={(e) => setImage(e.target.value)}
                style={inputStyle}
                placeholder="Image path or upload below"
              />
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  style={{ fontSize: 13, fontFamily: "Inter,sans-serif" }}
                />
                {uploading && <span style={{ fontSize: 12, color: ICH.textMuted }}>Uploading...</span>}
              </div>
              {image && (
                <div style={{ width: 120, height: 80, border: `1px solid ${ICH.border}`, borderRadius: 4, overflow: "hidden", position: "relative" }}>
                  <img src={image} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
              )}
            </div>
          </div>

          <ErrorNote msg={error} />

          <div style={{ display: "flex", gap: 12 }}>
            <Btn type="submit" variant="primary" style={{ width: "fit-content" }} disabled={uploading}>
              {saved ? "Saved!" : (editingId ? "Update Item" : "Save Item")}
            </Btn>
            {editingId && (
              <Btn variant="outline" onClick={cancelEdit} style={{ width: "fit-content" }}>
                Cancel Edit
              </Btn>
            )}
          </div>
        </form>

        {/* List */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <h3 style={{ fontFamily: "Inter,sans-serif", fontSize: 13, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: ICH.textMuted, marginBottom: 8 }}>
            Current Impact Items
          </h3>
          {impact.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center", color: ICH.textMuted, border: `1px dashed ${ICH.border}`, borderRadius: 8 }}>
              No impact items
            </div>
          ) : impact.map(item => (
            <div key={item.id} style={{ background: "#fff", border: `1px solid ${ICH.border}`, borderRadius: 6, padding: "16px 20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  {item.image && (
                    <div style={{ width: 60, height: 60, borderRadius: 4, overflow: "hidden", flexShrink: 0, border: `1px solid ${ICH.border}` }}>
                      <img src={item.image} alt={item.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    </div>
                  )}
                  <div>
                    <h4 style={{ fontFamily: "Cormorant Garamond,serif", fontSize: 18, fontWeight: 600, color: ICH.text, marginBottom: 2 }}>
                      {item.title}
                    </h4>
                    {item.count && <div style={{ fontSize: 14, fontWeight: 700, color: ICH.gold, marginBottom: 4 }}>{item.count}</div>}
                    <p style={{ fontSize: 13, color: ICH.textMuted, lineHeight: 1.6 }}>{item.description}</p>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <button type="button" onClick={() => handleEdit(item)} style={{ background: "none", border: "none", color: ICH.primary, cursor: "pointer", padding: 4 }}>
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => handleDelete(item.id)} style={{ background: "none", border: "none", color: "#e53935", cursor: "pointer", padding: 4 }}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Programs / Initiatives Tab
function ProgramsTab() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [icon, setIcon] = useState("📌");
  const [title, setTitle] = useState("");
  const [schedule, setSchedule] = useState("");
  const [note, setNote] = useState("");
  const [description, setDescription] = useState("");
  const [active, setActive] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const load = () => fetch("/api/admin/programs").then(r => r.json()).then(d => setPrograms(d.programs || []));
  useEffect(() => { load(); }, []);

  const resetForm = () => { setIcon("📌"); setTitle(""); setSchedule(""); setNote(""); setDescription(""); setActive(true); setEditingId(null); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const payload = { icon, title, schedule, note, description, active };
    try {
      await saveRequest("/api/admin/programs", editingId ? "PUT" : "POST", editingId ? { id: editingId, ...payload } : payload);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      resetForm();
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save program");
    }
  };

  const handleEdit = (p: Program) => { setEditingId(p.id); setIcon(p.icon); setTitle(p.title); setSchedule(p.schedule); setNote(p.note); setDescription(p.description); setActive(p.active); };
  const handleDelete = async (id: string) => {
    setError("");
    try { await saveRequest(`/api/admin/programs?id=${id}`, "DELETE"); load(); }
    catch (err) { setError(err instanceof Error ? err.message : "Failed to delete program"); }
  };
  const handleToggleActive = async (p: Program) => {
    setError("");
    try { await saveRequest("/api/admin/programs", "PUT", { id: p.id, active: !p.active }); load(); }
    catch (err) { setError(err instanceof Error ? err.message : "Failed to update program"); }
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
        <BookOpen className="h-5 w-5" style={{ color: ICH.primary }} />
        <h2 style={{ fontFamily: "Cormorant Garamond,serif", fontSize: 26, fontWeight: 600 }}>Programs &amp; Initiatives</h2>
      </div>
      <p style={{ fontSize: 13, color: ICH.textMuted, marginBottom: 24 }}>These programs appear on the About page. Toggle visibility with the eye icon without deleting.</p>

      <Card style={{ marginBottom: 28 }}>
        <h3 style={{ fontFamily: "Cormorant Garamond,serif", fontSize: 19, fontWeight: 600, marginBottom: 20 }}>
          {editingId ? "Edit Program" : "Add New Program"}
        </h3>
        <form onSubmit={handleSubmit}>
          <div style={{ display: "grid", gridTemplateColumns: "80px 1fr", gap: 12, marginBottom: 14 }}>
            <div>
              <label style={labelStyle}>Icon</label>
              <input style={inputStyle} value={icon} onChange={e => setIcon(e.target.value)} placeholder="📌" />
            </div>
            <div>
              <label style={labelStyle}>Title *</label>
              <input style={inputStyle} value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Jumuah Prayers" required />
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Schedule</label>
            <input style={inputStyle} value={schedule} onChange={e => setSchedule(e.target.value)} placeholder="e.g. Fridays (Recurring every week)" />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Description *</label>
            <textarea style={{ ...inputStyle, minHeight: 72, resize: "vertical" } as React.CSSProperties} value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief description of the program" required />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Note (optional star label)</label>
            <input style={inputStyle} value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Currently off for summer" />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} style={{ width: 16, height: 16 }} />
              <span style={{ color: ICH.text }}>Active (visible on About page)</span>
            </label>
          </div>
          <div style={{ marginBottom: error ? 14 : 0 }}><ErrorNote msg={error} /></div>
          <div style={{ display: "flex", gap: 10 }}>
            <Btn variant="gold" type="submit">{editingId ? "Update Program" : "Add Program"}</Btn>
            {editingId && <Btn variant="outline" type="button" onClick={resetForm}>Cancel</Btn>}
            {saved && <span style={{ fontSize: 13, color: "#2e7d32", fontWeight: 600 }}>✓ Saved!</span>}
          </div>
        </form>
      </Card>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {programs.map((p) => (
          <div key={p.id} style={{ border: `1px solid ${ICH.border}`, borderRadius: 6, padding: "16px 20px", background: "#fff", display: "flex", gap: 12, alignItems: "flex-start", justifyContent: "space-between", opacity: p.active ? 1 : 0.55 }}>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flex: 1 }}>
              <span style={{ fontSize: 24 }}>{p.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 2 }}>
                  <h4 style={{ fontFamily: "Cormorant Garamond,serif", fontSize: 18, fontWeight: 600 }}>{p.title}</h4>
                  {!p.active && <span style={{ fontSize: 10, color: ICH.textMuted, fontWeight: 700, background: ICH.bgCard, padding: "2px 8px", borderRadius: 10 }}>HIDDEN</span>}
                </div>
                {p.schedule && <div style={{ fontSize: 12, color: ICH.primary, fontWeight: 600 }}>{p.schedule}</div>}
                <p style={{ fontSize: 13, color: ICH.textMuted, marginTop: 4 }}>{p.description}</p>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              <button type="button" onClick={() => handleToggleActive(p)} title={p.active ? "Hide" : "Show"} style={{ background: "none", border: "none", color: ICH.textMuted, cursor: "pointer", padding: 4, fontSize: 14 }}>
                {p.active ? "👁" : "🙈"}
              </button>
              <button type="button" onClick={() => handleEdit(p)} style={{ background: "none", border: "none", color: ICH.primary, cursor: "pointer", padding: 4 }}>
                <Edit2 className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => handleDelete(p.id)} style={{ background: "none", border: "none", color: "#e53935", cursor: "pointer", padding: 4 }}>
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
        {programs.length === 0 && <p style={{ color: ICH.textMuted, fontSize: 13 }}>No programs yet. Add one above.</p>}
      </div>

      {/* Resource Links Section */}
      <ResourceLinksSection />
    </div>
  );
}

// Resource Links Section (embedded in Programs tab)
function ResourceLinksSection() {
  const [links, setLinks] = useState<ResourceLink[]>([]);
  const [category, setCategory] = useState("");
  const [categoryIcon, setCategoryIcon] = useState("🔗");
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [order, setOrder] = useState(99);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const load = () => fetch("/api/admin/resource-links?fresh=1").then(r => r.json()).then(d => setLinks(d.links || []));
  useEffect(() => { load(); }, []);

  const resetForm = () => { setCategory(""); setCategoryIcon("🔗"); setLabel(""); setUrl(""); setOrder(99); setEditingId(null); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const payload = { category, categoryIcon, label, url, order };
    try {
      await saveRequest("/api/admin/resource-links", editingId ? "PUT" : "POST", editingId ? { id: editingId, ...payload } : payload);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      resetForm();
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save link");
    }
  };

  const handleEdit = (l: ResourceLink) => { setEditingId(l.id); setCategory(l.category); setCategoryIcon(l.categoryIcon); setLabel(l.label); setUrl(l.url); setOrder(l.order); };
  const handleDelete = async (id: string) => {
    setError("");
    try { await saveRequest(`/api/admin/resource-links?id=${id}`, "DELETE"); load(); }
    catch (err) { setError(err instanceof Error ? err.message : "Failed to delete link"); }
  };

  const grouped = links.reduce<Record<string, ResourceLink[]>>((acc, l) => {
    if (!acc[l.category]) acc[l.category] = [];
    acc[l.category].push(l);
    return acc;
  }, {});

  return (
    <div style={{ marginTop: 40, paddingTop: 36, borderTop: `2px solid ${ICH.border}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <Link2 className="h-5 w-5" style={{ color: ICH.primary }} />
        <h3 style={{ fontFamily: "Cormorant Garamond,serif", fontSize: 22, fontWeight: 600 }}>Islamic Resource Links</h3>
      </div>
      <p style={{ fontSize: 13, color: ICH.textMuted, marginBottom: 24 }}>Manage the links shown on the Resources page. Group by category using consistent category names.</p>

      <Card style={{ marginBottom: 24 }}>
        <h4 style={{ fontFamily: "Cormorant Garamond,serif", fontSize: 17, fontWeight: 600, marginBottom: 16 }}>{editingId ? "Edit Link" : "Add New Link"}</h4>
        <form onSubmit={handleSubmit}>
          <div style={{ display: "grid", gridTemplateColumns: "60px 1fr", gap: 10, marginBottom: 12 }}>
            <div>
              <label style={labelStyle}>Icon</label>
              <input style={inputStyle} value={categoryIcon} onChange={e => setCategoryIcon(e.target.value)} placeholder="🔗" />
            </div>
            <div>
              <label style={labelStyle}>Category *</label>
              <input style={inputStyle} value={category} onChange={e => setCategory(e.target.value)} placeholder="e.g. Quran & Hadith" required list="cats-dl" />
              <datalist id="cats-dl">{[...new Set(links.map(l => l.category))].map(c => <option key={c} value={c} />)}</datalist>
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Link Label *</label>
            <input style={inputStyle} value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. Quran.com — Quran with Translation" required />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 80px", gap: 10, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>URL *</label>
              <input style={inputStyle} value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." required type="url" />
            </div>
            <div>
              <label style={labelStyle}>Sort Order</label>
              <input style={inputStyle} value={order} onChange={e => setOrder(Number(e.target.value))} type="number" min={1} max={99} />
            </div>
          </div>
          <div style={{ marginBottom: error ? 14 : 0 }}><ErrorNote msg={error} /></div>
          <div style={{ display: "flex", gap: 10 }}>
            <Btn variant="gold" type="submit" style={{ fontSize: 13 }}>{editingId ? "Update" : "Add Link"}</Btn>
            {editingId && <Btn variant="outline" type="button" onClick={resetForm} style={{ fontSize: 13 }}>Cancel</Btn>}
            {saved && <span style={{ fontSize: 13, color: "#2e7d32", fontWeight: 600 }}>✓ Saved!</span>}
          </div>
        </form>
      </Card>

      {Object.entries(grouped).map(([cat, catLinks]) => (
        <div key={cat} style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: ICH.primary, marginBottom: 8 }}>{cat}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {(catLinks as ResourceLink[]).sort((a, b) => a.order - b.order).map((l) => (
              <div key={l.id} style={{ border: `1px solid ${ICH.border}`, borderRadius: 5, padding: "10px 14px", background: "#fff", display: "flex", gap: 10, alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: ICH.text }}>{l.label}</div>
                  <div style={{ fontSize: 11, color: ICH.textMuted }}>{l.url}</div>
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button type="button" onClick={() => handleEdit(l)} style={{ background: "none", border: "none", color: ICH.primary, cursor: "pointer", padding: 3 }}>
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" onClick={() => handleDelete(l.id)} style={{ background: "none", border: "none", color: "#e53935", cursor: "pointer", padding: 3 }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      {links.length === 0 && <p style={{ color: ICH.textMuted, fontSize: 13 }}>No resource links yet. Add one above.</p>}
    </div>
  );
}

// Site Settings Tab
// NOTE: Field is defined at module scope (not inside SettingsTab). Defining a
// component inside another component's render creates a brand-new component type
// on every keystroke, which forces React to unmount/remount the input and drop
// focus — making the settings form nearly impossible to type into.
function SettingField({
  label: lbl,
  name,
  value,
  onChange,
  placeholder,
  textarea,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (name: string, value: string) => void;
  placeholder?: string;
  textarea?: boolean;
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={labelStyle}>{lbl}</label>
      {textarea ? (
        <textarea
          style={{ ...inputStyle, minHeight: 90, resize: "vertical" } as React.CSSProperties}
          value={value ?? ""}
          onChange={e => onChange(name, e.target.value)}
          placeholder={placeholder}
        />
      ) : (
        <input
          style={inputStyle}
          value={value ?? ""}
          onChange={e => onChange(name, e.target.value)}
          placeholder={placeholder}
        />
      )}
    </div>
  );
}

function SettingsTab() {
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings?fresh=1")
      .then(r => r.json())
      .then(d => setSettings(d.settings || null));
  }, []);

  const set = (key: string, value: string) =>
    setSettings((s) => ({ ...(s ?? ({} as SiteSettings)), [key]: value } as SiteSettings));

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      await saveRequest("/api/admin/settings", "POST", settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (!settings) return <div style={{ color: ICH.textMuted, padding: 24 }}>Loading settings…</div>;

  const Field = (props: { label: string; name: string; placeholder?: string; textarea?: boolean }) => (
    <SettingField {...props} value={String(settings[props.name as keyof SiteSettings] ?? "")} onChange={set} />
  );

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
        <Settings className="h-5 w-5" style={{ color: ICH.primary }} />
        <h2 style={{ fontFamily: "Cormorant Garamond,serif", fontSize: 26, fontWeight: 600 }}>Site Settings</h2>
      </div>
      <p style={{ fontSize: 13, color: ICH.textMuted, marginBottom: 28 }}>Changes here update live across the website. Click &ldquo;Save All Settings&rdquo; when done.</p>

      {/* Contact Info */}
      <Card style={{ marginBottom: 24 }}>
        <h3 style={{ fontFamily: "Cormorant Garamond,serif", fontSize: 19, fontWeight: 600, marginBottom: 20 }}>Contact &amp; Location</h3>
        {Field({ label: "Physical Address", name: "address", placeholder: "211 N 25th Avenue, Hattiesburg, MS 39401" })}
        {Field({ label: "Google Maps URL", name: "addressUrl", placeholder: "https://www.google.com/maps/search/?api=1&query=..." })}
        {Field({ label: "Phone Number (optional)", name: "phone", placeholder: "+1 (601) 555-0000" })}
        {Field({ label: "Contact Email", name: "email", placeholder: "ichattiesburg@gmail.com" })}
        {Field({ label: 'Jumuah Location Label (shown on home page "Jumuah" card)', name: "jumuahLocation", placeholder: "211 N 25th Ave" })}
      </Card>

      {/* Branding & Socials */}
      <Card style={{ marginBottom: 24 }}>
        <h3 style={{ fontFamily: "Cormorant Garamond,serif", fontSize: 19, fontWeight: 600, marginBottom: 20 }}>Masjid Branding &amp; Socials</h3>
        {Field({ label: "Masjid Short Name / Acronym", name: "masjidShortName", placeholder: "ICH" })}
        {Field({ label: "Footer Short Description", name: "footerDescription", placeholder: "Serving the Muslim community with prayer, education, and community programs." })}
        {Field({ label: "Facebook Page URL", name: "facebookUrl", placeholder: "https://www.facebook.com/..." })}
        {Field({ label: "Instagram Profile URL", name: "instagramUrl", placeholder: "https://www.instagram.com/..." })}
      </Card>

      {/* Mission */}
      <Card style={{ marginBottom: 24 }}>
        <h3 style={{ fontFamily: "Cormorant Garamond,serif", fontSize: 19, fontWeight: 600, marginBottom: 20 }}>Mission Statement</h3>
        {Field({ label: "Mission Text (shown on About page)", name: "missionText", textarea: true, placeholder: "The Islamic Center of Hattiesburg stands as a beacon of faith…" })}
      </Card>

      {/* Oak Grove */}
      <Card style={{ marginBottom: 24 }}>
        <h3 style={{ fontFamily: "Cormorant Garamond,serif", fontSize: 19, fontWeight: 600, marginBottom: 20 }}>Oak Grove / New Masjid Project</h3>
        {Field({ label: "Project Title", name: "oakGroveTitle", placeholder: "New Masjid Project" })}
        {Field({ label: "Project Description", name: "oakGroveDescription", textarea: true, placeholder: "As a growing community our current facility…" })}
        {Field({ label: "Fundraiser URL (LaunchGood or other)", name: "oakGroveUrl", placeholder: "https://www.launchgood.com/v4/campaign/..." })}
      </Card>

      {/* Donation */}
      <Card style={{ marginBottom: 24 }}>
        <h3 style={{ fontFamily: "Cormorant Garamond,serif", fontSize: 19, fontWeight: 600, marginBottom: 8 }}>Donation Page (Zeffy)</h3>
        <p style={{ fontSize: 13, color: ICH.textMuted, marginBottom: 16 }}>Find these UUIDs in your Zeffy dashboard URLs: <code style={{ background: "#f3f4f6", padding: "1px 5px", borderRadius: 3, fontSize: 11 }}>zeffy.com/donation-form/&#123;UUID&#125;</code></p>
        {Field({ label: "One-Time Donation Form UUID", name: "zeffyOneTimeId", placeholder: "ba0c6cb0-70a2-41db-95c6-9ff75a30b42c" })}
        {Field({ label: "Monthly / Recurring Donation Form UUID", name: "zeffyMonthlyId", placeholder: "e4338258-eef5-489e-ae60-75017200e9bc" })}
      </Card>

      {/* Prayer Display */}
      <Card style={{ marginBottom: 28 }}>
        <h3 style={{ fontFamily: "Cormorant Garamond,serif", fontSize: 19, fontWeight: 600, marginBottom: 8 }}>Prayer Time Display</h3>
        <p style={{ fontSize: 13, color: ICH.textMuted, marginBottom: 16 }}>Controls how Maghrib iqama appears on the home page prayer strip. Typical values: &ldquo;After Adhan&rdquo; or a time like &ldquo;7:45 PM&rdquo;.</p>
        {Field({ label: "Maghrib Iqama Display", name: "maghribDisplay", placeholder: "After Adhan" })}
      </Card>

      <div style={{ marginBottom: error ? 16 : 0 }}><ErrorNote msg={error} /></div>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <Btn variant="gold" onClick={handleSave}>
          {saving ? "Saving…" : "Save All Settings"}
        </Btn>
        {saved && <span style={{ fontSize: 13, color: "#2e7d32", fontWeight: 600 }}>✓ All settings saved!</span>}
      </div>
    </div>
  );
}
