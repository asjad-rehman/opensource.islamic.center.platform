"use client";

import { useEffect, useState } from "react";
import { zonedParts } from "./time";
import { masjid } from "@/config/masjid";

function parseHM(timeStr: string): { h: number; m: number } {
  const clean = timeStr.replace(/\s?(AM|PM)/i, "").trim();
  const [h, m] = clean.split(":").map(Number);
  const isPM = /PM/i.test(timeStr);
  const isAM = /AM/i.test(timeStr);
  let hour = h || 0;
  if (isPM && hour < 12) hour += 12;
  if (isAM && hour === 12) hour = 0;
  return { h: hour, m: m || 0 };
}

export function usePrayerCountdown(prayers: { name: string; display: string }[]) {
  const [state, setState] = useState({ countdown: "--:--:--", nextName: "", nextIdx: -1, curIdx: -1 });

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const zp = zonedParts(now, masjid.timezone);
      const nowMs = (zp.hour * 3600 + zp.minute * 60 + zp.second) * 1000;

      let curIdx = -1;
      for (let i = 0; i < prayers.length; i++) {
        const { h, m } = parseHM(prayers[i].display);
        if ((h * 3600 + m * 60) * 1000 <= nowMs) curIdx = i;
      }

      const nextIdx = curIdx === prayers.length - 1 ? 0 : curIdx + 1;
      const next = prayers[nextIdx];
      const { h, m } = parseHM(next.display);
      const targetMs = (h * 3600 + m * 60) * 1000;

      let diff = targetMs - nowMs;
      if (diff <= 0) diff += 24 * 3600 * 1000;

      const hh = Math.floor(diff / 3600000);
      const mm = Math.floor((diff % 3600000) / 60000);
      const ss = Math.floor((diff % 60000) / 1000);
      const pad = (n: number) => String(n).padStart(2, "0");

      setState({ countdown: `${pad(hh)}:${pad(mm)}:${pad(ss)}`, nextName: next.name, nextIdx, curIdx });
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [prayers]);

  return state;
}

