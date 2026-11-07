import { getJamaatTimes, type JamaatTimes } from "@/lib/jamaat";
import { calculatePrayerTimes } from "@/lib/prayer-calculation";

export interface PrayerTimes {
  fajr: string;
  sunrise: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
}

export interface JumuahSchedule {
  khutbah: string;
  salah: string;
  speaker?: string;
  topic?: string;
}

export interface MasjidTimes {
  prayerTimes: PrayerTimes;
  jamaatTimes: JamaatTimes;
  jumuah: JumuahSchedule;
  lastUpdated: string;
}

export async function fetchPrayerTimes(): Promise<MasjidTimes> {
  const now = new Date();

  const prayerTimes = calculatePrayerTimes(now);
  const jamaat = await getJamaatTimes();

  const j1 = jamaat.jummah[0] ?? { khutbah: "12:45", salah: "13:15" };
  const j2 = jamaat.jummah[1];
  const jumuah: JumuahSchedule = {
    khutbah: j1.khutbah,
    salah:   j2 ? j2.salah : j1.salah,
    speaker: "Imam",
    topic:   "TBA",
  };

  return { prayerTimes, jamaatTimes: jamaat, jumuah, lastUpdated: now.toISOString() };
}
