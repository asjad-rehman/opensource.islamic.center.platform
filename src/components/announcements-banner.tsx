"use client";

import { useState, useEffect } from "react";
import { X, Bell } from "lucide-react";
import type { Announcement } from "@/lib/store";

export default function AnnouncementsBanner() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/announcements")
      .then((r) => r.json())
      .then((data) => setAnnouncements(data.announcements || []))
      .catch(() => {});
  }, []);

  const visible = announcements.filter(
    (a) =>
      !dismissed.has(a.id) &&
      (!a.expiresAt || new Date(a.expiresAt) > new Date())
  );

  if (visible.length === 0) return null;

  return (
    <div className="bg-primary/5 border-b border-primary/20">
      {visible.slice(0, 2).map((a) => (
        <div
          key={a.id}
          className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-start gap-3 ${
            a.priority === "urgent" ? "text-red-700 dark:text-red-400" : ""
          }`}
        >
          <Bell className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
          <div className="flex-1 min-w-0">
            <span className="font-semibold text-sm">{a.title}: </span>
            <span className="text-sm text-muted-foreground">{a.body}</span>
          </div>
          <button
            onClick={() => setDismissed((s) => new Set([...s, a.id]))}
            className="shrink-0 text-muted-foreground hover:text-foreground"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
