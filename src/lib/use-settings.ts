"use client";

import { useEffect, useState } from "react";
import { createReadThroughCache } from "./read-through-cache";
import type { SiteSettings } from "./store";

const cache = createReadThroughCache(async (): Promise<SiteSettings> => {
  const response = await fetch("/api/admin/settings");
  if (!response.ok) throw new Error("Failed to load settings");
  const data = await response.json();
  if (!data.settings) throw new Error("Missing settings");
  return data.settings;
}, 60_000);

/**
 * Shared client hook that loads site settings from the public settings API.
 * Centralizes the fetch so components (footer, contact, …) don't each
 * re-implement it, and hands back a typed object instead of `any`.
 *
 * Returns `null` until the first response arrives; callers should fall back
 * to their own defaults while it is null.
 */
export function useSettings(): SiteSettings | null {
  const [settings, setSettings] = useState<SiteSettings | null>(null);

  useEffect(() => {
    let active = true;
    cache.get()
      .then((value) => { if (active) setSettings(value); })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  return settings;
}
