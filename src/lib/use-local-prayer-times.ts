import { useEffect, useState } from "react";
import { masjid } from "@/config/masjid";
import { calculatePrayerTimes } from "@/lib/prayer-calculation";
import type { PrayerTimes } from "@/lib/prayer-times";

const calendar = new Intl.DateTimeFormat("en-US", { timeZone: masjid.timezone });

export function useLocalPrayerTimes(initial: PrayerTimes) {
  const [times, setTimes] = useState(initial);

  useEffect(() => {
    let currentDay = "";
    function refresh() {
      const now = new Date();
      const day = calendar.format(now);
      if (day === currentDay) return;
      currentDay = day;
      setTimes(calculatePrayerTimes(now));
    }

    refresh();
    const timer = window.setInterval(refresh, 1000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  return times;
}
